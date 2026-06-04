"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SurfaceId } from "@/lib/types";
import { Id } from "@/convex/_generated/dataModel";
import { useViewport } from "@/hooks/useViewport";
import { useNodes } from "@/hooks/useNodes";
import { useEdges } from "@/hooks/useEdges";
import { useCaptures } from "@/hooks/useCaptures";
import { NodeCard } from "./NodeCard";
import { EdgeLayer } from "./EdgeLayer";
import { Toolbar } from "./Toolbar";
import { Inbox } from "./Inbox";
import { Minimap } from "./Minimap";
import { BrainDump } from "@/components/voice/BrainDump";
import { rectsOverlap } from "@/lib/geometry";

const VIDEO_HOSTS = /(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|vimeo\.com)/i;

// Gap added between cards during a Gather layout (world px).
const GATHER_GAP = 20;

export function Whiteboard({ surfaceId }: { surfaceId: SurfaceId }) {
  const { vp, pan, zoomAt, panTo } = useViewport();
  const { nodes, create, move, resize, setText, remove, morph } = useNodes(surfaceId);
  const { edges, connect, remove: removeEdge } = useEdges(surfaceId);
  const { inbox, create: createCapture, softDelete, place, generateUploadUrl } = useCaptures();

  const panning = useRef<{ mx: number; my: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [gathering, setGathering] = useState(false);
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLinkFrom(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      const url = await generateUploadUrl();
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await r.json();
      return storageId as Id<"_storage">;
    },
    [generateUploadUrl],
  );

  // Morph an existing card into an image (pasted or attached inside the card).
  const morphToImage = useCallback(
    async (nodeId: string, file: File) => {
      const fileId = await uploadFile(file);
      await morph({
        nodeId: nodeId as Id<"nodes">,
        type: "image",
        fileId,
        dimensions: { width: 240, height: 180 },
      });
    },
    [uploadFile, morph],
  );

  const morphToLink = useCallback(
    (nodeId: string, url: string) => {
      void morph({ nodeId: nodeId as Id<"nodes">, type: "link", text: url, attribution: url });
    },
    [morph],
  );

  // Type-anywhere capture: paste onto empty board space sends it to the Inbox to distill.
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return;
      if (!e.clipboardData) return;

      for (const item of e.clipboardData.items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const fileId = await uploadFile(file);
            await createCapture({ source: "paste", rawType: "image", rawFileId: fileId });
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
  }, [createCapture, uploadFile]);

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

  // One add: a blank card you type into, or paste an image / link into.
  const addCard = async () => {
    const cx = (window.innerWidth / 2 - vp.x) / vp.scale - 110;
    const cy = (window.innerHeight / 2 - vp.y) / vp.scale - 65;
    const id = await create({
      surfaceId,
      type: "text",
      text: "",
      position: { x: cx, y: cy, z: 0 },
      dimensions: { width: 220, height: 130 },
    });
    setFocusId(id as string);
  };

  // Screen pixel -> board coordinate (inverse of the viewport transform).
  const screenToBoard = (clientX: number, clientY: number) => ({
    x: (clientX - vp.x) / vp.scale,
    y: (clientY - vp.y) / vp.scale,
  });

  // Drop files from the desktop straight onto the board where they land.
  // Images become image cards; everything else becomes a file card.
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDropping(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length === 0) return;
    const at = screenToBoard(e.clientX, e.clientY);

    await Promise.all(
      files.map(async (file, i) => {
        const fileId = await uploadFile(file);
        const offset = i * 28; // fan out so multiple drops don't stack exactly
        if (file.type.startsWith("image/")) {
          await create({
            surfaceId,
            type: "image",
            fileId,
            position: { x: at.x - 120 + offset, y: at.y - 90 + offset, z: 0 },
            dimensions: { width: 240, height: 180 },
          });
        } else {
          await create({
            surfaceId,
            type: "file",
            fileId,
            fileName: file.name,
            mimeType: file.type || undefined,
            position: { x: at.x - 110 + offset, y: at.y - 44 + offset, z: 0 },
            dimensions: { width: 280, height: 360 },
          });
        }
      }),
    );
  };

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
  };
  const onDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    dragDepth.current += 1;
    setIsDropping(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDropping(false);
  };

  // ---- Gather -----------------------------------------------------------
  // Repack all nodes into a compact, no-overlap grid starting near the world
  // origin. Uses the same rectsOverlap util as the server placement code.
  // Keeps relative creation order (array order) so nothing feels arbitrary.
  //
  // Algorithm: place each node into the first row slot that does not overlap
  // previously placed nodes. When a row fills beyond MAX_ROW_W, start a new row.
  // This gives a tidy left-to-right, top-to-bottom layout with consistent gaps.
  const handleGather = useCallback(async () => {
    if (nodes.length === 0 || gathering) return;
    setGathering(true);

    // Sort by original creation time (stable order).
    const sorted = [...nodes].sort((a, b) => a.createdAt - b.createdAt);

    // Max row width before wrapping (world px). Aim for roughly 4 standard cards.
    const MAX_ROW_W = 4 * (240 + GATHER_GAP);

    type Placed = { x: number; y: number; w: number; h: number };
    const placed: Placed[] = [];
    const positions: { id: string; x: number; y: number }[] = [];

    let rowX = 0;
    let rowY = 0;
    let rowHeight = 0; // tallest card in the current row

    for (const node of sorted) {
      const nw = node.dimensions.width;
      const nh = node.dimensions.height;

      // If adding this card would exceed the row width, wrap.
      if (placed.length > 0 && rowX + nw > MAX_ROW_W) {
        rowY += rowHeight + GATHER_GAP;
        rowX = 0;
        rowHeight = 0;
      }

      // Scan for horizontal clearance within this row in case a taller earlier
      // card extends into this row's vertical band. Nudge right until clear.
      let cx = rowX;
      let attempts = 0;
      while (attempts < 200) {
        const cand = { x: cx, y: rowY, w: nw, h: nh };
        const clash = placed.some((p) => rectsOverlap(cand, p));
        if (!clash) break;
        cx += 8;
        attempts++;
      }

      placed.push({ x: cx, y: rowY, w: nw, h: nh });
      positions.push({ id: node._id, x: cx, y: rowY });

      rowX = cx + nw + GATHER_GAP;
      rowHeight = Math.max(rowHeight, nh);
    }

    // Fire all moves in parallel; each move is one Convex mutation.
    await Promise.all(
      positions.map(({ id, x, y }) =>
        move({ nodeId: id as Id<"nodes">, position: { x, y, z: 0 } }),
      ),
    );

    // Pan the viewport to the center of the new layout.
    if (positions.length > 0) {
      const xs = positions.map((p) => p.x);
      const ys = positions.map((p) => p.y);
      const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
      const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
      panTo(midX, midY, window.innerWidth, window.innerHeight);
    }

    setGathering(false);
  }, [nodes, gathering, move, panTo]);

  // ---- Center on nearest ------------------------------------------------
  // Find the node whose center is closest (Euclidean, world space) to the
  // current viewport center, then animate the viewport to that node.
  const handleCenterNearest = useCallback(() => {
    if (nodes.length === 0) return;
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    // Current viewport center in world coordinates.
    const vcx = (sw / 2 - vp.x) / vp.scale;
    const vcy = (sh / 2 - vp.y) / vp.scale;

    let nearest = nodes[0];
    let bestDist = Infinity;
    for (const n of nodes) {
      const nx = n.position.x + n.dimensions.width / 2;
      const ny = n.position.y + n.dimensions.height / 2;
      const dist = Math.hypot(nx - vcx, ny - vcy);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = n;
      }
    }

    const cx = nearest.position.x + nearest.dimensions.width / 2;
    const cy = nearest.position.y + nearest.dimensions.height / 2;
    panTo(cx, cy, sw, sh);
  }, [nodes, vp, panTo]);

  // ---- Minimap pan callback --------------------------------------------
  // When the user clicks the minimap, pan the viewport so that world point
  // (wx, wy) lands at the screen center.
  const handleMinimapPan = useCallback(
    (wx: number, wy: number) => {
      panTo(wx, wy, window.innerWidth, window.innerHeight);
    },
    [panTo],
  );

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
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={(e) => void onDrop(e)}
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
            autoFocus={n._id === focusId}
            onMoveCommit={(x, y) => void move({ nodeId: n._id, position: { x, y, z: n.position.z } })}
            onResize={(w, h) => void resize({ nodeId: n._id, dimensions: { width: w, height: h } })}
            onText={(t) => void setText({ nodeId: n._id, text: t })}
            onDelete={() => void remove({ nodeId: n._id })}
            onUploadImage={(file) => void morphToImage(n._id, file)}
            onMorphLink={(url) => morphToLink(n._id, url)}
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

      {isDropping && (
        <div className="pointer-events-none fixed inset-3 z-40 rounded-2xl border-2 border-dashed border-accent bg-accent/5 flex items-center justify-center">
          <div className="bg-accent text-white text-sm px-4 py-2 rounded-full shadow-md">
            Drop photos or documents to add them to the board
          </div>
        </div>
      )}

      <Inbox
        captures={inbox}
        onPlace={(c) => void place({ captureId: c._id, surfaceId })}
        onDismiss={(c) => void softDelete({ captureId: c._id })}
      />

      {/* Minimap: only visible when there are nodes on the board */}
      <Minimap nodes={nodes} vp={vp} onPan={handleMinimapPan} />

      <Toolbar
        onAdd={() => void addCard()}
        onGather={() => void handleGather()}
        onCenterNearest={handleCenterNearest}
        onBrainDump={() => setBrainDumpOpen(true)}
        gathering={gathering}
      />

      <BrainDump
        open={brainDumpOpen}
        surfaceId={surfaceId}
        onClose={() => setBrainDumpOpen(false)}
      />
    </div>
  );
}
