"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { View } from "@/components/shell/Rail";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { snapshotErrors } from "@/lib/errorBuffer";
import { Mic, MicOff, Send, X, Check, Loader2 } from "lucide-react";

const POS_KEY = "lifeguide.feedback.pos"; // remembered vertical position (px from top)
const TYPE_KEY = "lifeguide.feedback.type";
const TAB_H = 132; // approx height of the docked tab, for clamping
const DEFAULT_TOP = 0.42; // fraction of viewport height

type FeedbackType = "bug" | "feature" | "other";
const TYPES: { key: FeedbackType; label: string }[] = [
  { key: "bug", label: "Bug" },
  { key: "feature", label: "Feature" },
  { key: "other", label: "Other" },
];

function clampTop(top: number): number {
  const max = window.innerHeight - TAB_H - 12;
  return Math.max(12, Math.min(top, Math.max(12, max)));
}

export function FeedbackWidget({ view }: { view: View }) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const submit = useMutation(api.feedback.submit);
  const speech = useSpeechRecognition();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(0);
  const [type, setType] = useState<FeedbackType>("bug");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const drag = useRef<{ startY: number; startTop: number; moved: boolean } | null>(null);

  // Restore position + last type after mount (effect, not render — avoids hydration mismatch).
  useEffect(() => {
    const savedPos = Number(window.localStorage.getItem(POS_KEY));
    const start = Number.isFinite(savedPos) && savedPos > 0 ? savedPos : window.innerHeight * DEFAULT_TOP;
    setTop(clampTop(start));
    const savedType = window.localStorage.getItem(TYPE_KEY) as FeedbackType | null;
    if (savedType && TYPES.some((t) => t.key === savedType)) setType(savedType);
    setMounted(true);
  }, []);

  // Keep the tab on-screen when the window shrinks.
  useEffect(() => {
    const onResize = () => setTop((t) => clampTop(t));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startTop: top, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 4) d.moved = true;
    if (d.moved) setTop(clampTop(d.startTop + dy));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) window.localStorage.setItem(POS_KEY, String(clampTop(top)));
    else setOpen(true); // a tap (no drag) opens the composer
  };

  const pickType = (t: FeedbackType) => {
    setType(t);
    window.localStorage.setItem(TYPE_KEY, t);
  };

  // Live dictation: while listening, show committed text + the live transcript.
  const liveText = speech.listening
    ? `${text} ${speech.finalText} ${speech.interim}`.replace(/\s+/g, " ").trimStart()
    : text;

  const toggleMic = () => {
    if (speech.listening) {
      const full = speech.stop();
      setText((t) => `${t} ${full}`.replace(/\s+/g, " ").trim());
      speech.reset();
    } else {
      speech.start();
    }
  };

  const uploadSnapshot = useCallback(async (): Promise<Id<"_storage"> | undefined> => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(document.body, {
        ignoreElements: (el) => el.hasAttribute?.("data-feedback-ignore"),
        logging: false,
        useCORS: true,
        backgroundColor: "#FAF8F2",
        scale: Math.min(window.devicePixelRatio || 1, 1.5),
        width: window.innerWidth,
        height: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) return undefined;
      const url = await generateUploadUrl();
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "image/png" }, body: blob });
      const { storageId } = (await r.json()) as { storageId: Id<"_storage"> };
      return storageId;
    } catch (e) {
      console.error("[feedback] snapshot failed", e);
      return undefined;
    }
  }, [generateUploadUrl]);

  const onSubmit = async () => {
    const body = liveText.trim();
    if (!body || submitting) return;
    if (speech.listening) speech.stop();
    setSubmitting(true);
    const errors = snapshotErrors();
    const shotId = await uploadSnapshot();
    try {
      await submit({
        type,
        text: body,
        route: window.location.pathname,
        view,
        title: document.title,
        viewport: { w: window.innerWidth, h: window.innerHeight },
        userAgent: navigator.userAgent,
        errors,
        shotId,
      });
      setText("");
      speech.reset();
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 1400);
    } catch (e) {
      console.error("[feedback] submit failed", e);
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    if (speech.listening) speech.stop();
    setOpen(false);
    setSent(false);
  };

  if (!mounted) return null;

  // Anchor the composer near the tab, clamped so a ~360px panel stays on-screen.
  const panelTop = Math.max(12, Math.min(top - 40, window.innerHeight - 380));

  return (
    // Hidden on mobile: a draggable right-edge tab collides with the bottom-bar
    // Coach sheet on small screens. Feedback stays a desktop affordance.
    <div data-feedback-ignore className="hidden md:block">
      {/* Docked tab — the resting state. Drag vertically; tap to open. */}
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ top }}
        className={`fixed right-0 z-[70] flex items-center justify-center bg-ink text-white rounded-l-xl shadow-lg select-none touch-none cursor-grab active:cursor-grabbing transition-[opacity,transform] hover:px-1 ${
          open ? "opacity-0 pointer-events-none translate-x-2" : "opacity-100"
        }`}
        title="Send feedback"
        aria-label="Send feedback"
      >
        <span className="[writing-mode:vertical-rl] rotate-180 py-3 px-1.5 text-[12.5px] tracking-wide font-medium">
          Feedback?
        </span>
      </button>

      {/* Composer */}
      <div
        style={{ top: panelTop }}
        className={`fixed right-4 w-[340px] max-w-[calc(100vw-32px)] bg-card border border-line rounded-2xl z-[71] shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          open ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 translate-x-4 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-line-2">
          <div className="text-ink font-semibold text-[15px]">Feedback</div>
          <button onClick={close} className="text-ink-mute hover:text-ink transition" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-ink-soft">
            <div className="w-9 h-9 rounded-full bg-green/15 text-green flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <div className="text-[14px]">Thanks. Noted.</div>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-3">
            {/* Type selector */}
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => pickType(t.key)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[13px] border transition ${
                    type === t.key
                      ? "bg-ink text-white border-ink"
                      : "border-line text-ink-soft hover:bg-paper-2"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Text / dictation */}
            <textarea
              value={liveText}
              readOnly={speech.listening}
              onChange={(e) => setText(e.target.value)}
              placeholder={speech.listening ? "Listening…" : "What's on your mind?"}
              rows={4}
              className="w-full resize-none bg-paper border border-line rounded-xl px-3 py-2.5 text-ink text-[14px] outline-none placeholder:text-ink-mute focus:border-ink-mute"
            />

            <div className="flex items-center gap-2">
              {speech.supported && (
                <button
                  onClick={toggleMic}
                  className={`rounded-xl px-3 py-2.5 border transition flex items-center justify-center ${
                    speech.listening
                      ? "bg-ink text-white border-ink"
                      : "border-line text-ink-soft hover:bg-paper-2"
                  }`}
                  title={speech.listening ? "Stop dictation" : "Dictate"}
                  aria-label={speech.listening ? "Stop dictation" : "Dictate"}
                >
                  {speech.listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={() => void onSubmit()}
                disabled={!liveText.trim() || submitting}
                className="flex-1 rounded-xl px-3 py-2.5 bg-ink text-white text-[14px] font-medium flex items-center justify-center gap-2 disabled:opacity-40 transition"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? "Sending…" : "Submit"}
              </button>
            </div>

            {speech.error === "not-allowed" && (
              <div className="text-[12px] text-ink-mute">Mic blocked. You can type instead.</div>
            )}
            <div className="text-[11.5px] text-ink-mute">
              Captures this page, its errors, and a snapshot.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
