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

import { action, internalAction, ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const LINEAR_API = "https://api.linear.app/graphql";
// LifeGuide's private Linear home (Personal team → LifeGuide project). Overridable
// by env so the module is not bound to one workspace.
const DEFAULT_TEAM_ID = "4b7ed3d5-b167-44cd-825c-becca23ac5c4";
const DEFAULT_PROJECT_ID = "e0af6c94-da8e-4ac3-8fd7-415f9c9cd2f8";

const TYPE_LABEL: Record<string, string> = { bug: "Bug", feature: "Feature", other: "Other" };

// The `agent:cody` label + Todo state used by the auto-forward path (see
// autoForwardFeedback below and ADR 0031) — fixed per the Cody pipeline's
// LifeGuide project setup, not env-overridable like team/project.
const AGENT_CODY_LABEL_ID = "1e31d2da-32df-444d-9ee8-b18f5e86cb41";
const TODO_STATE_ID = "566dc2e2-f62e-4583-b5c4-a58d4cc1e249";

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

type CreatedIssue = { issueId: string; identifier: string; url: string };

// Shared issue-creation call — the one place that speaks Linear's `issueCreate`
// GraphQL mutation. Both the manual "Export to Linear" action and the
// auto-forward action (autoForwardFeedback, ADR 0031) go through this so the
// mutation is defined once.
async function createLinearIssue(
  apiKey: string,
  input: {
    teamId: string;
    projectId: string;
    title: string;
    description: string;
    priority?: number;
    labelIds?: string[];
    stateId?: string;
  },
): Promise<CreatedIssue> {
  const created = await linearGraphQL<{
    issueCreate: { success: boolean; issue: { id: string; identifier: string; url: string } };
  }>(
    apiKey,
    `mutation issueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) { success issue { id identifier url } }
    }`,
    { input },
  );
  if (!created.issueCreate?.success || !created.issueCreate.issue) {
    throw new Error("Linear did not create the issue");
  }
  const issue = created.issueCreate.issue;
  return { issueId: issue.id, identifier: issue.identifier, url: issue.url };
}

// Upload every present storage id (snapshot + attached photos) to Linear as
// real assets, returning the asset URLs that succeeded. Shared by both the
// manual export and auto-forward paths.
async function uploadFeedbackAssets(
  ctx: ActionCtx,
  apiKey: string,
  storageIds: Id<"_storage">[],
): Promise<string[]> {
  const assetUrls: string[] = [];
  for (const sid of storageIds) {
    const blob = await ctx.storage.get(sid);
    if (!blob) continue;
    const url = await uploadToLinear(apiKey, blob, `feedback-${sid}.png`, blob.type || "image/png");
    if (url) assetUrls.push(url);
  }
  return assetUrls;
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
    const assetUrls = await uploadFeedbackAssets(ctx, apiKey, storageIds);

    const description = buildDescription(row, assetUrls);
    const cleanTitle = title.trim() || `${TYPE_LABEL[row.type] ?? "Feedback"}: ${row.text.slice(0, 60)}`;
    // Clamp priority into Linear's 0–4 range.
    const prio = Math.max(0, Math.min(4, Math.round(priority)));

    const issue = await createLinearIssue(apiKey, {
      teamId,
      projectId,
      title: cleanTitle,
      description,
      priority: prio,
    });

    await ctx.runMutation(api.feedback.markExported, {
      id,
      issueId: issue.issueId,
      identifier: issue.identifier,
      url: issue.url,
    });
    return issue;
  },
});

