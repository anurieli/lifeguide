"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { View } from "@/components/shell/Rail";
import { MessageCircle, Send } from "lucide-react";
import { CoachOrb } from "./CoachOrb";

const WELCOME =
  "I'm here. I can see whatever surface you're on, and I know what we've built so far. Ask me anything, or tell me what's on your mind.";

const CTX: Record<View, string> = {
  today: "sees today · knows you",
  core: "sees your Core · knows you",
  board: "sees your board · knows you",
  goals: "sees your goals · knows you",
  sessions: "sees your thoughts · knows you",
  settings: "knows you",
};

export function CoachDock({
  view,
  surfaceId,
  open,
  onToggle,
  stepAside = false,
}: {
  view: View;
  surfaceId: Id<"surfaces">;
  open: boolean;
  onToggle: () => void;
  /** A surface that is pure capture (the open thought document) sets this; the
      whole dock — buttons and panel — yields until the person leaves. */
  stepAside?: boolean;
}) {
  const ask = useAction(api.coach.ask);
  // Persisted, reactive history. The user turn appears the instant the action commits it,
  // and the reply follows when the model returns. A static welcome shows before any chat exists.
  const stored = useQuery(api.messages.list, {});
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [errored, setErrored] = useState(false);
  // The orb owns the corner while a call is anywhere past idle; the small
  // "type instead" button steps back so the live orb has the space to itself.
  const [orbBusy, setOrbBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const messages =
    stored && stored.length > 0
      ? stored.map((m) => ({ role: m.role, content: m.content }))
      : [{ role: "coach" as const, content: WELCOME }];

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [stored, thinking, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    setThinking(true);
    setErrored(false);
    try {
      await ask({ message: text, surfaceId });
    } catch {
      setErrored(true);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      <div
        className={`fixed z-[61] bg-coach shadow-2xl flex flex-col overflow-hidden transition-all duration-200 inset-x-0 bottom-[64px] h-[80dvh] rounded-t-[18px] md:inset-x-auto md:bottom-[92px] md:right-6 md:w-[380px] md:max-w-[calc(100vw-48px)] md:h-[72vh] md:max-h-[660px] md:rounded-[18px] ${
          open && !stepAside
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="p-4 border-b border-coach-soft flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-[#8A6A2E] flex items-center justify-center text-sm">
            🧭
          </div>
          <div>
            <div className="text-coach-ink font-semibold text-[15px]">Coach</div>
            <div className="text-coach-mute text-[11.5px]">{CTX[view]}</div>
          </div>
        </div>

        <div ref={bodyRef} className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[86%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "coach"
                  ? "bg-coach-soft text-coach-ink self-start rounded-bl-sm"
                  : "bg-gold text-[#231a08] self-end rounded-br-sm font-medium"
              }`}
            >
              {m.content}
            </div>
          ))}
          {thinking && (
            <div className="self-start text-coach-mute text-[13px] italic px-1.5 py-1">
              Coach is thinking…
            </div>
          )}
          {errored && (
            <div className="self-start text-coach-mute text-[13px] italic px-1.5 py-1">
              I hit a snag reaching my thoughts just now. Try me again in a moment.
            </div>
          )}
        </div>

        <div className="p-3.5 border-t border-coach-soft flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
            placeholder="Talk to your Coach…"
            className="flex-1 bg-coach-soft rounded-xl px-3.5 py-2.5 text-coach-ink text-sm outline-none placeholder:text-coach-mute"
          />
          <button
            onClick={() => void send()}
            className="bg-gold text-[#231a08] rounded-xl px-3.5 font-semibold flex items-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* The corner row: the chat toggle sits right beside a small "Talk to
          Coach" pill (Ariel, 2026-07-20) — the call happens in place, no window.
          Desktop-only (hidden below `md`), so on a phone the tour's Coach step
          (anchored on the pill's data-tour="tour-coach") falls back to a
          centered card — see components/tour/useTourTarget.ts. CoachOrb handles
          stepAside itself so a live call survives opening a thought document,
          and its live/report/error states break out of the row with their own
          fixed positioning. */}
      <div className="hidden md:flex fixed bottom-6 right-6 z-[75] items-center gap-2">
        {!stepAside && !orbBusy && (
          <button
            onClick={onToggle}
            className="w-9 h-9 rounded-full bg-card border border-line text-ink-soft shadow-md flex items-center justify-center hover:border-gold transition"
            title={open ? "Close chat" : "Type instead"}
          >
            <MessageCircle className="w-[17px] h-[17px]" />
          </button>
        )}
        <CoachOrb stepAside={stepAside} onBusyChange={setOrbBusy} />
      </div>
    </>
  );
}
