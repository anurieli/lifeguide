"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { View } from "@/components/shell/Rail";
import { MessageCircle, Send } from "lucide-react";

type Msg = { role: "user" | "coach"; content: string };

const CTX: Record<View, string> = {
  today: "sees today · knows you",
  board: "sees your board · knows you",
  guide: "sees your Guide · knows you",
  settings: "knows you",
};

export function CoachDock({ view, surfaceId }: { view: View; surfaceId: Id<"surfaces"> }) {
  const ask = useAction(api.coach.ask);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "coach",
      content:
        "I'm here. I can see whatever surface you're on, and I know what we've built so far. Ask me anything, or tell me what's on your mind.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, thinking, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    const history = messages.slice(-8);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setThinking(true);
    try {
      const reply = await ask({ message: text, history, surfaceId });
      setMessages((m) => [...m, { role: "coach", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "coach", content: "I hit a snag reaching my thoughts just now. Try me again in a moment." },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      <div
        className={`fixed bottom-[92px] right-6 w-[380px] max-w-[calc(100vw-48px)] h-[72vh] max-h-[660px] bg-coach rounded-[18px] z-[61] shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          open
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

      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-coach text-white z-[60] shadow-xl flex items-center justify-center hover:scale-105 transition"
        title="Coach"
      >
        {!open && (
          <span className="absolute -inset-1 rounded-full border-2 border-gold opacity-50 animate-ping" />
        )}
        <MessageCircle className="w-[22px] h-[22px]" />
      </button>
    </>
  );
}
