"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SurfaceId } from "@/lib/types";
import { useViewport } from "@/hooks/useViewport";
import { useNodes } from "@/hooks/useNodes";
import { useEdges } from "@/hooks/useEdges";
import { useCaptures } from "@/hooks/useCaptures";
import { NodeCard } from "./NodeCard";
import { EdgeLayer } from "./EdgeLayer";
import { Toolbar } from "./Toolbar";
import { Inbox } from "./Inbox";

const VIDEO_HOSTS = /(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|vimeo\.com)/i;

export function Whiteboard({ surfaceId }: { surfaceId: SurfaceId }) {
  const { vp, pan, zoomAt } = useViewport();
  const { nodes, create, move, setText, remove } = useNodes(surfaceId);
  const { edges, connect, remove: removeEdge } = useEdges(surfaceId);
  const { inbox, create: createCapture, softDelete, place, generateUploadUrl } = useCaptures();

  const panning = useRef<{ mx: number; my: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLinkFrom(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const uploadImage = useCallback(
    async (file: File, source: "paste" | "upload") => {
      const url = await generateUploadUrl();
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await r.json();
      await createCapture({ source, rawType: "image", rawFileId: storageId });
    },
    [generateUploadUrl, createCapture],
  );

  const addLink = useCallback(
    (raw: string) => {
      const url = raw.trim();
      if (!/^https?:\/\//.test(url)) {
        alert("Please paste a full URL starting with http(s)://");
        return;
      }
      void createCapture({
        source: "url",
        rawType: VIDEO_HOSTS.test(url) ? "video_link" : "link",
        rawUrl: url,
      });
    },
    [createCapture],
  );

  // Type-anywhere capture: paste an image, a link, or text onto the board.
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return;
      if (!e.clipboardData) return;

      for (const item of e.clipboardData.items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            await uploadImage(file, "paste");
            return;
          }
        }
      }

      const text = e.clipboardData.getData("text").trim();
      if (!text) return;
      const isUrl = /^https?:\/\//.test(text);
      await createCapture({
        source: isUrl ? "url" : "paste",
        rawType: isUrl ? (VIDEO_HOSTS.test(text) ? "video_link" : "link") : "text",
        rawText: isUrl ? undefined : text,
        rawUrl: isUrl ? text : undefined,
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [createCapture, uploadImage]);

  const onDown = (e: React.PointerEvent) => {
    setIsPanning(true);
    panning.current = { mx: e.clientX, my: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!panning.current) return;
    pan(e.clientX - panning.current.mx, e.clientY - panning.current.my);
    panning.current = { mx: e.clientX, my: e.clientY };
  };
  const onUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    panning.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };
  const onWheel = (e: React.WheelEvent) => {
    zoomAt(e.deltaY < 0 ? 1.06 : 0.94, e.clientX, e.clientY);
  };

  const addNode = (type: "text" | "quote") => {
    const cx = (window.innerWidth / 2 - vp.x) / vp.scale - 110;
    const cy = (window.innerHeight / 2 - vp.y) / vp.scale - 65;
    void create({
      surfaceId,
      type,
      text: "",
      position: { x: cx, y: cy, z: 0 },
      dimensions: { width: 220, height: 130 },
    });
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-paper touch-none"
      style={{
        cursor: isPanning ? "grabbing" : "grab",
        backgroundImage: "radial-gradient(circle, #E7E1D4 1px, transparent 1px)",
        backgroundSize: `${24 * vp.scale}px ${24 * vp.scale}px`,
        backgroundPosition: `${vp.x}px ${vp.y}px`,
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onWheel={onWheel}
    >
      <div
        className="absolute left-0 top-0"
        style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.scale})`, transformOrigin: "0 0" }}
      >
        <EdgeLayer edges={edges} nodes={nodes} onRemove={(id) => void removeEdge({ edgeId: id })} />
        {nodes.map((n) => (
          <NodeCard
            key={n._id}
            node={n}
            scale={vp.scale}
            onMoveCommit={(x, y) => void move({ nodeId: n._id, position: { x, y, z: n.position.z } })}
            onText={(t) => void setText({ nodeId: n._id, text: t })}
            onDelete={() => void remove({ nodeId: n._id })}
            onStartLink={() => setLinkFrom(n._id)}
            onCompleteLink={() => {
              if (linkFrom && linkFrom !== n._id) {
                connect({ surfaceId, fromNode: linkFrom as never, toNode: n._id }).catch((err) =>
                  alert(err.message),
                );
              }
              setLinkFrom(null);
            }}
            linking={linkFrom !== null}
          />
        ))}
      </div>

      {linkFrom && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-accent text-white text-xs px-3 py-1.5 rounded-full shadow-md z-30">
          Click a node to connect · Esc to cancel
        </div>
      )}

      <Inbox
        captures={inbox}
        onPlace={(c) => void place({ captureId: c._id, surfaceId })}
        onDismiss={(c) => void softDelete({ captureId: c._id })}
      />

      <Toolbar onAddNode={addNode} onUpload={(f) => void uploadImage(f, "upload")} onAddLink={addLink} />
    </div>
  );
}
