// ============================================================================
// LINEAR — push a feedback ticket to Linear as a tracked issue.
// ============================================================================
// The feedback inbox (convex/feedback.ts) is the support side: who submitted it,
// who to reply to, and its triage lifecycle. Linear is where a bug/feature is
// actually WORKED. "Export to Linear" (owner action) creates a real Linear issue
// in the configured project — carrying the note, the page context, and the
// submitter's photo/screenshot uploaded as a real Linear asset — then links the
// ticket to that card and flips it to `pending`. See ADR 0019.
//
// Config is injected, never hardcoded to a person, so this module can travel
// (open-source / embed elsewhere): the API key and the destination team/project
// come from Convex env. The known LifeGuide destination is a fallback default so
// it works out of the box in this repo.
//   LINEAR_API_KEY     (required)  a Linear personal API key
//   LINEAR_TEAM_ID     (optional)  target team; defaults to the LifeGuide team
//   LINEAR_PROJECT_ID  (optional)  target project; defaults to the LifeGuide project
// ============================================================================

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

const LINEAR_API = "https://api.linear.app/graphql";
// LifeGuide's private Linear home (Personal team → LifeGuide project). Overridable
// by env so the module is not bound to one workspace.
const DEFAULT_TEAM_ID = "4b7ed3d5-b167-44cd-825c-becca23ac5c4";
const DEFAULT_PROJECT_ID = "e0af6c94-da8e-4ac3-8fd7-415f9c9cd2f8";

const TYPE_LABEL: Record<string, string> = { bug: "Bug", feature: "Feature", other: "Other" };

// Call the Linear GraphQL API with the personal API key. Throws with the first
// GraphQL error message (Convex redacts thrown text to "Server Error" in prod, but
// the message is still useful in dev + logs).
async function linearGraphQL<T>(
  apiKey: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!res.ok || json.errors?.length) {
    throw new Error(`Linear API error: ${json.errors?.[0]?.message ?? res.status}`);
  }
  if (!json.data) throw new Error("Linear API returned no data");
  return json.data;
}

// Upload one blob to Linear and return its public asset URL, embeddable in
// markdown. Linear's flow: fileUpload() hands back a signed PUT url + headers;
// we PUT the bytes, then the assetUrl is the permanent, Linear-hosted address.
async function uploadToLinear(
  apiKey: string,
  blob: Blob,
  filename: string,
  contentType: string,
): Promise<string | null> {
  try {
    const data = await linearGraphQL<{
      fileUpload: {
        success: boolean;
        uploadFile: { uploadUrl: string; assetUrl: string; headers: { key: string; value: string }[] };
      };
    }>(
      apiKey,
      `mutation fileUpload($contentType: String!, $filename: String!, $size: Int!) {
        fileUpload(contentType: $contentType, filename: $filename, size: $size) {
          success
          uploadFile { uploadUrl assetUrl headers { key value } }
        }
      }`,
      { contentType, filename, size: blob.size },
    );
    const up = data.fileUpload?.uploadFile;
    if (!data.fileUpload?.success || !up) return null;
    const headers: Record<string, string> = { "Content-Type": contentType };
    for (const h of up.headers) headers[h.key] = h.value;
    const put = await fetch(up.uploadUrl, { method: "PUT", headers, body: blob });
    if (!put.ok) return null;
    return up.assetUrl;
  } catch {
    return null; // an image that won't upload never blocks the issue itself
  }
}

// Compose the issue body: the note, then the captured page context, then the
// uploaded images inline. Written as Linear-flavored markdown.
function buildDescription(
  row: {
    type: string;
    text: string;
    route: string;
    view: string;
    title: string;
    viewport: { w: number; h: number };
    userAgent: string;
    errors: { message: string }[];
    createdAt: number;
    submitterLabel: string;
  },
  assetUrls: string[],
): string {
  const lines: string[] = [];
  lines.push(row.text.trim());
  lines.push("");
  if (assetUrls.length) {
    for (const url of assetUrls) lines.push(`![screenshot](${url})`);
    lines.push("");
  }
  lines.push("---");
  lines.push("**Captured context**");
  lines.push(`- Type as tagged: ${TYPE_LABEL[row.type] ?? row.type}`);
  lines.push(`- From: ${row.submitterLabel}`);
  lines.push(`- Route: \`${row.route}\` · view: ${row.view}`);
  lines.push(`- Page: ${row.title}`);
  lines.push(`- Viewport: ${row.viewport.w}×${row.viewport.h}`);
  lines.push(`- Submitted: ${new Date(row.createdAt).toISOString()}`);
  lines.push(`- User agent: \`${row.userAgent}\``);
  if (row.errors.length) {
    lines.push("");
    lines.push(`**Recent errors (${row.errors.length})**`);
    lines.push("```");
    for (const e of row.errors) lines.push(e.message);
    lines.push("```");
  }
  return lines.join("\n");
}

// ── Export a feedback ticket to Linear ───────────────────────────────────────
// Owner-gated (or self, in dev): creates the issue with the photo attached, links
// the ticket to it, and moves the ticket to `pending`. Returns the created issue.
export const exportFeedback = action({
  args: {
    id: v.id("feedback"),
    title: v.string(),
    // Linear priority: 0 none, 1 urgent, 2 high, 3 medium, 4 low.
    priority: v.number(),
  },
  handler: async (
    ctx,
    { id, title, priority },
  ): Promise<{ issueId: string; identifier: string; url: string }> => {
    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) {
      throw new Error(
        "LINEAR_API_KEY is not set. Add a Linear personal API key to the Convex deployment (npx convex env set LINEAR_API_KEY …).",
      );
    }
    const teamId = process.env.LINEAR_TEAM_ID || DEFAULT_TEAM_ID;
    const projectId = process.env.LINEAR_PROJECT_ID || DEFAULT_PROJECT_ID;

    // Load the row (owner/self gated) with its storage ids + submitter label.
    const row = await ctx.runQuery(internal.feedback.getRowForExport, { id });
    if (row.linear) return row.linear; // already exported — idempotent, return the link

    // Upload the snapshot + any attached photos to Linear as real assets.
    const storageIds = [row.shotId, ...(row.imageIds ?? [])].filter(
      (x): x is NonNullable<typeof x> => Boolean(x),
    );
    const assetUrls: string[] = [];
    for (const sid of storageIds) {
      const blob = await ctx.storage.get(sid);
      if (!blob) continue;
      const url = await uploadToLinear(
        apiKey,
        blob,
        `feedback-${sid}.png`,
        blob.type || "image/png",
      );
      if (url) assetUrls.push(url);
    }

    const description = buildDescription(row, assetUrls);
    const cleanTitle = title.trim() || `${TYPE_LABEL[row.type] ?? "Feedback"}: ${row.text.slice(0, 60)}`;
    // Clamp priority into Linear's 0–4 range.
    const prio = Math.max(0, Math.min(4, Math.round(priority)));

    const created = await linearGraphQL<{
      issueCreate: { success: boolean; issue: { id: string; identifier: string; url: string } };
    }>(
      apiKey,
      `mutation issueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) { success issue { id identifier url } }
      }`,
      { input: { teamId, projectId, title: cleanTitle, description, priority: prio } },
    );
    if (!created.issueCreate?.success || !created.issueCreate.issue) {
      throw new Error("Linear did not create the issue");
    }
    const issue = created.issueCreate.issue;

    await ctx.runMutation(api.feedback.markExported, {
      id,
      issueId: issue.id,
      identifier: issue.identifier,
      url: issue.url,
    });
    return { issueId: issue.id, identifier: issue.identifier, url: issue.url };
  },
});
