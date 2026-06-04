"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BLUEPRINT, type Malleability } from "@/lib/blueprint";
import { ZenEditor, type ZenEditorHandle } from "./ZenEditor";
import { LayoutGrid, Mic, ChevronLeft, MessageSquare } from "lucide-react";

const DOT: Record<Malleability, string> = { green: "#4F7A4A", yellow: "#B8945A", red: "#B5524A" };

type FlatQ = {
  key: string;
  title: string;
  malleability: Malleability;
  description: string;
  example: string;
  sectionIndex: number;
  sectionTitle: string;
  firstOfSection: boolean;
};

function flatten(): FlatQ[] {
  const out: FlatQ[] = [];
  BLUEPRINT.forEach((s, si) =>
    s.questions.forEach((q, qi) =>
      out.push({
        key: q.key,
        title: q.title,
        malleability: q.malleability,
        description: q.description,
        example: q.example,
        sectionIndex: si,
        sectionTitle: s.title,
        firstOfSection: qi === 0,
      }),
    ),
  );
  return out;
}

export function ZenCore({
  onExit,
  onConversational,
}: {
  onExit: () => void;
  onConversational?: () => void;
}) {
  const stored = useQuery(api.core.get, {});
  const save = useMutation(api.core.save);
  const Q = useMemo(flatten, []);

  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [railOpen, setRailOpen] = useState(false);
  const [headerShown, setHeaderShown] = useState(false);
  const [listening, setListening] = useState(false);
  const [slide, setSlide] = useState<"none" | "up" | "down">("none");

  const editorRef = useRef<ZenEditorHandle>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ questionKey: string; content: string } | null>(null);

  // `answers` holds only this session's edits; the server value is the fallback.
  // The editor is remounted per question (keyed), so it reads the right value at
  // mount — which is why we gate the scene on `stored` having loaded (below).
  const val = (k: string) => answers[k] ?? stored?.[k] ?? "";

  const q = Q[cur];
  const answered = (k: string) => !!val(k).trim();
  const doneCount = Q.filter((x) => answered(x.key)).length;

  function flush() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (pending.current) {
      void save(pending.current);
      pending.current = null;
      setSaveState("saved");
    }
  }

  function onChange(md: string) {
    setAnswers((a) => ({ ...a, [q.key]: md }));
    pending.current = { questionKey: q.key, content: md };
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (pending.current) {
        void save(pending.current);
        pending.current = null;
        setSaveState("saved");
      }
    }, 600);
  }

  function nav(dir: number) {
    const ni = cur + dir;
    if (ni < 0 || ni >= Q.length) return;
    flush();
    setSlide(dir > 0 ? "up" : "down");
    setHeaderShown(false);
    setTimeout(() => {
      setCur(ni);
      setSlide("none");
    }, 80);
  }

  function jumpTo(i: number) {
    if (i === cur) return;
    flush();
    setCur(i);
  }

  // Scroll navigation (one question per gesture) + header reveal at the top.
  const acc = useRef(0);
  const cool = useRef(false);
  const topPull = useRef(0);
  function onWheel(e: React.WheelEvent) {
    if (railOpen) return; // let the expanded TOC panel scroll normally
    if (cool.current || slide !== "none") return;
    if (cur === 0 && e.deltaY < 0) {
      topPull.current += -e.deltaY;
      if (topPull.current > 28) setHeaderShown(true);
      return;
    }
    if (e.deltaY > 0) {
      topPull.current = 0;
      if (headerShown) setHeaderShown(false);
    }
    if ((acc.current > 0) !== (e.deltaY > 0)) acc.current = 0;
    acc.current += e.deltaY;
    // A discrete mouse-wheel notch (line-mode or any non-trivial delta) advances
    // immediately — one click, one question. Tiny high-res / trackpad deltas
    // accumulate to a low threshold. Short cooldown so fast notches aren't dropped.
    const notch = e.deltaMode !== 0 || Math.abs(e.deltaY) >= 16;
    if (notch || Math.abs(acc.current) > 8) {
      const dir = (notch ? e.deltaY : acc.current) > 0 ? 1 : -1;
      acc.current = 0;
      cool.current = true;
      nav(dir);
      setTimeout(() => (cool.current = false), 80);
    }
  }

  // Voice "speak": lightweight Web Speech dictation, appended into the field.
  const recog = useRef<any>(null);
  function toggleSpeak() {
    const SR =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) {
      alert("Voice input isn't supported in this browser yet.");
      return;
    }
    if (listening) {
      recog.current?.stop();
      setListening(false);
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = false;
    r.continuous = true;
    r.onresult = (ev: any) => {
      let text = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) text += ev.results[i][0].transcript;
      }
      if (text) editorRef.current?.insertText(text.trim() + " ");
    };
    r.onend = () => setListening(false);
    r.start();
    recog.current = r;
    setListening(true);
  }

  useEffect(() => () => flush(), []); // flush on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Wait for the server values before mounting the (keyed) editor, so the first
  // question shows its saved answer rather than an empty field.
  if (stored === undefined) {
    return <div className="h-full bg-paper" />;
  }

  return (
    <div className="relative h-full bg-paper overflow-hidden" onWheel={onWheel}>
      {/* Header — revealed by scrolling up at the first question */}
      <div
        className={`absolute top-0 left-0 right-0 h-[54px] z-30 flex items-center justify-between px-6 bg-card border-b border-line transition-transform duration-300 ${
          headerShown ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="text-ink font-semibold tracking-tight flex items-center gap-2">
          <span className="text-gold">◆</span> Core
        </div>
        <div className="text-[12.5px] text-ink-mute tracking-wide">
          {doneCount} / {Q.length} answered
        </div>
        <button
          onClick={onExit}
          className="text-[12.5px] text-ink-mute hover:text-ink flex items-center gap-1.5 transition"
        >
          <LayoutGrid className="w-4 h-4" /> Grid
        </button>
      </div>

      {/* Subliminal exit — always faintly present in the corner; brightens on
          hover. Hidden while the full header is showing, so the two never
          double up. Calm, never bombarding. */}
      <button
        onClick={onExit}
        className={`absolute top-4 right-6 z-20 text-[10.5px] tracking-[0.22em] uppercase text-ink-mute transition-all duration-500 hover:text-ink hover:opacity-100 ${
          headerShown ? "opacity-0 pointer-events-none" : "opacity-30"
        }`}
      >
        Exit Zen
      </button>

      <div className="flex h-full">
        {/* Timeline rail → expands into the Core table of contents on hover */}
        <div
          onMouseEnter={() => setRailOpen(true)}
          onMouseLeave={() => setRailOpen(false)}
          className={`relative flex-shrink-0 h-full border-r transition-all duration-300 ${
            railOpen ? "w-[230px] bg-card border-line" : "w-[78px] border-transparent"
          }`}
        >
          {/* bare ticks */}
          <div
            className={`absolute inset-0 flex flex-col items-start justify-center pl-7 transition-opacity duration-200 ${
              railOpen ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            {Q.map((qq, i) => {
              const dist = Math.abs(i - cur);
              const isCur = i === cur;
              const width = Math.max(9, 34 - dist * 5);
              const opacity = isCur ? 1 : answered(qq.key) ? 0.78 : Math.max(0.12, 0.46 - dist * 0.07);
              return (
                <div key={qq.key} style={{ marginTop: qq.firstOfSection && i !== 0 ? 14 : 0 }}>
                  <div className="flex items-center h-[18px]">
                    {isCur && <span className="w-[5px] h-[5px] rounded-full bg-ink -ml-3 mr-[7px]" />}
                    <div
                      className="rounded-full bg-ink transition-all duration-300"
                      style={{ width, height: isCur ? 4 : 2, opacity }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* expanded TOC */}
          <div
            className={`absolute inset-0 flex flex-col transition-opacity duration-200 ${
              railOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* rail header — the way back out of Zen */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-line flex-shrink-0">
              <span className="text-ink font-semibold tracking-tight flex items-center gap-2 text-[14px]">
                <span className="text-gold">◆</span> Core
              </span>
              <div className="flex items-center gap-3">
                {onConversational && (
                  <button
                    onClick={onConversational}
                    className="text-[11.5px] text-ink-mute hover:text-ink flex items-center gap-1 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Talk
                  </button>
                )}
                <button
                  onClick={onExit}
                  className="text-[11.5px] text-ink-mute hover:text-ink flex items-center gap-1 transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Exit Zen
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
            {BLUEPRINT.map((s, si) => (
              <div key={s.title} className="mb-3">
                <div className="text-[10.5px] tracking-[0.18em] uppercase text-ink-mute px-6 mb-1.5">
                  {s.title}
                </div>
                {s.questions.map((qq) => {
                  const gi = Q.findIndex((x) => x.key === qq.key);
                  const isCur = gi === cur;
                  return (
                    <button
                      key={qq.key}
                      onClick={() => jumpTo(gi)}
                      className={`block w-full text-left text-[13px] px-6 py-[5px] truncate transition ${
                        isCur
                          ? "text-ink border-l-2 border-ink"
                          : answered(qq.key)
                            ? "text-ink-soft hover:text-ink"
                            : "text-ink-mute hover:text-ink-soft"
                      }`}
                    >
                      {qq.title}
                    </button>
                  );
                })}
              </div>
            ))}
            </div>
          </div>
        </div>

        {/* Scene */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-[9%]">
          {/* previous */}
          <div
            className="absolute top-[9%] left-0 right-0 text-center text-ink-mute italic text-[15px] transition-opacity"
            style={{ opacity: cur > 0 ? 1 : 0 }}
          >
            {cur > 0 ? Q[cur - 1].title : ""}
          </div>

          <div
            className="w-full max-w-[600px] text-center transition-all duration-150"
            style={{
              opacity: slide === "none" ? 1 : 0,
              transform:
                slide === "up" ? "translateY(-14px)" : slide === "down" ? "translateY(14px)" : "none",
            }}
          >
            <div className="text-[11.5px] tracking-[0.22em] uppercase text-ink-mute mb-3.5 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: DOT[q.malleability] }} />
              Section {q.sectionIndex + 1} · {q.sectionTitle} · {cur + 1} / {Q.length}
            </div>
            <h1
              className="text-[31px] leading-[1.22] text-ink"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {q.title}
            </h1>
            {q.description && (
              <p className="text-[15px] text-ink-soft max-w-[460px] mx-auto mt-3 leading-relaxed whitespace-pre-wrap line-clamp-3">
                {q.description}
              </p>
            )}

            <div className="mt-7 max-w-[560px] mx-auto w-full text-left">
              <ZenEditor
                key={q.key}
                ref={editorRef}
                value={val(q.key)}
                placeholder="start writing…"
                onChange={onChange}
                onNext={() => nav(1)}
                onPrev={() => nav(-1)}
              />
              <div className="flex items-center justify-between mt-2.5 h-[18px]">
                <span className="text-[11.5px] text-ink-mute tracking-wide">
                  {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : " "}
                </span>
                <button
                  onClick={toggleSpeak}
                  className={`text-[12.5px] flex items-center gap-1.5 transition ${
                    listening ? "text-[#B5524A]" : "text-ink-mute hover:text-ink"
                  }`}
                >
                  {listening ? (
                    <span className="w-[7px] h-[7px] rounded-full bg-[#B5524A] animate-pulse" />
                  ) : (
                    <Mic className="w-[14px] h-[14px]" />
                  )}
                  {listening ? "listening…" : "speak"}
                </button>
              </div>
            </div>
          </div>

          {/* next */}
          <div
            className="absolute bottom-[9%] left-0 right-0 text-center text-ink-mute italic text-[15px] transition-opacity"
            style={{ opacity: cur < Q.length - 1 ? 1 : 0 }}
          >
            {cur < Q.length - 1 ? Q[cur + 1].title : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
