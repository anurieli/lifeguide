"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { View } from "@/components/shell/Rail";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { snapshotErrors } from "@/lib/errorBuffer";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Mic, MicOff, Send, X, Check, Loader2, ImagePlus, MessageSquarePlus } from "lucide-react";

const POS_KEY = "lifeguide.feedback.pos"; // remembered vertical position (px from top)
const TYPE_KEY = "lifeguide.feedback.type";
const TAB_H = 132; // approx height of the docked tab, for clamping
const DEFAULT_TOP = 0.42; // fraction of viewport height
const MAX_IMAGES = 4; // attached photos per submission

type FeedbackType = "bug" | "feature" | "other";
const TYPES: { key: FeedbackType; label: string }[] = [
  { key: "bug", label: "Bug" },
  { key: "feature", label: "Feature" },
  { key: "other", label: "Other" },
];

type Attached = { file: File; url: string }; // url is an object URL for the thumbnail

function clampTop(top: number): number {
  const max = window.innerHeight - TAB_H - 12;
  return Math.max(12, Math.min(top, Math.max(12, max)));
}

export function FeedbackWidget({ view, coachOpen = false }: { view: View; coachOpen?: boolean }) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const submit = useMutation(api.feedback.submit);
  const speech = useSpeechRecognition();
  const isMobile = useIsMobile();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(0);
  const [type, setType] = useState<FeedbackType>("bug");
  const [text, setText] = useState("");
  const [images, setImages] = useState<Attached[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const drag = useRef<{ startY: number; startTop: number; moved: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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

  const addImages = (files: Iterable<File>) => {
    setImages((prev) => {
      const next = [...prev];
      for (const f of files) {
        if (!f.type.startsWith("image/")) continue;
        if (next.length >= MAX_IMAGES) break;
        next.push({ file: f, url: URL.createObjectURL(f) });
      }
      return next;
    });
  };

  // Paste a photo (screenshot, camera roll) straight into the note.
  const onPaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    e.preventDefault();
    addImages(files);
  };

  const removeImage = (i: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const uploadBlob = useCallback(
    async (blob: Blob, contentType: string): Promise<Id<"_storage">> => {
      const url = await generateUploadUrl();
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": contentType }, body: blob });
      const { storageId } = (await r.json()) as { storageId: Id<"_storage"> };
      return storageId;
    },
    [generateUploadUrl],
  );

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
      return await uploadBlob(blob, "image/png");
    } catch (e) {
      console.error("[feedback] snapshot failed", e);
      return undefined;
    }
  }, [uploadBlob]);

  // Attached photos upload independently: one failing doesn't sink the rest.
  const uploadImages = useCallback(async (): Promise<Id<"_storage">[]> => {
    const ids: Id<"_storage">[] = [];
    for (const img of images) {
      try {
        ids.push(await uploadBlob(img.file, img.file.type || "image/png"));
      } catch (e) {
        console.error("[feedback] photo upload failed", e);
      }
    }
    return ids;
  }, [images, uploadBlob]);

  const onSubmit = async () => {
    const body = liveText.trim();
    if (!body || submitting) return;
    if (speech.listening) speech.stop();
    setSubmitting(true);
    const errors = snapshotErrors();
    const shotId = await uploadSnapshot();
    const imageIds = await uploadImages();
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
        imageIds: imageIds.length > 0 ? imageIds : undefined,
      });
      setText("");
      images.forEach((img) => URL.revokeObjectURL(img.url));
      setImages([]);
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
  // On mobile the composer is bottom-anchored instead (above the bottom bar).
  const panelTop = Math.max(12, Math.min(top - 40, window.innerHeight - 380));

  return (
    // On mobile the whole widget yields while the Coach sheet is open — the sheet
    // is full-width there and a floating right-edge tab would sit on top of it.
    <div data-feedback-ignore className={coachOpen ? "max-md:hidden" : ""}>
      {/* Docked tab — the resting state. Drag vertically; tap to open. On mobile
          it shrinks to a slim icon-only nub against the right edge. */}
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
        <span className="hidden md:block [writing-mode:vertical-rl] rotate-180 py-3 px-1.5 text-[12.5px] tracking-wide font-medium">
          Feedback?
        </span>
        <MessageSquarePlus className="md:hidden w-4 h-4 my-2.5 mx-1.5 pointer-events-none" />
      </button>

      {/* Composer */}
      <div
        style={isMobile ? undefined : { top: panelTop }}
        className={`fixed right-4 w-[340px] max-w-[calc(100vw-32px)] max-md:right-3 max-md:bottom-[calc(76px+env(safe-area-inset-bottom))] bg-card border border-line rounded-2xl z-[71] shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
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

            {/* Text / dictation. Pasting an image here attaches it as a photo. */}
            <textarea
              value={liveText}
              readOnly={speech.listening}
              onChange={(e) => setText(e.target.value)}
              onPaste={onPaste}
              placeholder={speech.listening ? "Listening…" : "What's on your mind?"}
              rows={4}
              className="w-full resize-none bg-paper border border-line rounded-xl px-3 py-2.5 text-ink text-[14px] outline-none placeholder:text-ink-mute focus:border-ink-mute"
            />

            {/* Attached photos */}
            {images.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {images.map((img, i) => (
                  <div key={img.url} className="relative w-12 h-12 rounded-lg border border-line overflow-hidden bg-paper-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={`attached photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center bg-ink/70 text-white rounded-bl-md"
                      aria-label="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

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
                onClick={() => fileInput.current?.click()}
                disabled={images.length >= MAX_IMAGES}
                className="rounded-xl px-3 py-2.5 border border-line text-ink-soft hover:bg-paper-2 transition flex items-center justify-center disabled:opacity-40"
                title="Attach photos"
                aria-label="Attach photos"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addImages(e.target.files);
                  e.target.value = ""; // allow re-picking the same file
                }}
              />
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
              Captures this page, its errors, and a snapshot. Paste or attach photos to include them.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
