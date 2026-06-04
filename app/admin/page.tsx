"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { filledCount } from "@/lib/levels";
import { AlertCircle, CheckCircle2, Image as ImageIcon } from "lucide-react";

const TYPE_LABEL: Record<string, string> = { bug: "Bug", feature: "Feature", other: "Other" };

// Self-scoped dev/admin panel. Standalone route (no rail). Every action below
// only touches the CURRENT anonymous identity's own data. Dev-gated: in a
// production build this renders a notice instead of the tools.

type ActionKey = "reset" | "clearCore" | "seedCore" | "wipe";

const ACTIONS: { key: ActionKey; label: string; desc: string; danger?: boolean }[] = [
  { key: "reset", label: "Reset onboarding", desc: "Clear onboardedAt + status + level. Reload the app to land back on the Door. Keeps your Core answers." },
  { key: "seedCore", label: "Seed Core (fill all 18)", desc: "Fill every blueprint box with sample text, flipping status to complete / Level 1." },
  { key: "clearCore", label: "Clear Core answers", desc: "Delete all of your blueprint answers; status returns to unstarted.", danger: true },
  { key: "wipe", label: "Wipe test data", desc: "Delete Core answers, interview sessions, and telemetry, and reset onboarding. Keeps rhythm/tone preferences.", danger: true },
];

export default function AdminPage() {
  const isProd = process.env.NODE_ENV === "production";

  const settings = useQuery(api.settings.get, isProd ? "skip" : {});
  const coreMap = useQuery(api.core.get, isProd ? "skip" : {});
  const sessions = useQuery(api.admin.listSessions, isProd ? "skip" : {});
  const feedback = useQuery(api.feedback.listAll, isProd ? "skip" : {});

  const resetOnboarding = useMutation(api.admin.resetOnboarding);
  const clearCore = useMutation(api.admin.clearCore);
  const seedCore = useMutation(api.admin.seedCore);
  const clearTestData = useMutation(api.admin.clearTestData);
  const resolveFeedback = useMutation(api.feedback.resolve);
  const reopenFeedback = useMutation(api.feedback.reopen);

  const [confirming, setConfirming] = useState<ActionKey | null>(null);
  const [busy, setBusy] = useState<ActionKey | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (isProd) {
    return (
      <div className="h-screen flex items-center justify-center bg-paper text-ink-mute">
        The admin panel is only available in development.
      </div>
    );
  }

  const run = async (key: ActionKey) => {
    setBusy(key);
    setDone(null);
    try {
      if (key === "reset") await resetOnboarding({});
      else if (key === "clearCore") await clearCore({});
      else if (key === "seedCore") await seedCore({});
      else if (key === "wipe") await clearTestData({});
      setDone(ACTIONS.find((a) => a.key === key)!.label + " done.");
    } catch (e) {
      setDone("Failed: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  };

  const filled = coreMap && typeof coreMap === "object" ? filledCount(coreMap as Record<string, string>) : 0;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="max-w-[680px] mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-[12px] tracking-[0.18em] uppercase text-ink-mute">Developer</div>
            <h1 className="text-[28px] tracking-tight">Admin panel</h1>
          </div>
          <a href="/" className="text-[13px] text-ink-mute hover:text-ink transition">
            ← Back to app
          </a>
        </div>

        {/* Current state */}
        <div className="bg-card border border-line rounded-2xl p-5 mb-6 text-[14px]">
          <div className="text-ink-mute text-[12px] uppercase tracking-[0.14em] mb-3">Current identity</div>
          {settings === undefined ? (
            <div className="text-ink-mute">Loading…</div>
          ) : settings === null ? (
            <div className="text-ink-mute">Not signed in.</div>
          ) : (
            <div className="grid grid-cols-2 gap-y-2">
              <span className="text-ink-mute">Onboarded</span>
              <span>{settings.onboardedAt ? "yes" : "no (will see the Door)"}</span>
              <span className="text-ink-mute">Blueprint status</span>
              <span>{settings.blueprintStatus ?? "unstarted"}</span>
              <span className="text-ink-mute">Level</span>
              <span>{settings.level ?? 0}</span>
              <span className="text-ink-mute">Core filled</span>
              <span>{filled}/18</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 mb-8">
          {ACTIONS.map((a) => (
            <div
              key={a.key}
              className="bg-card border border-line rounded-2xl p-4 flex items-center justify-between gap-4"
            >
              <div>
                <div className={`font-semibold text-[15px] ${a.danger ? "text-[#9B2C2C]" : "text-ink"}`}>{a.label}</div>
                <div className="text-[13px] text-ink-mute mt-0.5">{a.desc}</div>
              </div>
              {confirming === a.key ? (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => void run(a.key)}
                    disabled={busy !== null}
                    className="rounded-lg px-3 py-2 text-[13px] bg-ink text-white disabled:opacity-50"
                  >
                    {busy === a.key ? "…" : "Confirm"}
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="rounded-lg px-3 py-2 text-[13px] border border-line text-ink-mute"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setConfirming(a.key); setDone(null); }}
                  className={`rounded-lg px-4 py-2 text-[13px] flex-shrink-0 transition ${
                    a.danger ? "border border-[#E3B5B5] text-[#9B2C2C] hover:bg-[#FBF1F1]" : "border border-line text-ink-soft hover:bg-paper-2"
                  }`}
                >
                  {a.label}
                </button>
              )}
            </div>
          ))}
          {done && <div className="text-[13px] text-ink-soft px-1">{done} {done.endsWith("done.") && "Reload the app to see the effect."}</div>}
        </div>

        {/* Sessions */}
        <div className="text-ink-mute text-[12px] uppercase tracking-[0.14em] mb-3">Interview sessions</div>
        <div className="bg-card border border-line rounded-2xl divide-y divide-line">
          {sessions === undefined ? (
            <div className="p-4 text-ink-mute text-[14px]">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-ink-mute text-[14px]">No interview sessions yet.</div>
          ) : (
            sessions.map((s) => (
              <div key={s._id} className="p-4 flex items-center justify-between text-[13px]">
                <div>
                  <span className="font-medium text-ink">{s.experienceId}</span>
                  <span className="text-ink-mute"> · {s.status} · {s.transcript.length} turns</span>
                </div>
                <span className="text-ink-mute">{new Date(s.startedAt).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>

        {/* Feedback / Escalations — live ticketing queue */}
        <div className="flex items-center gap-2 mt-8 mb-3">
          <span className="text-ink-mute text-[12px] uppercase tracking-[0.14em]">Feedback / Escalations</span>
          {feedback && feedback.filter((f) => f.status === "open").length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#9B2C2C] text-white text-[11px] font-semibold">
              {feedback.filter((f) => f.status === "open").length}
            </span>
          )}
        </div>
        <div className="bg-card border border-line rounded-2xl divide-y divide-line">
          {feedback === undefined ? (
            <div className="p-4 text-ink-mute text-[14px]">Loading…</div>
          ) : feedback.length === 0 ? (
            <div className="p-4 text-ink-mute text-[14px]">No feedback yet.</div>
          ) : (
            feedback.map((f) => {
              const open = f.status === "open";
              return (
                <div key={f._id} className={`p-4 flex gap-3 ${open ? "" : "opacity-60"}`}>
                  <div className="pt-0.5 flex-shrink-0">
                    {open ? (
                      <AlertCircle className="w-[18px] h-[18px] text-[#9B2C2C]" />
                    ) : (
                      <CheckCircle2 className="w-[18px] h-[18px] text-green" />
                    )}
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
                    <div className="mt-2 flex items-center gap-3">
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
                      {open ? (
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
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
