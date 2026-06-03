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
  const update = useMutation(api.settings.update);
  const addPillar = useMutation(api.pillars.add);
  const { signOut } = useAuthActions();
  const [modal, setModal] = useState(false);
  const [custom, setCustom] = useState("");

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

        <Group label="Yours alone">
          <Row title="Your data is yours" desc="Private by default. Sign out anytime.">
            <button
              onClick={() => void signOut()}
              className="border border-line rounded-lg px-4 py-2 text-sm text-ink-soft hover:bg-paper-2 transition"
            >
              Sign out
            </button>
          </Row>
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
