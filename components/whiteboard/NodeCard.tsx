"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NodeDoc } from "@/lib/types";
import { SelectionMods } from "@/lib/selection";
import { ImagePlus, FileText, Loader2, Sparkles } from "lucide-react";
import { DocPreview } from "./DocPreview";

type Props = {
  node: NodeDoc;
  scale: number;
  autoFocus: boolean;
  selected: boolean;
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
  const drag = useRef<{ mx: number; my: number; moved: boolean; isText: boolean } | null>(null);
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

  const fileUrl = useQuery(
    api.files.getUrl,
    node.fileId && !node.imageUrl ? { fileId: node.fileId } : "skip",
  );
  const img = node.imageUrl ?? fileUrl ?? undefined;

  const down = (e: React.PointerEvent) => {
    const isText = (e.target as HTMLElement).tagName === "TEXTAREA";
    // Always tell the board about the click (selection is harmless while editing),
    // but never let the gesture fall through to the background marquee/pan.
    onPointerDownNode(modsFrom(e));
    e.stopPropagation();
    // A text card edits on first click; once selected its whole body drags.
    // Non-text cards (image/file/link) always drag from the body.
    if (isText && !selected) return; // let the textarea own the caret
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    drag.current = { mx: e.clientX, my: e.clientY, moved: false, isText };
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
    if (dragging) {
      const moved = drag.current?.moved ?? false;
      onDragEnd(moved);
      // A click (no move) on a selected text card drops into editing.
      if (!moved && drag.current?.isText) taRef.current?.focus();
    }
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
          defaultValue={node.text ?? ""}
          onBlur={onBlur}
          onPaste={onPaste}
          onKeyDown={onTextKeyDown}
          placeholder={isQuote ? "A quote that hit you…" : "Type, paste, drop a link, or / for AI…"}
          className={`w-full h-full p-3 bg-transparent resize-none outline-none text-sm text-ink placeholder:text-ink-mute ${
            isQuote ? "italic" : ""
          }`}
        />
      )}

      {(node.type === "text" || node.type === "quote") && aiMode && (
        <div className="flex flex-col h-full p-2.5 gap-2" onPointerDown={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#7c3aed]">
            <Sparkles className="w-3.5 h-3.5" /> Generate with AI
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
              Generate
            </button>
          </div>
        </div>
      )}

      {node.type === "link" && (
        <a
          href={node.attribution ?? "#"}
          target="_blank"
          rel="noreferrer"
          onPointerDown={(e) => e.stopPropagation()}
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

      {node.type === "generated_image" &&
        (img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="w-full h-full object-cover rounded-xl" draggable={false} />
        ) : node.attribution === "error" ? (
          <div className="flex flex-col items-center justify-center h-full p-3 text-center gap-1.5">
            <span className="text-xs text-ink-mute">Couldn&apos;t generate that image.</span>
            {node.text && (
              <span className="text-[11px] text-ink-mute/80 line-clamp-2">“{node.text}”</span>
            )}
            {node.title && (
              <span className="text-[10px] text-ink-mute/70 line-clamp-2">{node.title}</span>
            )}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onGenerateImage(node.text ?? "")}
              className="mt-1 text-xs px-2.5 py-1 rounded-md bg-[#7c3aed] text-white transition"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-3 text-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#7c3aed]" />
            <span className="text-[11px] text-ink-mute line-clamp-3">
              {node.text ? `Generating “${node.text}”…` : "Generating…"}
            </span>
          </div>
        ))}

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
