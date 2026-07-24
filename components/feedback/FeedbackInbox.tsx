"use client";

// ============================================================================
// FEEDBACK INBOX — the collect / organize / act panel for feedback tickets.
// ============================================================================
// A self-contained, embeddable panel (today it lives in /admin, but it takes no
// route dependency). It reads the owner's cross-user feedback queue and lets you:
//   • filter by pile (Needs you · In progress · Dealt with) and by type (Bug/Tweak/Feature/Feedback)
//   • Reply by email (mailto) — which moves the ticket to "In progress"
//   • Export to Linear — create a real tracked issue with the photo attached,
//     picking a title + urgency; the ticket links out and moves to "In progress"
//   • Dealt with — close it into a separate pile (Reopen brings it back)
// The lifecycle + Linear wiring live server-side in convex/feedback.ts + linear.ts.
// ============================================================================

import { useMemo, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  AlertCircle,
  CircleDashed,
  CheckCircle2,
  Image as ImageIcon,
  Mail,
  ExternalLink,
  Loader2,
  ArrowUpRight,
} from "lucide-react";

type FeedbackType = "bug" | "tweak" | "feature" | "feedback";
type Status = "open" | "pending" | "dealt_with";

const TYPE_LABEL: Record<string, string> = {
  bug: "Bug",
  tweak: "Tweak",
  feature: "Feature",
  feedback: "Feedback",
};
const TYPE_FILTERS: { key: "all" | FeedbackType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "bug", label: "Bugs" },
  { key: "tweak", label: "Tweaks" },
  { key: "feature", label: "Features" },
  { key: "feedback", label: "Feedback" },
];
const PILES: { key: Status; label: string }[] = [
  { key: "open", label: "Needs you" },
  { key: "pending", label: "In progress" },
  { key: "dealt_with", label: "Dealt with" },
];

// Urgency → Linear priority (0 none · 1 urgent · 2 high · 3 medium · 4 low).
const URGENCY: { label: string; priority: number }[] = [
  { label: "No urgency", priority: 0 },
  { label: "Low", priority: 4 },
  { label: "Medium", priority: 3 },
  { label: "High", priority: 2 },
  { label: "Urgent", priority: 1 },
];

// A sensible default Linear title from the note: first line, trimmed to length.
function defaultTitle(type: string, text: string): string {
  const firstLine = text.trim().split("\n")[0].trim();
  const short = firstLine.length > 70 ? `${firstLine.slice(0, 70)}…` : firstLine;
  return `[${TYPE_LABEL[type] ?? type}] ${short}`;
}

