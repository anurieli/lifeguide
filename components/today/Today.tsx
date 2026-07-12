"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Compass, Moon, Sun } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { View } from "@/components/shell/Rail";
import { filledCount } from "@/lib/levels";
import { activeRitual } from "@/lib/ritual";
import { VoiceField } from "@/components/voice/VoiceField";
import { RitualCard } from "@/components/today/RitualCard";
import { DayLog, MantraCard } from "@/components/today/DayLog";

const FIELD_CLASS =
  "w-full border border-line-2 rounded-xl p-3 pr-12 text-[14.5px] resize-none outline-none bg-paper text-ink placeholder:text-ink-mute focus:border-gold transition";

const AM_FIELD = {
  id: "today.one-move",
  question: "What's one small thing today that points at it?",
  descriptor: "It can be tiny. That's the point.",
  placeholder: "It can be tiny. That's the point.",
  intent: "extract a single concrete, doable action the person can take today",
};
const PM_FIELD = {
  id: "today.tonight",
  question: "What pulled at you today?",
  descriptor: "No score. No streak. Just set it down.",
  placeholder: "Say it however it comes out…",
  intent: "capture an honest, plain reflection on what tugged at them today",
};

const PILLAR_COLOR: Record<string, string> = {
  lifestyle: "#B8945A",
  health: "#4F7A4A",
  financial: "#3A5C86",
  family: "#5B4B7A",
  relationships: "#5B4B7A",
  growth: "#2F6E6A",
  money: "#B8945A",
  spirit: "#1E3A5F",
};
const PALETTE = ["#B8945A", "#4F7A4A", "#3A5C86", "#5B4B7A", "#2F6E6A", "#1E3A5F"];

