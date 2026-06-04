"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { View } from "@/components/shell/Rail";
import { VoiceField } from "@/components/voice/VoiceField";

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

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Today({ onNavigate }: { onNavigate: (v: View) => void }) {
  const settings = useQuery(api.settings.get, {});
  const log = useMutation(api.interactions.log);
  const [mode, setMode] = useState<"am" | "pm">(new Date().getHours() < 17 ? "am" : "pm");
  const [amText, setAmText] = useState("");
  const [pmText, setPmText] = useState("");
  const [amSaved, setAmSaved] = useState(false);
  const [pmSaved, setPmSaved] = useState(false);

  const northStar = settings?.northStar;

  const tab = (active: boolean) =>
    `px-4 py-[7px] rounded-full text-[13px] transition ${active ? "bg-accent text-white" : "text-ink-mute"}`;

  return (
    <div
      className="h-full overflow-auto"
      style={{ background: "radial-gradient(900px 480px at 70% -10%, #FFFDF7, #FAF8F2)" }}
    >
      <div className="max-w-[620px] mx-auto px-8 py-16">
        <div className="inline-flex bg-card border border-line rounded-full p-1 mb-8">
          <button className={tab(mode === "am")} onClick={() => setMode("am")}>
            ☀️ Morning
          </button>
          <button className={tab(mode === "pm")} onClick={() => setMode("pm")}>
            🌙 Evening
          </button>
        </div>

        {mode === "am" ? (
          <>
            <div className="text-[30px] font-semibold tracking-tight mb-1.5 text-ink">
              {greeting()}.
            </div>
            <div className="text-ink-mute mb-7">
              Before the day pulls you anywhere, here is where you are headed.
            </div>

            <div className="bg-card border border-gold rounded-[18px] p-[22px] mb-[18px]">
              <div className="text-[11px] tracking-[0.16em] uppercase text-[#8A6A2E] mb-2">
                Your direction
              </div>
              <div className="text-[21px] font-semibold leading-snug text-ink">
                {northStar ||
                  "You have not named your north star yet. Open your Guide and we will write it together."}
              </div>
              {!northStar && (
                <button
                  onClick={() => onNavigate("guide")}
                  className="mt-3 text-sm text-accent font-medium hover:underline"
                >
                  Go to your Guide →
                </button>
              )}
            </div>

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
          </>
        ) : (
          <>
            <div className="text-[30px] font-semibold tracking-tight mb-1.5 text-ink">Before bed.</div>
            <div className="text-ink-mute mb-7">No score. No streak. Just a moment to set it down.</div>

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
          </>
        )}

        <div className="flex gap-3 items-start text-ink-soft text-[15px] px-1 py-1.5">
          <div className="w-[30px] h-[30px] rounded-full bg-coach flex items-center justify-center text-sm flex-shrink-0">
            🧭
          </div>
          <div>
            {mode === "am"
              ? "Capture what pulls at you on your board, and I will help you see the pattern in your Guide."
              : "I will fold tonight into what I know about you. Tomorrow I will know you a little better."}
          </div>
        </div>
      </div>
    </div>
  );
}
