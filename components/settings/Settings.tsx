"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";

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

export function Settings() {
  const settings = useQuery(api.settings.get, {});
  const pillars = useQuery(api.pillars.list, {});
  const presets = useQuery(api.pillars.presets, {});
  const owner = useQuery(api.owner.amOwner);
  const update = useMutation(api.settings.update);
  // The /admin entry shows in local dev (any session) or, in prod, only the owner.
  const showAdmin = process.env.NODE_ENV !== "production" || owner?.isOwner === true;
  const addPillar = useMutation(api.pillars.add);
  const aiNodes = useQuery(api.aiKeys.nodes, {});
  const keyStatus = useQuery(api.aiKeys.status, {});
  const setKey = useMutation(api.aiKeys.setKey);
  const clearKey = useMutation(api.aiKeys.clearKey);
  const { signOut } = useAuthActions();
  const [modal, setModal] = useState(false);
  const [custom, setCustom] = useState("");
  const [orKey, setOrKey] = useState("");
  const orStatus = (keyStatus ?? []).find((k) => k.provider === "openrouter");

  const s = settings;
  const existingNames = new Set((pillars ?? []).map((p) => p.name));
  const openPresets = (presets ?? []).filter((p) => !existingNames.has(p));

  return (
    <div className="h-full overflow-auto bg-paper">
      <div className="max-w-[640px] mx-auto px-10 pt-11 pb-20">
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
              on={s?.musicAutoplay ?? false}
              onClick={() => update({ musicAutoplay: !(s?.musicAutoplay ?? false) })}
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

        <Group label="AI models & keys">
          <div className="py-3.5 border-b border-line-2">
            <div className="text-[13px] text-ink-mute mb-2.5">
              Every AI node in the app and the model it runs on. Edit these in{" "}
              <code className="text-ink-soft">convex/ai/config.ts</code>.
            </div>
            <div className="flex flex-col gap-1.5">
              {(aiNodes ?? []).map((n) => (
                <div key={n.id} className="flex items-center justify-between text-[13px]">
                  <span className="text-ink flex items-center gap-2">
                    {n.label}
                    {!n.wired && (
                      <span className="text-[10px] uppercase tracking-wide text-ink-mute border border-line rounded px-1.5 py-0.5">
                        soon
                      </span>
                    )}
                  </span>
                  <span className="text-ink-mute font-mono text-[12px]">
                    {n.model} · {n.providerLabel}
                  </span>
                </div>
              ))}
            </div>
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
