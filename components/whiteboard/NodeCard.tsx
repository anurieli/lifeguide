"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NodeDoc } from "@/lib/types";
import { ImagePlus, FileText } from "lucide-react";
import { DocPreview } from "./DocPreview";

type Props = {
  node: NodeDoc;
  scale: number;
  autoFocus: boolean;
  onMoveCommit: (x: number, y: number) => void;
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

const URL_RE = /^https?:\/\/\S+$/i;

export function NodeCard({
  node,
  scale,
  autoFocus,
  onMoveCommit,
  onResize,
  onText,
  onDelete,
  onStartLink,
  onCompleteLink,
  onUploadImage,
  onMorphLink,
  linking,
}: Props) {
  // NOTE FOR INTEGRATOR: Whiteboard.tsx does not yet pass onResize. Wire it up
  // by adding: onResize={(w, h) => void resize({ nodeId: n._id, dimensions: { width: w, height: h } })}
  // to the <NodeCard> render in Whiteboard.tsx. The resize mutation already exists in convex/nodes.ts.
  const drag = useRef<{ mx: number; my: number; ix: number; iy: number; moved: boolean } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const pos = localPos ?? node.position;

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
    if (localPos && node.position.x === localPos.x && node.position.y === localPos.y) {
      setLocalPos(null);
    }
  }, [node.position.x, node.position.y, localPos]);

  useEffect(() => {
    if (autoFocus) taRef.current?.focus();
  }, [autoFocus]);

  const fileUrl = useQuery(
    api.files.getUrl,
    node.fileId && !node.imageUrl ? { fileId: node.fileId } : "skip",
  );
  const img = node.imageUrl ?? fileUrl ?? undefined;

  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    drag.current = {
      mx: e.clientX,
      my: e.clientY,
      ix: node.position.x,
      iy: node.position.y,
      moved: false,
    };
    e.stopPropagation();
  };
  const move = (e: React.PointerEvent) => {
    if (!dragging || !drag.current) return;
    drag.current.moved = true;
    setLocalPos({
      x: drag.current.ix + (e.clientX - drag.current.mx) / scale,
      y: drag.current.iy + (e.clientY - drag.current.my) / scale,
    });
  };
  const up = (e: React.PointerEvent) => {
    if (dragging && drag.current?.moved && localPos) onMoveCommit(localPos.x, localPos.y);
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
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
      }`}
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
