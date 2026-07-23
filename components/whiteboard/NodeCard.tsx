"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NodeDoc } from "@/lib/types";
import { SelectionMods, cardPointerIntent, isEditableElement } from "@/lib/selection";
import { ImagePlus, FileText, Loader2, Sparkles, RotateCcw } from "lucide-react";
import { DocPreview } from "./DocPreview";
import { generatedImageState, redoPromptFor } from "@/lib/generatedImage";

type Props = {
  node: NodeDoc;
  scale: number;
  autoFocus: boolean;
  selected: boolean;
  /**
   * This card is selected AND it is the only selected card. When true, a press on
   * the card's own interactive content (its textarea or link)
   * is handed to the browser natively (caret / highlight / follow), instead of
   * starting a card drag. In a multi-selection this is false so a press still
   * drags the whole group. See `cardPointerIntent`.
   */
  soleSelected: boolean;
  /**
   * Parent-controlled render position. When provided it overrides node.position
   * — used for the live drag offset and for optimistic post-commit placement so
   * grouped cards move together without flicker. null → render at node.position.
   */
  posOverride?: { x: number; y: number } | null;
  /** Pointer-down on the card. The Whiteboard decides selection + drag group. */
  onPointerDownNode: (mods: SelectionMods) => void;
  /** World-space delta during a drag (parent applies it to the whole group). */
  onDragDelta: (dx: number, dy: number) => void;
  /** Drag finished; `moved` is false for a plain click. */
  onDragEnd: (moved: boolean) => void;
  /** Start this card in AI image-prompt mode (right-click "Generate with AI"). */
  startAiMode?: boolean;
  /** AI mode was dismissed; lets the parent forget the one-shot startAiMode flag. */
  onClearAiMode?: () => void;
  /** Submit an AI image prompt — the parent morphs this card into a generating image. */
  onGenerateImage: (prompt: string) => void;
  /** Called when the user drags the resize handle (debounced 300ms before persisting). */
  onResize?: (w: number, h: number) => void;
  onText: (t: string) => void;
  onDelete: () => void;
  onStartLink: () => void;
  onCompleteLink: () => void;
  onUploadImage: (file: File) => void;
  onMorphLink: (url: string) => void;
  linking: boolean;
};

// A drag is only a "move" once the pointer travels past this screen-space
// threshold; below it the gesture is treated as a click (so selection sticks).
const DRAG_THRESHOLD_PX = 3;

// Text/quote cards are content-sized: their height always fits what's typed so
// the text never scrolls inside a fixed frame. Width stays as stored; height
// floors here so a near-empty card still feels like a card.
const MIN_TEXT_HEIGHT = 80;

const modsFrom = (e: React.PointerEvent): SelectionMods => ({
  shift: e.shiftKey,
  meta: e.metaKey || e.ctrlKey,
});

const URL_RE = /^https?:\/\/\S+$/i;

