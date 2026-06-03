"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NodeDoc } from "@/lib/types";

type Props = {
  node: NodeDoc;
  scale: number;
  onMoveCommit: (x: number, y: number) => void;
  onText: (t: string) => void;
  onDelete: () => void;
  onStartLink: () => void;
  onCompleteLink: () => void;
  linking: boolean;
};

export function NodeCard({
  node,
  scale,
  onMoveCommit,
  onText,
  onDelete,
  onStartLink,
  onCompleteLink,
  linking,
}: Props) {
  const drag = useRef<{ mx: number; my: number; ix: number; iy: number; moved: boolean } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  // Optimistic position while dragging; persisted once on release, cleared when the server confirms.
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const pos = localPos ?? node.position;

  useEffect(() => {
    if (localPos && node.position.x === localPos.x && node.position.y === localPos.y) {
      setLocalPos(null);
    }
  }, [node.position.x, node.position.y, localPos]);

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

  const isQuote = node.type === "quote";

  return (
    <div
      className={`absolute group rounded-xl bg-card shadow-sm transition-shadow hover:shadow-md ${
        isQuote ? "border-l-[3px] border-l-gold border-y border-r border-line" : "border border-line"
      }`}
      style={{
        left: pos.x,
        top: pos.y,
        width: node.dimensions.width,
        height: node.dimensions.height,
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
          defaultValue={node.text ?? ""}
          onBlur={(e) => e.target.value !== node.text && onText(e.target.value)}
          placeholder={isQuote ? "A quote that hit you…" : "An idea…"}
          className={`w-full h-full p-3 bg-transparent resize-none outline-none text-sm text-ink placeholder:text-ink-mute ${
            isQuote ? "italic" : ""
          }`}
        />
      )}

      {(node.type === "link" || node.type === "generated_image") && (
        <div className="p-3 text-sm text-ink overflow-hidden">
          {node.title && <div className="font-medium">{node.title}</div>}
          <div className="text-ink-soft">{node.text}</div>
          {node.attribution && <div className="text-ink-mute text-xs mt-1">{node.attribution}</div>}
        </div>
      )}

      {/* link handle — click to start a connection */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onStartLink}
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition"
        title="Connect to another node"
      />

      {/* drop target while linking — click to complete the connection */}
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