function tagFor(name: string) {
  return name.toLowerCase().split(/[\s&]+/)[0];
}
function colorFor(name: string, i: number) {
  return PILLAR_COLOR[tagFor(name)] ?? PALETTE[i % PALETTE.length];
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Today({ onNavigate }: { onNavigate: (v: View) => void }) {
  const settings = useQuery(api.settings.get, {});
  const coreMap = useQuery(api.core.get, {});
  const mirror = useQuery(api.mirror.current, {});
  const pillars = useQuery(api.pillars.list, {});
  const surfaceId = useQuery(api.surfaces.firstForUser, {});
  const nodes = useQuery(api.nodes.list, surfaceId ? { surfaceId } : "skip");
  const log = useMutation(api.interactions.log);
  const update = useMutation(api.settings.update);

  // The tab the person lands on follows the time of day (cutoffs live in lib/ritual.ts).
  const [mode, setMode] = useState<"am" | "pm">(
    activeRitual(new Date()) === "morning" ? "am" : "pm",
  );
  const [amText, setAmText] = useState("");
  const [pmText, setPmText] = useState("");
  const [amSaved, setAmSaved] = useState(false);
  const [pmSaved, setPmSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const northStar = settings?.northStar ?? "";
  const bpCount =
    coreMap && typeof coreMap === "object" ? filledCount(coreMap as Record<string, string>) : 0;
  const bpLevel = settings?.level ?? 0;
  const bpComplete = settings?.blueprintStatus === "complete";
  const values = mirror?.structured.values ?? [];
  const themes = mirror?.structured.themes ?? [];
  const tags = [...values, ...themes];

  const countFor = (name: string) =>
    (nodes ?? []).filter((n) => n.pillars.includes(tagFor(name))).length;

  const tab = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-4 py-[7px] rounded-full text-[13px] transition ${active ? "bg-accent text-white" : "text-ink-mute"}`;

  return (
    <div
      className="h-full overflow-auto"
      style={{ background: "radial-gradient(900px 480px at 70% -10%, #FFFDF7, #FAF8F2)" }}
    >
      <div className="max-w-[680px] mx-auto px-5 py-8 md:px-8 md:py-14">
        {/* greeting */}
        <div className="text-[30px] font-semibold tracking-tight mb-1.5 text-ink">
          {mode === "am" ? `${greeting()}.` : "Before bed."}
        </div>
        <div className="text-ink-mute mb-7">
          {mode === "am"
            ? "Before the day pulls you anywhere, here is where you are headed."
            : "No score. No streak. Just a moment to set it down."}
        </div>

        {/* blueprint progress marker */}
        {settings !== undefined && (
          <div className="mb-6 inline-flex items-center gap-2.5 text-[12.5px] text-ink-mute bg-card border border-line rounded-full px-4 py-1.5">
            <span>Core: {bpCount}/18</span>
            <span className="text-line">|</span>
            <span>Level {bpLevel}</span>
            {!bpComplete && (
              <>
                <span className="text-line">|</span>
                <button onClick={() => onNavigate("core")} className="text-accent hover:underline">
                  continue &rarr;
                </button>
              </>
            )}
          </div>
        )}

        {/* north star — the compass */}
        <div className="bg-card border border-gold rounded-[18px] p-[24px] mb-[18px]">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase text-[#8A6A2E]">
              <Compass className="w-3.5 h-3.5" strokeWidth={2.2} />
              Your north star
            </div>
            {!editing && (
              <button
                onClick={() => {
                  setDraft(northStar);
                  setEditing(true);
                }}
                className="text-xs text-ink-mute hover:text-ink"
              >
                {northStar ? "edit" : "write it"}
              </button>
            )}
          </div>
          {editing ? (
            <div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                autoFocus
                placeholder="In your own words: the life you're moving toward…"
                className="w-full bg-paper border border-line rounded-xl p-3 text-[19px] font-medium leading-snug text-ink outline-none resize-none"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={async () => {
                    await update({ northStar: draft.trim() });
                    setEditing(false);
                  }}
                  className="bg-ink text-white rounded-lg px-4 py-2 text-sm"
                >
                  Save
                </button>
                <button onClick={() => setEditing(false)} className="text-ink-mute text-sm px-2">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[22px] font-semibold leading-snug text-ink">
              {northStar || (
                <span className="text-ink-mute font-normal text-[17px]">
                  Not named yet. When you&apos;re ready, write the life you&apos;re moving toward, or
                  ask your Coach to help you find the words.
                </span>
              )}
            </div>
          )}
        </div>

        {/* the day's ritual */}
        <div className="inline-flex bg-card border border-line rounded-full p-1 mb-4">
          <button className={tab(mode === "am")} onClick={() => setMode("am")}>
            <Sun className="w-3.5 h-3.5" strokeWidth={2.2} /> Morning
          </button>
          <button className={tab(mode === "pm")} onClick={() => setMode("pm")}>
            <Moon className="w-3.5 h-3.5" strokeWidth={2.2} /> Evening
          </button>
        </div>

        <RitualCard ritual={mode === "am" ? "morning" : "night"} />

        {mode === "am" ? (
          <div className="bg-card border border-line rounded-[18px] p-[22px] mb-[18px]">
            <div className="text-[11px] tracking-[0.16em] uppercase text-ink-mute mb-2.5">
              Today&apos;s one move
            </div>
            <div className="text-[17px] text-ink mb-3.5">
              What&apos;s one small thing today that points at it?
            </div>
            <VoiceField
              meta={AM_FIELD}
              value={amText}
              onChange={(v) => {
                setAmText(v);
                setAmSaved(false);
              }}
              rows={2}
              inputClassName={FIELD_CLASS}
            />
            <button
              onClick={async () => {
                await log({ type: "checkin_morning", payload: amText.trim() });
                setAmSaved(true);
              }}
              disabled={!amText.trim()}
              className="mt-3 bg-ink text-white rounded-xl px-5 py-2.5 text-sm disabled:opacity-40"
            >
              {amSaved ? "Saved ✓" : "Save"}
            </button>
          </div>
        ) : (
          <div className="bg-card border border-line rounded-[18px] p-[22px] mb-[18px]">
            <div className="text-[11px] tracking-[0.16em] uppercase text-ink-mute mb-2.5">Tonight</div>
            <div className="text-[17px] text-ink mb-3.5">What pulled at you today?</div>
            <VoiceField
              meta={PM_FIELD}
              value={pmText}
              onChange={(v) => {
                setPmText(v);
                setPmSaved(false);
              }}
              rows={3}
              inputClassName={FIELD_CLASS}
            />
            <button
              onClick={async () => {
                await log({ type: "checkin_evening", payload: pmText.trim() });
                setPmSaved(true);
              }}
              disabled={!pmText.trim()}
              className="mt-3 bg-ink text-white rounded-xl px-5 py-2.5 text-sm disabled:opacity-40"
            >
              {pmSaved ? "Saved ✓" : "Save & rest"}
            </button>
          </div>
        )}

        <MantraCard />

        <DayLog onJump={setMode} />

        {/* coach nudge */}
        <div className="flex gap-3 items-start text-ink-soft text-[15px] px-1 py-1.5 mb-10">
          <div className="w-[30px] h-[30px] rounded-full bg-coach flex items-center justify-center text-sm flex-shrink-0">
            🧭
          </div>
          <div>
            {mode === "am"
              ? "Capture what pulls at you on your board, and I will help you see the pattern below."
              : "I will fold tonight into what I know about you. Tomorrow I will know you a little better."}
          </div>
        </div>

        {/* who you're becoming */}
        <div className="border-t border-line pt-9">
          <div className="text-[12px] tracking-[0.18em] uppercase text-ink-mute mb-2">
            Who you&apos;re becoming
          </div>
          <p className="text-ink-mute text-[15px] mb-6">
            What we&apos;ve pieced together from what you&apos;ve put in. Not fixed. Read yourself
            back.
          </p>

          {/* mirror */}
          <div className="bg-coach text-coach-ink rounded-[18px] p-6 mb-7">
            <div className="text-[11px] tracking-[0.16em] uppercase text-gold mb-3">
              The Mirror · what I&apos;ve noticed
            </div>
            {tags.length > 0 ? (
              <div className="flex gap-2 flex-wrap mb-3.5">
                {tags.map((t) => (
                  <span key={t} className="bg-coach-soft px-3 py-1.5 rounded-full text-[13px]">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="text-[#C7CBD4] text-sm leading-relaxed">
              {mirror?.summary?.trim()
                ? mirror.summary
                : "I'm still learning who you are. Keep adding what pulls at you to your board, and check in here. The picture sharpens fast."}
            </p>
          </div>

          {/* pillars */}
          {(pillars ?? []).map((p, i) => (
            <div key={p._id} className="border-t border-line py-[22px]">
              <div className="flex items-center gap-2.5 mb-3">
                <i
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ background: colorFor(p.name, i) }}
                />
                <h3 className="text-[18px] text-ink">{p.name}</h3>
                <span className="text-xs text-ink-mute ml-auto">{countFor(p.name)} things</span>
              </div>
              {countFor(p.name) === 0 && (
                <div className="text-[14px] text-ink-mute">
                  Nothing tagged here yet. As you capture, ideas land under the pillars they touch.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
