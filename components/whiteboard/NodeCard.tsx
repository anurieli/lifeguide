"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NodeDoc } from "@/lib/types";
import { SelectionMods } from "@/lib/selection";
import { ImagePlus, FileText } from "lucide-react";
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
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ink text-paper text-xs leading-none opacity-0 group-hover:opacity-100 transition z-10"
        title="Delete"
      >
        ×
      </button>

      {node.type === "image" && img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" className="w-full h-full object-cover rounded-xl" draggable={false} />
      )}

      {(node.type === "text" || node.type === "quote") && (
        <textarea
          ref={taRef}
          defaultValue={node.text ?? ""}
          onBlur={onBlur}
          onPaste={onPaste}
          placeholder={isQuote ? "A quote that hit you…" : "Type, paste an image, or drop a link…"}
          className={`w-full h-full p-3 bg-transparent resize-none outline-none text-sm text-ink placeholder:text-ink-mute ${
            isQuote ? "italic" : ""
          }`}
        />
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

      {node.type === "generated_image" && (
        <div className="p-3 text-sm text-ink overflow-hidden">{node.text ?? node.title}</div>
      )}

      {/* attach an image file into an empty card */}
      {isEmptyText && (
        <>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-md text-ink-mute hover:text-ink hover:bg-paper-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
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
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition"
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