export function FeedbackInbox({ enabled = true }: { enabled?: boolean }) {
  const feedback = useQuery(api.feedback.listAll, enabled ? {} : "skip");
  const markPending = useMutation(api.feedback.markPending);
  const resolveFeedback = useMutation(api.feedback.resolve);
  const reopenFeedback = useMutation(api.feedback.reopen);
  const exportToLinear = useAction(api.linear.exportFeedback);

  const [pile, setPile] = useState<Status>("open");
  const [typeFilter, setTypeFilter] = useState<"all" | FeedbackType>("all");

  // Per-ticket export form + async state, keyed by ticket id.
  const [exportFor, setExportFor] = useState<Id<"feedback"> | null>(null);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState(0);
  const [busy, setBusy] = useState<Id<"feedback"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { open: 0, pending: 0, dealt_with: 0 };
    for (const f of feedback ?? []) c[f.status as Status]++;
    return c;
  }, [feedback]);

  const visible = useMemo(
    () =>
      (feedback ?? []).filter(
        (f) => f.status === pile && (typeFilter === "all" || f.type === typeFilter),
      ),
    [feedback, pile, typeFilter],
  );

  const openExport = (f: { _id: Id<"feedback">; type: string; text: string }) => {
    setExportFor(f._id);
    setTitle(defaultTitle(f.type, f.text));
    setPriority(0);
    setError(null);
  };

  const runExport = async (id: Id<"feedback">) => {
    setBusy(id);
    setError(null);
    try {
      await exportToLinear({ id, title, priority });
      setExportFor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {/* Header + pile segmented control */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-ink-mute text-[12px] uppercase tracking-[0.14em]">
          Feedback / Escalations
        </span>
        {counts.open > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#9B2C2C] text-white text-[11px] font-semibold">
            {counts.open}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Piles */}
        <div className="inline-flex rounded-xl border border-line bg-card p-0.5 text-[13px]">
          {PILES.map((p) => (
            <button
              key={p.key}
              onClick={() => setPile(p.key)}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                pile === p.key ? "bg-ink text-white" : "text-ink-soft hover:bg-paper-2"
              }`}
            >
              {p.label}
              <span className={`text-[11px] ${pile === p.key ? "text-white/70" : "text-ink-mute"}`}>
                {counts[p.key]}
              </span>
            </button>
          ))}
        </div>
        {/* Type filter */}
        <div className="inline-flex rounded-xl border border-line bg-card p-0.5 text-[13px]">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                typeFilter === t.key ? "bg-paper-2 text-ink" : "text-ink-mute hover:text-ink-soft"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-line rounded-2xl divide-y divide-line">
        {feedback === undefined ? (
          <div className="p-4 text-ink-mute text-[14px]">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="p-4 text-ink-mute text-[14px]">
            {pile === "open" ? "Nothing needs you here." : pile === "pending" ? "Nothing in progress." : "Nothing dealt with yet."}
            {typeFilter !== "all" && " (with this filter)"}
          </div>
        ) : (
          visible.map((f) => {
            const who = f.submitter?.name || f.submitter?.email || "anonymous";
            const replyHref = f.submitter?.email
              ? `mailto:${f.submitter.email}?subject=${encodeURIComponent(
                  "Re: your LifeGuide feedback",
                )}&body=${encodeURIComponent(
                  `\n\n———\nIn reply to your ${TYPE_LABEL[f.type] ?? f.type} note:\n"${f.text}"`,
                )}`
              : null;
            const StatusIcon =
              f.status === "open" ? AlertCircle : f.status === "pending" ? CircleDashed : CheckCircle2;
            const statusColor =
              f.status === "open" ? "text-[#9B2C2C]" : f.status === "pending" ? "text-ink-mute" : "text-green";
            return (
              <div key={f._id} className={`p-4 flex gap-3 ${f.status === "dealt_with" ? "opacity-60" : ""}`}>
                <div className="pt-0.5 flex-shrink-0">
                  <StatusIcon className={`w-[18px] h-[18px] ${statusColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-[12px] text-ink-mute mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-paper-2 text-ink-soft font-medium">
                      {TYPE_LABEL[f.type] ?? f.type}
                    </span>
                    <span className="font-mono">{f.route}</span>
                    <span>· {f.view}</span>
                    <span>· {new Date(f.createdAt).toLocaleString()}</span>
                    {f.errors.length > 0 && (
                      <span className="text-[#9B2C2C]">· {f.errors.length} error{f.errors.length > 1 ? "s" : ""}</span>
                    )}
                    {f.linear && (
                      <a
                        href={f.linear.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ink/5 text-ink-soft hover:bg-ink/10 transition font-medium"
                        title="Open the Linear issue"
                      >
                        <ArrowUpRight className="w-3 h-3" /> {f.linear.identifier}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] mb-1.5">
                    <span className="text-ink-mute">from</span>
                    <span className={`font-medium ${f.submitter?.isAnonymous ? "text-ink-mute italic" : "text-ink-soft"}`}>
                      {who}
                    </span>
                    {f.submitter?.email && f.submitter?.name && (
                      <span className="text-ink-mute">· {f.submitter.email}</span>
                    )}
                  </div>
                  <div className="text-[14px] text-ink whitespace-pre-wrap break-words">{f.text}</div>
                  {f.errors.length > 0 && (
                    <details className="mt-1.5">
                      <summary className="text-[12px] text-ink-mute cursor-pointer hover:text-ink-soft">
                        error log
                      </summary>
                      <pre className="mt-1 text-[11px] text-ink-soft bg-paper-2 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                        {f.errors.map((e) => e.message).join("\n")}
                      </pre>
                    </details>
                  )}

                  {/* Images */}
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    {f.shotUrl ? (
                      <a
                        href={f.shotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-[88px] h-[56px] rounded-md border border-line overflow-hidden bg-paper-2 flex-shrink-0"
                        title="Open snapshot"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.shotUrl} alt="page snapshot" className="w-full h-full object-cover" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[12px] text-ink-mute">
                        <ImageIcon className="w-3.5 h-3.5" /> no snapshot
                      </span>
                    )}
                    {(f.imageUrls ?? []).map((u, i) => (
                      <a
                        key={u}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-[56px] h-[56px] rounded-md border border-line overflow-hidden bg-paper-2 flex-shrink-0"
                        title={`Open attached photo ${i + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt={`attached photo ${i + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {replyHref ? (
                      <>
                        {/* Plain mailto handoff: we have no way to know whether the OS
                            mail client actually opened or an email was sent (the browser's
                            own "leave this site?" prompt can cancel it), so this must NOT
                            mutate status on click — only "Mark as replied" below does. */}
                        <a
                          href={replyHref}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] border border-line text-ink-soft hover:bg-paper-2 transition"
                          title={`Reply to ${f.submitter?.email}`}
                        >
                          <Mail className="w-3.5 h-3.5" /> Reply
                        </a>
                        {f.status === "open" && (
                          <button
                            onClick={() => void markPending({ id: f._id })}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] border border-line text-ink-mute hover:bg-paper-2 transition"
                            title="Mark this ticket as replied to / in progress"
                          >
                            <CircleDashed className="w-3.5 h-3.5" /> Mark as replied
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-[12px] text-ink-mute italic">no email to reply to</span>
                    )}

                    {f.linear ? (
                      <a
                        href={f.linear.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] border border-line text-ink-soft hover:bg-paper-2 transition"
                        title="Open in Linear"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> In Linear
                      </a>
                    ) : (
                      <button
                        onClick={() => openExport(f)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] border border-line text-ink-soft hover:bg-paper-2 transition"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" /> Export to Linear
                      </button>
                    )}

                    {f.status !== "dealt_with" ? (
                      <button
                        onClick={() => void resolveFeedback({ id: f._id })}
                        className="rounded-lg px-3 py-1.5 text-[13px] bg-ink text-white hover:opacity-90 transition"
                      >
                        Dealt with
                      </button>
                    ) : (
                      <button
                        onClick={() => void reopenFeedback({ id: f._id })}
                        className="rounded-lg px-3 py-1.5 text-[13px] border border-line text-ink-mute hover:bg-paper-2 transition"
                      >
                        Reopen
                      </button>
                    )}
                  </div>

                  {/* Inline export composer */}
                  {exportFor === f._id && (
                    <div className="mt-3 rounded-xl border border-line bg-paper-2 p-3 flex flex-col gap-2.5">
                      <div className="text-[12px] text-ink-mute">
                        Creates a Linear issue with the note, page context, and the photo attached.
                        Set the rest (assignee, status) in Linear.
                      </div>
                      <label className="text-[12px] text-ink-soft">
                        Issue name
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="mt-1 w-full bg-card border border-line rounded-lg px-3 py-2 text-ink text-[14px] outline-none focus:border-ink-mute"
                        />
                      </label>
                      <label className="text-[12px] text-ink-soft">
                        Urgency
                        <select
                          value={priority}
                          onChange={(e) => setPriority(Number(e.target.value))}
                          className="mt-1 w-full bg-card border border-line rounded-lg px-3 py-2 text-ink text-[14px] outline-none focus:border-ink-mute"
                        >
                          {URGENCY.map((u) => (
                            <option key={u.priority} value={u.priority}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {error && <div className="text-[12px] text-[#9B2C2C]">{error}</div>}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void runExport(f._id)}
                          disabled={busy === f._id || !title.trim()}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] bg-ink text-white disabled:opacity-50 transition"
                        >
                          {busy === f._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          {busy === f._id ? "Creating…" : "Create in Linear"}
                        </button>
                        <button
                          onClick={() => { setExportFor(null); setError(null); }}
                          className="rounded-lg px-3 py-1.5 text-[13px] border border-line text-ink-mute hover:bg-card transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