// ── Auto-forward: every submission → a Linear `agent:cody` task ─────────────
// See ADR 0031. Unlike `exportFeedback` (a deliberate, owner-triggered button),
// this is a DUMB, reliable pipe: every feedback submission gets forwarded
// as-is, untyped by a human, unfiltered, un-enriched — the downstream coding
// agent (Cody) does the interpreting, not this pipeline. Scheduled from
// `convex/feedback.ts` `submit` via `ctx.scheduler.runAfter(0, …)` so a Linear
// outage or slow call never affects the user's submit.
//
// Gated by FEEDBACK_AUTOFORWARD (falsy = off, the default) so merging this is
// safe and turning it on in prod is a deliberate, separate step:
//   npx convex env set FEEDBACK_AUTOFORWARD 1
//
// Best-effort throughout: any failure (flag off, no API key, Linear error) is
// logged and swallowed, never thrown — this runs detached from the user's
// request, so throwing here would only spam Convex's scheduler-failure logs,
// not surface to anyone. A failed forward leaves `linear` unset, so the row
// stays visible to `adminList`/the `lifeguide-feedback` skill and can be
// exported manually or retried.

// First line of the note, trimmed to a short readable title. No AI rewrite —
// this pipe does no interpretation, per ADR 0031.
function deriveAutoTitle(text: string): string {
  const firstLine = text.trim().split("\n")[0]?.trim() || "Feedback";
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
}

// The issue body for the auto-forward path. Deliberately different shape from
// `buildDescription` (the manual-export body): this one leads with the
// `Repo: lifeguide` line the Cody bridge requires to route the task, and skips
// the export flow's "captured context" block (viewport/UA/console errors) —
// Cody reads the raw note, not a bug-report template.
function buildAutoForwardDescription(
  row: { type: string; view: string; text: string; submitterLabel: string },
  assetUrls: string[],
): string {
  const lines: string[] = [];
  lines.push("Repo: lifeguide");
  lines.push("");
  lines.push(`- Type as tagged: ${TYPE_LABEL[row.type] ?? row.type}`);
  lines.push(`- View: ${row.view}`);
  lines.push(`- Submitted by: ${row.submitterLabel}`);
  lines.push("");
  lines.push("**What they said**");
  lines.push("");
  lines.push(row.text.trim());
  if (assetUrls.length) {
    lines.push("");
    for (const url of assetUrls) lines.push(`![feedback image](${url})`);
  }
  lines.push("");
  lines.push("---");
  lines.push(
    "Auto-forwarded from in-app feedback. Cody: read this, and per your SOUL post your understanding + proposal + confidence to the repo's Slack channel.",
  );
  return lines.join("\n");
}

export const autoForwardFeedback = internalAction({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, { feedbackId }) => {
    if (!process.env.FEEDBACK_AUTOFORWARD) {
      return; // off by default — see the setup note above
    }
    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) {
      console.error("autoForwardFeedback: LINEAR_API_KEY not set; skipping", feedbackId);
      return;
    }
    try {
      const row = await ctx.runQuery(internal.feedback.getRowForAutoForward, { id: feedbackId });
      if (!row) return; // row vanished between insert and this running
      if (row.linear) return; // already filed (e.g. manually exported first) — no-op

      const teamId = process.env.LINEAR_TEAM_ID || DEFAULT_TEAM_ID;
      const projectId = process.env.LINEAR_PROJECT_ID || DEFAULT_PROJECT_ID;

      const storageIds = [row.shotId, ...(row.imageIds ?? [])].filter(
        (x): x is NonNullable<typeof x> => Boolean(x),
      );
      const assetUrls = await uploadFeedbackAssets(ctx, apiKey, storageIds);

      const issue = await createLinearIssue(apiKey, {
        teamId,
        projectId,
        title: deriveAutoTitle(row.text),
        description: buildAutoForwardDescription(row, assetUrls),
        labelIds: [AGENT_CODY_LABEL_ID],
        stateId: TODO_STATE_ID,
      });

      await ctx.runMutation(internal.feedback.markExportedInternal, {
        id: feedbackId,
        issueId: issue.issueId,
        identifier: issue.identifier,
        url: issue.url,
      });
    } catch (e) {
      // Best-effort: leave `linear` unset so the row can be retried later
      // (manually, or by a future heartbeat) rather than throwing into the
      // scheduler's error log with no recovery path.
      console.error("autoForwardFeedback failed", feedbackId, e);
    }
  },
});
