"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { BlueprintCard } from "@/components/settings/BlueprintCard";

const PALETTE = ["#B8945A", "#4F7A4A", "#3A5C86", "#5B4B7A", "#2F6E6A", "#1E3A5F"];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-11 h-[26px] rounded-full relative transition flex-shrink-0 ${on ? "bg-green" : "bg-line"}`}
    >
      <span
        className={`absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all ${on ? "left-[21px]" : "left-[3px]"}`}
      />
    </button>
  );
}

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex bg-paper-2 rounded-[10px] p-[3px]">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`px-3 py-1.5 rounded-lg text-[13px] transition ${
            value === o.v ? "bg-card text-ink shadow-sm" : "text-ink-mute"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Convex wraps thrown Error messages from actions/mutations with request-id and
// stack-trace noise (e.g. "[Request ID: …] Server Error\nUncaught Error: <msg>\n
// at handler (…)"). Pull just the human-readable message back out for display.
function convexErrorMessage(e: unknown, fallback: string): string {
  const raw = e instanceof Error ? e.message : String(e);
  const match = raw.match(/Uncaught Error:\s*(.*)/);
  const line = (match ? match[1] : raw).split("\n")[0].trim();
  return line || fallback;
}

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-line-2 last:border-none gap-4">
      <div>
        <div className="text-[15px] font-medium text-ink">{title}</div>
        <div className="text-[13px] text-ink-mute mt-0.5">{desc}</div>
      </div>
      {children}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-line rounded-2xl px-5 mb-[18px]">
      <div className="text-[11px] tracking-[0.16em] uppercase text-ink-mute pt-3.5 pb-0.5">
        {label}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The AI hub: every node editable in place + the universal activity log.
// Model options are verified live on OpenRouter (2026-07-13); the three
// OpenAI-pinned nodes (realtime / audio / images endpoints) offer their own
// family since OpenRouter has no endpoint for them.
// ---------------------------------------------------------------------------
const OPENROUTER_TEXT_MODELS = [
  "openai/gpt-4o-mini",
  "openai/gpt-5-mini",
  "openai/gpt-5.4-mini",
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-sonnet-5",
  "anthropic/claude-opus-4.8",
  "openai/gpt-5.6-terra",
  "openai/gpt-5.6-terra-pro",
  "google/gemini-3.5-flash",
];
const OPENAI_PINNED: Record<string, string[]> = {
  voice: ["gpt-realtime-mini", "gpt-realtime"],
  voiceTranscribe: ["gpt-4o-transcribe", "gpt-4o-mini-transcribe", "whisper-1"],
  imageGen: ["gpt-image-1"],
};

function fmtCost(usd?: number): string {
  if (usd === undefined) return "—";
  if (usd < 0.0001) return "<$0.0001";
  return `$${usd.toFixed(usd < 0.01 ? 4 : 2)}`;
}
function fmtTok(n?: number): string {
  if (n === undefined) return "—";
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
function fmtWhen(at: number): string {
  const d = new Date(at);
  const today = new Date().toDateString() === d.toDateString();
  const hm = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return today ? hm : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${hm}`;
}

export function Settings() {
  const settings = useQuery(api.settings.get, {});
  const pillars = useQuery(api.pillars.list, {});
  const presets = useQuery(api.pillars.presets, {});
  const owner = useQuery(api.owner.amOwner);
  const update = useMutation(api.settings.update);
  // The /admin entry shows in local dev (any session) or, in prod, only the owner.
  const showAdmin = process.env.NODE_ENV !== "production" || owner?.isOwner === true;
  const addPillar = useMutation(api.pillars.add);
  const aiNodes = useQuery(api.aiModels.nodes, {});
  const setModel = useMutation(api.aiModels.setModel);
  const clearModel = useMutation(api.aiModels.clearModel);
  const aiRecent = useQuery(api.aiLogs.recent, { limit: 40 });
  const aiSpend = useQuery(api.aiLogs.monthSpend, {});
  const [showLog, setShowLog] = useState(false);
  const keyStatus = useQuery(api.aiKeys.status, {});
  const setKey = useMutation(api.aiKeys.setKey);
  const clearKey = useMutation(api.aiKeys.clearKey);
  const saveTodoistToken = useAction(api.todoist.saveToken);
  const { signOut } = useAuthActions();
  const [modal, setModal] = useState(false);
  const [custom, setCustom] = useState("");
  const [orKey, setOrKey] = useState("");
  const orStatus = (keyStatus ?? []).find((k) => k.provider === "openrouter");
  const [tdKey, setTdKey] = useState("");
  const [tdSaving, setTdSaving] = useState(false);
  const [tdError, setTdError] = useState<string | null>(null);
  const tdStatus = (keyStatus ?? []).find((k) => k.provider === "todoist");

  const s = settings;
  const existingNames = new Set((pillars ?? []).map((p) => p.name));
  const openPresets = (presets ?? []).filter((p) => !existingNames.has(p));

  return (
    <div className="h-full overflow-auto bg-paper">
      <div className="max-w-[640px] mx-auto px-5 pt-8 pb-20 md:px-10 md:pt-11">
        <div className="text-[12px] tracking-[0.18em] uppercase text-ink-mute mb-2">Settings</div>
        <h2 className="text-[30px] tracking-tight text-ink mb-4">How I treat you</h2>

        <Group label="Daily rhythm">
          <Row title="Morning check-in" desc="A direction to wake to">
            <Toggle
              on={s?.morningCheckin ?? true}
              onClick={() => update({ morningCheckin: !(s?.morningCheckin ?? true) })}
            />
          </Row>
          <Row title="Evening check-out" desc="A moment to reflect">
            <Toggle
              on={s?.eveningCheckin ?? true}
              onClick={() => update({ eveningCheckin: !(s?.eveningCheckin ?? true) })}
            />
          </Row>
          <Row title="Daily exercise" desc="What the check-in asks you">
            <Seg
              value={s?.dailyExercise ?? "intention"}
              onChange={(v) => update({ dailyExercise: v })}
              options={[
                { v: "intention", label: "Intention" },
                { v: "gratitude", label: "Gratitude" },
                { v: "free", label: "Free" },
              ]}
            />
          </Row>
        </Group>

        <BlueprintCard />

        <Group label="The Coach">
          <Row title="Tone" desc="How direct I am with you">
            <Seg
              value={s?.coachTone ?? "balanced"}
              onChange={(v) => update({ coachTone: v })}
              options={[
                { v: "gentle", label: "Gentle" },
                { v: "balanced", label: "Balanced" },
                { v: "direct", label: "Direct" },
              ]}
            />
          </Row>
          <Row title="Reaching out" desc="How often I check on you unprompted">
            <Seg
              value={s?.reachingOut ?? "earned"}
              onChange={(v) => update({ reachingOut: v })}
              options={[
                { v: "leave", label: "Leave me" },
                { v: "earned", label: "Earned" },
                { v: "often", label: "Often" },
              ]}
            />
          </Row>
        </Group>

        <Group label="Atmosphere">
          <Row title="Music" desc="Ambient sound, always at the ready">
            <Toggle
              on={s?.musicEnabled ?? true}
              onClick={() => update({ musicEnabled: !(s?.musicEnabled ?? true) })}
            />
          </Row>
          <Row title="Autoplay" desc="Start playing when you open the app">
            <Toggle
              on={s?.musicAutoplay ?? true}
              onClick={() => update({ musicAutoplay: !(s?.musicAutoplay ?? true) })}
            />
          </Row>
          <Row title="Default mood" desc="What plays first each session">
            <Seg
              value={s?.musicDefaultMood ?? "inspiration"}
              onChange={(v) => update({ musicDefaultMood: v })}
              options={[
                { v: "inspiration", label: "Inspire" },
                { v: "deep-thinking", label: "Deep" },
                { v: "focus", label: "Focus" },
                { v: "calm-reset", label: "Calm" },
              ]}
            />
          </Row>
        </Group>

        <Group label="Your pillars">
          <div className="flex items-center gap-2 py-3.5 flex-wrap">
            {(pillars ?? []).map((p, i) => (
              <span
                key={p._id}
                className="text-[13px] px-3 py-1.5 rounded-full border border-line flex items-center gap-1.5 text-ink"
              >
                <i
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                {p.name}
              </span>
            ))}
            <button
              onClick={() => setModal(true)}
              className="text-[13px] px-3 py-1.5 rounded-full border border-dashed border-line text-ink-mute hover:text-ink hover:border-ink-mute transition"
            >
              + add pillar
            </button>
          </div>
        </Group>

        <Group label="AI — models, keys & activity">
          <div className="py-3.5 border-b border-line-2">
            <div className="text-[13px] text-ink-mute mb-2.5">
              Every AI node in the app. Pick the model it runs on — your choice applies to
              your account and wins over the default in{" "}
              <code className="text-ink-soft">convex/ai/config.ts</code>.
            </div>
            <div className="flex flex-col gap-1.5">
              {(aiNodes ?? []).map((n) => {
                const pinned = OPENAI_PINNED[n.id];
                const options = pinned ?? OPENROUTER_TEXT_MODELS;
                const list = options.includes(n.model) ? options : [n.model, ...options];
                const defaultModel = n.overridden ? (n as any).defaultModel : n.model;
                return (
                  <div key={n.id} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-ink flex items-center gap-2 min-w-0">
                      <span className="truncate">{n.label}</span>
                      {!n.wired && (
                        <span className="text-[10px] uppercase tracking-wide text-ink-mute border border-line rounded px-1.5 py-0.5 flex-none">
                          soon
                        </span>
                      )}
                      {n.overridden && (
                        <button
                          title={`Yours. Reset to the default (${defaultModel}).`}
                          onClick={() => void clearModel({ taskId: n.id })}
                          className="text-[10px] uppercase tracking-wide text-gold border border-gold/40 rounded px-1.5 py-0.5 flex-none hover:bg-paper-2 transition"
                        >
                          yours · reset
                        </button>
                      )}
                    </span>
                    <select
                      value={n.model}
                      onChange={(e) => {
                        const model = e.target.value;
                        if (model === defaultModel) {
                          void clearModel({ taskId: n.id });
                        } else {
                          void setModel({
                            taskId: n.id,
                            provider: pinned ? "openai" : "openrouter",
                            model,
                          });
                        }
                      }}
                      className="bg-paper border border-line rounded-lg px-2 py-1 font-mono text-[12px] text-ink-mute outline-none max-w-[220px] flex-none"
                    >
                      {list.map((m) => (
                        <option key={m} value={m}>
                          {m}
                          {m === defaultModel ? " (default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="py-3.5 border-b border-line-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[15px] font-medium text-ink">AI activity</div>
                <div className="text-[13px] text-ink-mute mt-0.5">
                  {aiSpend
                    ? `This month: ${aiSpend.calls} calls · ${fmtTok(
                        aiSpend.inputTokens + aiSpend.outputTokens,
                      )} tokens · ~${fmtCost(aiSpend.costUsd)}${
                        aiSpend.errors ? ` · ${aiSpend.errors} errors` : ""
                      }`
                    : "Every model call is logged: node, model, tokens, cost, duration."}
                </div>
              </div>
              <button
                onClick={() => setShowLog((v) => !v)}
                className="border border-line rounded-lg px-4 py-2 text-sm text-ink-soft hover:bg-paper-2 transition flex-none"
              >
                {showLog ? "Hide log" : "Show log"}
              </button>
            </div>
            {showLog && (
              <div className="mt-3 overflow-x-auto">
                {(aiRecent ?? []).length === 0 ? (
                  <div className="text-[13px] text-ink-mute py-2">
                    No calls logged yet — they land here as the app talks to a model.
                  </div>
                ) : (
                  <table className="w-full text-[12px] font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>
                    <thead>
                      <tr className="text-left text-ink-mute">
                        <th className="py-1 pr-3 font-normal">when</th>
                        <th className="py-1 pr-3 font-normal">node</th>
                        <th className="py-1 pr-3 font-normal">model</th>
                        <th className="py-1 pr-3 font-normal text-right">in</th>
                        <th className="py-1 pr-3 font-normal text-right">out</th>
                        <th className="py-1 pr-3 font-normal text-right">cost</th>
                        <th className="py-1 pr-3 font-normal text-right">ms</th>
                        <th className="py-1 font-normal">ok</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(aiRecent ?? []).map((r) => (
                        <tr key={r.id} className="border-t border-line-2 text-ink-soft" title={r.error ?? r.fn}>
                          <td className="py-1 pr-3 whitespace-nowrap">{fmtWhen(r.at)}</td>
                          <td className="py-1 pr-3">{r.taskId}</td>
                          <td className="py-1 pr-3 max-w-[160px] truncate">{r.model.split("/").pop()}</td>
                          <td className="py-1 pr-3 text-right">{fmtTok(r.inputTokens)}</td>
                          <td className="py-1 pr-3 text-right">{fmtTok(r.outputTokens)}</td>
                          <td className="py-1 pr-3 text-right">{fmtCost(r.costUsd)}</td>
                          <td className="py-1 pr-3 text-right">{r.durationMs}</td>
                          <td className="py-1">{r.ok ? "✓" : "✗"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
          <Row
            title="Your OpenRouter key"
            desc={
              orStatus
                ? `Saved (ends ····${orStatus.last4}). Your calls run on your key.`
                : "Bring your own key. Falls back to the shared key if unset."
            }
          >
            {orStatus ? (
              <button
                onClick={() => void clearKey({ provider: "openrouter" })}
                className="border border-line rounded-lg px-4 py-2 text-sm text-ink-soft hover:bg-paper-2 transition"
              >
                Remove
              </button>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="password"
                  value={orKey}
                  onChange={(e) => setOrKey(e.target.value)}
                  placeholder="sk-or-…"
                  className="w-[170px] bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none text-ink"
                />
                <button
                  onClick={async () => {
                    if (!orKey.trim()) return;
                    await setKey({ provider: "openrouter", key: orKey.trim() });
                    setOrKey("");
                  }}
                  className="bg-ink text-white rounded-lg px-4 py-2 text-sm"
                >
                  Save
                </button>
              </div>
            )}
          </Row>
        </Group>

        <Group label="Goals & Todoist">
          <Row
            title="Your Todoist token"
            desc={
              tdStatus
                ? `Connected (ends ····${tdStatus.last4}). Sync from the Goals tab.`
                : "Paste your API token (Todoist → Settings → Integrations → Developer) to sync your projects and tasks into Goals."
            }
          >
            {tdStatus ? (
              <button
                onClick={() => void clearKey({ provider: "todoist" })}
                className="border border-line rounded-lg px-4 py-2 text-sm text-ink-soft hover:bg-paper-2 transition"
              >
                Disconnect
              </button>
            ) : (
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex gap-2 items-center">
                  <input
                    type="password"
                    value={tdKey}
                    onChange={(e) => {
                      setTdKey(e.target.value);
                      if (tdError) setTdError(null);
                    }}
                    placeholder="Todoist API token…"
                    className="w-[170px] bg-paper border border-line rounded-lg px-3 py-2 text-sm outline-none text-ink"
                  />
                  <button
                    onClick={async () => {
                      const token = tdKey.trim();
                      if (!token || tdSaving) return;
                      setTdSaving(true);
                      setTdError(null);
                      try {
                        // Tests the token against the real Todoist API before
                        // saving it, so a bad token is caught right here.
                        await saveTodoistToken({ token });
                        setTdKey("");
                      } catch (e) {
                        setTdError(convexErrorMessage(e, "Couldn't connect to Todoist."));
                      } finally {
                        setTdSaving(false);
                      }
                    }}
                    disabled={tdSaving}
                    className="bg-ink text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {tdSaving ? "Testing…" : "Save"}
                  </button>
                </div>
                {tdError && <div className="text-[12px] text-red-500 max-w-[260px] text-right">{tdError}</div>}
              </div>
            )}
          </Row>
        </Group>

        <Group label="Yours alone">
          <Row title="Your data is yours" desc="Private by default. Sign out anytime.">
            <button
              onClick={() => void signOut()}
              className="border border-line rounded-lg px-4 py-2 text-sm text-ink-soft hover:bg-paper-2 transition"
            >
              Sign out
            </button>
          </Row>
          {showAdmin && (
            <Row title="Admin" desc="Feedback inbox, plus dev tools: reset onboarding, seed/clear the Core, inspect sessions.">
              <a
                href="/admin"
                className="border border-line rounded-lg px-4 py-2 text-sm text-ink-soft hover:bg-paper-2 transition"
              >
                Open /admin →
              </a>
            </Row>
          )}
        </Group>
      </div>

      {modal && (
        <div
          className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center"
          onClick={(e) => e.target === e.currentTarget && setModal(false)}
        >
          <div className="bg-card rounded-[18px] p-[26px] w-[420px] max-w-[90vw]">
            <h3 className="text-[20px] text-ink mb-1">Add a pillar</h3>
            <div className="text-[14px] text-ink-mute mb-[18px]">
              A facet of your life. Pick one, or make your own.
            </div>
            {openPresets.map((name, i) => (
              <button
                key={name}
                onClick={async () => {
                  await addPillar({ name, source: "preset" });
                  setModal(false);
                }}
                className="w-full flex items-center gap-3 p-3 border border-line rounded-xl mb-2 hover:border-gold transition text-left"
              >
                <i
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ background: PALETTE[(i + 1) % PALETTE.length] }}
                />
                <span className="font-medium text-[14.5px] text-ink">{name}</span>
              </button>
            ))}
            <div className="flex gap-2 mt-3">
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Or name your own…"
                className="flex-1 bg-paper border border-line rounded-xl px-3 py-2 text-sm outline-none text-ink"
              />
              <button
                onClick={async () => {
                  if (!custom.trim()) return;
                  await addPillar({ name: custom.trim(), source: "custom" });
                  setCustom("");
                  setModal(false);
                }}
                className="bg-ink text-white rounded-xl px-4 text-sm"
              >
                Add
              </button>
            </div>
            <button
              onClick={() => setModal(false)}
              className="w-full mt-2 border border-line rounded-xl py-2 text-sm text-ink-mute hover:bg-paper-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