export function NodeCard({
  node,
  scale,
  autoFocus,
  selected,
  soleSelected,
  posOverride,
  onPointerDownNode,
  onDragDelta,
  onDragEnd,
  startAiMode,
  onClearAiMode,
  onGenerateImage,
  onResize,
  onText,
  onDelete,
  onStartLink,
  onCompleteLink,
  onUploadImage,
  onMorphLink,
  linking,
}: Props) {
  // Drag is driven here (pointer capture lives on the card) but the resulting
  // position is owned by the Whiteboard so a whole selection moves together.
  const drag = useRef<{ mx: number; my: number; moved: boolean } | null>(null);
  // Gesture-local flag: true when the current press took the card path (select/drag)
  // on interactive content, so the native click that follows must be suppressed
  // (a first click that only selected the card must never follow a link). A ref, not
  // the `soleSelected` prop, because selection can rerender between pointerdown and
  // click and a prop read at click time would leak a navigation through.
  const suppressContentClick = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [dragging, setDragging] = useState(false);
  const pos = posOverride ?? node.position;

  // AI image-prompt mode: a text card the person is dictating an image into. Entered
  // by typing "/" then space inside an empty card, or by the right-click "Generate"
  // action (startAiMode). Submitting hands the prompt up; the parent morphs this same
  // card into a generating image, so the AI UI is replaced by the spinner render.
  const [aiMode, setAiMode] = useState(!!startAiMode);
  const [aiPrompt, setAiPrompt] = useState("");
  const aiRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (startAiMode) setAiMode(true);
  }, [startAiMode]);
  useEffect(() => {
    if (aiMode) aiRef.current?.focus();
  }, [aiMode]);

  // Open AI mode with the prompt seeded. Used by Redo / Edit-prompt on a
  // generated_image so the person edits the original prompt rather than a blank.
  const enterAiMode = (initial: string) => {
    setAiPrompt(initial);
    setAiMode(true);
  };

  const submitAi = () => {
    const p = aiPrompt.trim();
    if (!p) return;
    setAiMode(false);
    setAiPrompt("");
    onClearAiMode?.();
    onGenerateImage(p);
  };
  const exitAi = () => {
    setAiMode(false);
    setAiPrompt("");
    onClearAiMode?.();
  };
  // Inside an empty text card, "/" then space drops into AI mode (the slash is eaten).
  const onTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === " " && e.currentTarget.value === "/") {
      e.preventDefault();
      e.currentTarget.value = "";
      setAiMode(true);
    }
  };

  // Optimistic local dimensions for the resize handle in DocPreview.
  // Debounces the persist call so we don't fire a mutation on every pointer move.
  const [localDims, setLocalDims] = useState<{ width: number; height: number } | null>(null);
  const dims = localDims ?? node.dimensions;
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleResize = useCallback(
    (w: number, h: number) => {
      setLocalDims({ width: w, height: h });
      if (!onResize) return; // no-op when the integrator hasn't wired up persist yet
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => {
        onResize(w, h);
        resizeTimerRef.current = null;
      }, 300);
    },
    [onResize],
  );

  // Keep localDims in sync once the persisted value catches up.
  useEffect(() => {
    if (
      localDims &&
      node.dimensions.width === localDims.width &&
      node.dimensions.height === localDims.height
    ) {
      setLocalDims(null);
    }
  }, [node.dimensions.width, node.dimensions.height, localDims]);

  useEffect(() => {
    if (autoFocus) taRef.current?.focus();
  }, [autoFocus]);

  const isTextual = node.type === "text" || node.type === "quote";
  const isGeneratedImage = node.type === "generated_image";

  // Grow (or shrink) the card to exactly fit the textarea's content so text
  // never scrolls inside a fixed frame. Measures at auto-height, then floors to
  // MIN_TEXT_HEIGHT and persists through the same debounced resize path.
  const autosizeText = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const needed = Math.max(MIN_TEXT_HEIGHT, ta.scrollHeight);
    ta.style.height = ""; // revert to the h-full class; the card frame drives height
    if (Math.abs(needed - dims.height) > 1) handleResize(dims.width, needed);
  }, [dims.width, dims.height, handleResize]);

  // Fit on mount and whenever the persisted text changes from elsewhere
  // (e.g. distillation writing back into the card).
  useEffect(() => {
    if (isTextual) autosizeText();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.text, isTextual]);

  const fileUrl = useQuery(
    api.files.getUrl,
    node.fileId && !node.imageUrl ? { fileId: node.fileId } : "skip",
  );
  const img = node.imageUrl ?? fileUrl ?? undefined;

  const down = (e: React.PointerEvent) => {
    const mods = modsFrom(e);
    // Interactive native content is marked `data-node-content` (the textarea or a
    // link's <a>). The sole-selected card yields those to the
    // browser; everything else drives the card's own select/drag gesture.
    const onContent = !!(e.target as HTMLElement).closest("[data-node-content]");
    const intent = cardPointerIntent({ soleSelected, onInteractiveContent: onContent, mods });

    if (intent === "content") {
      // Select-first, interact-second: the card is already the sole selection and
      // the press landed on its own content, so let the browser place the caret,
      // highlight text, or follow the link natively. We only stop the gesture from
      // reaching the background (marquee/pan): no pointer capture and no
      // preventDefault, or native text selection wouldn't work.
      suppressContentClick.current = false; // let the ensuing native click through
      e.stopPropagation();
      return;
    }

    // Card gesture. Selecting this card must move keyboard focus off whatever
    // editable was being edited on another card, BEFORE we preventDefault below and
    // suppress the native focus change. Otherwise the old textarea keeps focus, its
    // onBlur never persists, and board shortcuts (Command+Backspace) keep targeting
    // it and read as "editing", so the delete is silently suppressed. Not done on the
    // content path (it returned above), which must keep caret placement/highlighting.
    const active = typeof document !== "undefined" ? document.activeElement : null;
    if (active && isEditableElement(active as HTMLElement)) {
      (active as HTMLElement).blur();
    }
    // Tell the board about the click (it owns selection + drag group),
    // and never let it fall through to the background marquee/pan.
    onPointerDownNode(mods);
    e.stopPropagation();
    // On an unselected card (or any card inside a group) a press-drag must move the
    // card, so suppress the browser's native caret / image-ghost on the content, and
    // suppress the click that follows so a first click never navigates or downloads.
    // Interacting inside only happens once the card is the sole selection (above).
    suppressContentClick.current = onContent;
    if (onContent) e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    drag.current = { mx: e.clientX, my: e.clientY, moved: false };
  };
  const move = (e: React.PointerEvent) => {
    if (!dragging || !drag.current) return;
    const dx = e.clientX - drag.current.mx;
    const dy = e.clientY - drag.current.my;
    if (!drag.current.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD_PX) return;
    drag.current.moved = true;
    onDragDelta(dx / scale, dy / scale); // world-space delta for the whole group
  };
  const up = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    // A completed click (no move) selects the card; it does not force editing.
    // Dropping into a text card's caret/highlight is a *second* press on the
    // now-sole-selected card, handled natively by the content branch in `down`.
    if (dragging) onDragEnd(drag.current?.moved ?? false);
    setDragging(false);
    drag.current = null;
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const cd = e.clipboardData;
    if (!cd) return;
    for (const item of cd.items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          onUploadImage(file);
          return;
        }
      }
    }
    const text = cd.getData("text").trim();
    if (URL_RE.test(text) && !(node.text ?? "").trim()) {
      e.preventDefault();
      onMorphLink(text);
    }
  };

  const onBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.trim();
    if (URL_RE.test(val)) {
      onMorphLink(val);
      return;
    }
    if (e.target.value !== node.text) onText(e.target.value);
  };

  const isQuote = node.type === "quote";
  const isEmptyText = (node.type === "text" || node.type === "quote") && !(node.text ?? "").trim();

  return (
    <div
      className={`absolute group rounded-xl bg-card shadow-sm transition-shadow hover:shadow-md ${
        isQuote ? "border-l-[3px] border-l-gold border-y border-r border-line" : "border border-line"
      } ${selected ? "ring-2 ring-[#3b82f6] ring-offset-1 ring-offset-paper" : ""}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: dims.width,
        height: dims.height,
        cursor: dragging ? "grabbing" : "grab",
      }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
    >
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onDelete}
        // Counter-scale by 1/scale so the control keeps a constant screen size at
        // any zoom; anchored to the card's top-right corner (8px out, in screen px).
        style={{ transform: `translate(8px, -8px) scale(${1 / scale})`, transformOrigin: "100% 0%" }}
        className="absolute top-0 right-0 w-5 h-5 rounded-full bg-ink text-paper text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title="Delete"
      >
        ×
      </button>

      {node.type === "image" && img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" className="w-full h-full object-cover rounded-xl" draggable={false} />
      )}

      {(node.type === "text" || node.type === "quote") && !aiMode && (
        <textarea
          ref={taRef}
          data-node-content
          defaultValue={node.text ?? ""}
          onBlur={onBlur}
          onInput={autosizeText}
          onPaste={onPaste}
          onKeyDown={onTextKeyDown}
          placeholder={isQuote ? "A quote that hit you…" : "Type, paste, drop a link, or / for AI…"}
          // Text cursor only while it is actually interactive (the sole selection);
          // otherwise match the card so an unselected card still reads as draggable.
          style={{ cursor: soleSelected ? "text" : dragging ? "grabbing" : "grab" }}
          className={`w-full h-full p-3 bg-transparent resize-none outline-none text-sm text-ink placeholder:text-ink-mute ${
            isQuote ? "italic" : ""
          }`}
        />
      )}

      {aiMode && (
        // The image prompt editor. A blank text card enters this to compose a new
        // image; a finished (or failed) generated_image re-enters it via Redo /
        // Edit prompt with the original prompt seeded, and regenerates in place.
        <div className="flex flex-col h-full p-2.5 gap-2 rounded-xl bg-card" onPointerDown={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#7c3aed]">
            <Sparkles className="w-3.5 h-3.5" />
            {isGeneratedImage ? "Edit prompt & regenerate" : "Generate with AI"}
          </div>
          <textarea
            ref={aiRef}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitAi();
              } else if (e.key === "Escape") {
                e.preventDefault();
                exitAi();
              }
            }}
            placeholder="Describe an image to generate, then press Enter…"
            className="flex-1 w-full bg-transparent resize-none outline-none text-sm text-ink placeholder:text-ink-mute"
          />
          <div className="flex items-center justify-between">
            <button onClick={exitAi} className="text-xs text-ink-mute hover:text-ink transition">
              Cancel
            </button>
            <button
              onClick={submitAi}
              disabled={!aiPrompt.trim()}
              className="text-xs px-2.5 py-1 rounded-md bg-[#7c3aed] text-white disabled:opacity-40 transition"
            >
              {isGeneratedImage ? "Regenerate" : "Generate"}
            </button>
          </div>
        </div>
      )}

      {node.type === "link" && (
        <a
          href={node.attribution ?? "#"}
          target="_blank"
          rel="noreferrer"
          data-node-content
          onClick={(e) => {
            // Follow the link only when this press was the content gesture. A first
            // click that merely selected the card suppresses navigation, keyed off
            // the gesture-local flag so a rerender of `soleSelected` mid-gesture
            // can't leak a navigation through (select-first, interact-second).
            if (suppressContentClick.current) {
              e.preventDefault();
              suppressContentClick.current = false;
            }
          }}
          className="block p-3 text-sm h-full overflow-hidden"
        >
          {node.title && <div className="font-medium text-ink">{node.title}</div>}
          <div className="text-accent break-words">{node.text ?? node.attribution}</div>
          {node.attribution && (
            <div className="text-ink-mute text-xs mt-1 truncate">{node.attribution}</div>
          )}
        </a>
      )}

      {node.type === "file" && fileUrl && (
        // DocPreview handles all mime types: rich previews for PDF/HTML,
        // a download fallback for everything else. The resize handle inside
        // DocPreview calls handleResize which debounces to onResize (persist).
        <DocPreview
          fileUrl={fileUrl}
          fileName={node.fileName}
          mimeType={node.mimeType}
          width={dims.width}
          height={dims.height}
          scale={scale}
          onResize={handleResize}
        />
      )}

      {node.type === "file" && !fileUrl && (
        // URL not yet resolved (Convex query in flight): show the compact
        // icon-and-name placeholder. Transitions to DocPreview once fileUrl lands.
        <div className="flex items-center gap-2.5 p-3 h-full overflow-hidden">
          <FileText className="w-7 h-7 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-ink truncate">
              {node.fileName ?? "Document"}
            </div>
            <div className="text-ink-mute text-xs truncate">
              {node.mimeType ?? "file"}
            </div>
          </div>
        </div>
      )}

      {isGeneratedImage &&
        !aiMode &&
        // "generating" wins over a lingering fileId: a Redo re-runs this same node
        // and the previous image stays until the new one is filed, so the spinner
        // must show meanwhile (generatedImageState encodes the precedence).
        (() => {
          const state = generatedImageState(node.attribution, !!img);
          if (state === "ready") {
            return (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover rounded-xl"
                  draggable={false}
                />
                {/* Redo: open the prompt editor prefilled, regenerate in place.
                    stopPropagation so it never starts a card drag. */}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => enterAiMode(redoPromptFor(node.text))}
                  style={{
                    transform: `translate(-6px, -6px) scale(${1 / scale})`,
                    transformOrigin: "100% 100%",
                  }}
                  className="absolute bottom-0 right-0 flex items-center gap-1 px-2 py-1 rounded-md bg-ink/70 text-paper text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Redo this image with a new or edited prompt"
                >
                  <RotateCcw className="w-3 h-3" /> Redo
                </button>
              </>
            );
          }
          if (state === "error") {
            return (
              <div className="flex flex-col items-center justify-center h-full p-3 text-center gap-1.5">
                <span className="text-xs text-ink-mute">Couldn&apos;t generate that image.</span>
                {node.text && (
                  <span className="text-[11px] text-ink-mute/80 line-clamp-2">“{node.text}”</span>
                )}
                {node.title && (
                  <span className="text-[10px] text-ink-mute/70 line-clamp-2">{node.title}</span>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onGenerateImage(node.text ?? "")}
                    className="text-xs px-2.5 py-1 rounded-md bg-[#7c3aed] text-white transition"
                  >
                    Try again
                  </button>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => enterAiMode(redoPromptFor(node.text))}
                    className="text-xs px-2.5 py-1 rounded-md border border-line text-ink-mute hover:text-ink transition"
                  >
                    Edit prompt
                  </button>
                </div>
              </div>
            );
          }
          return (
            <div className="flex flex-col items-center justify-center h-full p-3 text-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#7c3aed]" />
              <span className="text-[11px] text-ink-mute line-clamp-3">
                {node.text ? `Generating “${node.text}”…` : "Generating…"}
              </span>
            </div>
          );
        })()}

      {/* attach an image file into an empty card */}
      {isEmptyText && !aiMode && (
        <>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => fileRef.current?.click()}
            // Counter-scale to a constant screen size; anchored 6px inside the card's
            // bottom-right corner (in screen px) so it stays tappable at any zoom.
            style={{ transform: `translate(-6px, -6px) scale(${1 / scale})`, transformOrigin: "100% 100%" }}
            className="absolute bottom-0 right-0 w-6 h-6 rounded-md text-ink-mute hover:text-ink hover:bg-paper-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="Add an image"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadImage(f);
              e.target.value = "";
            }}
          />
        </>
      )}

      {/* link handle — click to start a connection */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onStartLink}
        // Counter-scale to a constant screen size; centered on the card's bottom edge.
        style={{ transform: `translate(-50%, 50%) scale(${1 / scale})`, transformOrigin: "50% 50%" }}
        className="absolute bottom-0 left-1/2 w-4 h-4 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
        title="Connect to another node"
      />

      {linking && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onCompleteLink}
          className="absolute inset-0 rounded-xl ring-2 ring-accent/50 cursor-pointer"
        />
      )}
    </div>
  );
}
