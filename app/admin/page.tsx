"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { filledCount } from "@/lib/levels";

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

  const resetOnboarding = useMutation(api.admin.resetOnboarding);
  const clearCore = useMutation(api.admin.clearCore);
  const seedCore = useMutation(api.admin.seedCore);
  const clearTestData = useMutation(api.admin.clearTestData);

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
      </div>
    </div>
  );
}
