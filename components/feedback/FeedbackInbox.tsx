"use client";

// ============================================================================
// FEEDBACK INBOX — a READ-ONLY window on the feedback queue.
// ============================================================================
// A self-contained, embeddable panel (today it lives in /admin, but it takes no
// route dependency). It reads the owner's cross-user feedback queue and lets you:
//   • filter by pile (Needs you · In progress · Dealt with) and by type (Bug/Tweak/Feature/Feedback)
//   • see each ticket's status read-only, and open its Linear issue when one exists
//   • Reply by email (mailto) to the submitter — a plain handoff, no status side effect
// Since ADR 0031's type-routed auto-forward, LINEAR owns the lifecycle: every
// bug/tweak/feature is filed to Linear in real time and its status is worked
// there, so this surface no longer drives triage (no Mark-as-replied / Dealt
// with / Reopen, no manual Export). `feedback`-type notes are not filed (they
// stay in the app only) and simply show here. The wiring lives server-side in
// convex/feedback.ts + linear.ts.
// ============================================================================

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  AlertCircle,
  CircleDashed,
  CheckCircle2,
  Image as ImageIcon,
  Mail,
  ExternalLink,
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
// Read-only status wording, shown on each row (Linear owns the lifecycle now).
const STATUS_LABEL: Record<Status, string> = {
  open: "Needs you",
  pending: "In progress",
  dealt_with: "Dealt with",
};

export function FeedbackInbox({ enabled = true }: { enabled?: boolean }) {
  const feedback = useQuery(api.feedback.listAll, enabled ? {} : "skip");

  const [pile, setPile] = useState<Status>("open");
  const [typeFilter, setTypeFilter] = useState<"all" | FeedbackType>("all");

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
                    {/* Read-only status — Linear owns the lifecycle (ADR 0031). */}
                    <span className={`inline-flex items-center gap-1 ${statusColor}`}>
                      · <StatusIcon className="w-3 h-3" /> {STATUS_LABEL[f.status as Status]}
                    </span>
                    {f.linear && (
                      <a
                        href={f.linear.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ink/5 text-ink-soft hover:bg-ink/10 transition font-medium"
                        title="Open the Linear issue"
                      >
                        <ExternalLink className="w-3 h-3" /> {f.linear.identifier}
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

                  {/* Actions — read-only surface. Linear owns the lifecycle now
                      (ADR 0031): the only ways out are opening the Linear issue
                      (when one exists) and a plain mailto reply to the submitter.
                      `feedback`-type notes are never filed, so they show no link. */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {f.linear ? (
                      <a
                        href={f.linear.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] border border-line text-ink-soft hover:bg-paper-2 transition"
                        title="Open in Linear"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View in Linear
                      </a>
                    ) : (
                      <span className="text-[12px] text-ink-mute italic">
                        {f.type === "feedback" ? "not filed — stays in the app" : "not filed to Linear yet"}
                      </span>
                    )}

                    {replyHref ? (
                      // Plain mailto handoff. No status side effect — Linear owns
                      // status, and a mailto gives the page no completion signal.
                      <a
                        href={replyHref}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] border border-line text-ink-soft hover:bg-paper-2 transition"
                        title={`Reply to ${f.submitter?.email}`}
                      >
                        <Mail className="w-3.5 h-3.5" /> Reply
                      </a>
                    ) : (
                      <span className="text-[12px] text-ink-mute italic">no email to reply to</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
