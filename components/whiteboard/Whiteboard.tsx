"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { SelectionLayer } from "./SelectionLayer";
import { SelectionActions } from "./SelectionActions";
import { CanvasMenu } from "./CanvasMenu";
import { Legend } from "./Legend";
import { BrainDump } from "@/components/voice/BrainDump";
import { Rect, boardCentroid, rectsOverlap } from "@/lib/geometry";
import { useSelection } from "@/hooks/useSelection";
import {
  SelectionMods,
  marqueeWorldRect,
  normalizeScreenRect,
  selectionFromMarquee,
} from "@/lib/selection";

const VIDEO_HOSTS = /(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|vimeo\.com)/i;

// Gap added between cards during a Gather layout (world px).
const GATHER_GAP = 20;

// `active` is whether the board tab is the one on screen: the board stays
// mounted across nav (canvas state survives), so accessing it is a prop flip,
// not a mount — and each access re-centers on the whole board.
export function Whiteboard({ surfaceId, active }: { surfaceId: SurfaceId; active: boolean }) {
  const { vp, pan, zoomAt, panTo } = useViewport();
  const { nodes, create, move, resize, setText, remove, morph } = useNodes(surfaceId);
  const { edges, connect, remove: removeEdge } = useEdges(surfaceId);
  const { inbox, create: createCapture, softDelete, place, generateUploadUrl } = useCaptures();

  const { selected, isSelected, clear, replace, clickNode } = useSelection();

  // Background gesture (empty-canvas): pan (shift-drag) or marquee (plain drag).
  const bgGesture = useRef<
    | { kind: "pan"; mx: number; my: number }
    | { kind: "marquee"; startX: number; startY: number; moved: boolean }
    | null
  >(null);
  const [marqueeRect, setMarqueeRect] = useState<Rect | null>(null);

  // Node drag: source of truth lives in dragRef; `drag` mirrors the live offset
  // into render state so the whole group moves together. `optimistic` holds the
  // committed positions until the reactive query catches up (no snap-back).
  const dragRef = useRef<{
    start: Map<string, { x: number; y: number; z: number }>;
    pendingCollapse: string | null;
    suppress: boolean;
    moved: boolean;
    dx: number;
    dy: number;
  } | null>(null);
  const [drag, setDrag] = useState<{ ids: string[]; dx: number; dy: number } | null>(null);
  const [optimistic, setOptimistic] = useState<Map<string, { x: number; y: number }>>(new Map());

  const [isPanning, setIsPanning] = useState(false);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [gathering, setGathering] = useState(false);
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);
  const dragDepth = useRef(0);

  // AI image generation: the action, the card currently in "/" AI-prompt mode, and the
  // right-click menu (world = where the click landed, so new cards drop there).
  const generateImage = useAction(api.ai.imageGen.generateInto);
  const [aiModeId, setAiModeId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; world: { x: number; y: number } } | null>(
    null,
  );
  const menuFileRef = useRef<HTMLInputElement>(null);
  const pendingWorld = useRef<{ x: number; y: number } | null>(null);

  const nodeById = new Map(nodes.map((n) => [n._id as string, n]));

  // Drop optimistic overrides once the server position matches (or the node is gone).
  useEffect(() => {
    setOptimistic((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Map(prev);
      for (const [id, p] of prev) {
        const n = nodeById.get(id);
        if (!n || (n.position.x === p.x && n.position.y === p.y)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // Final render position for a node: optimistic override + live drag offset.
  const renderPos = (id: string, basePos: { x: number; y: number }) => {
    const base = optimistic.get(id) ?? basePos;
    if (drag && drag.ids.includes(id)) return { x: base.x + drag.dx, y: base.y + drag.dy };
    return optimistic.has(id) ? base : null;
  };

  const deleteSelected = useCallback(() => {
    if (selected.size === 0) return;
    for (const id of selected) void remove({ nodeId: id as Id<"nodes"> });
    clear();
  }, [selected, remove, clear]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const editing =
        !!t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable);
      if (e.key === "Escape") {
        setLinkFrom(null);
        setMenu(null);
        clear();
        return;
      }
      if (editing) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected.size > 0) {
        e.preventDefault();
        deleteSelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        replace(nodes.map((n) => n._id as string));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, nodes, clear, replace, deleteSelected]);

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

  // Type-anywhere capture: paste onto empty board space sends it to the Inbox to
  // distill, marked target="board" — a deliberate act, so it skips the vision sieve.
  // Attached only while the board is the on-screen surface: the board stays mounted
  // across nav, and a window-wide listener on a hidden board was silently swallowing
  // pastes aimed at other surfaces (or other apps' text bound for nowhere).
  useEffect(() => {
    if (!active) return;
    const onPaste = async (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return;
      if (!e.clipboardData) return;

      for (const item of e.clipboardData.items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const fileId = await uploadFile(file);
            await createCapture({
              source: "paste",
              rawType: "image",
              rawFileId: fileId,
              target: "board",
            });
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
        target: "board",
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [active, createCapture, uploadFile]);

  // ---- Background gestures (this only fires on empty canvas; cards stop
  // propagation so a pointer-down on a card never starts a pan/marquee) -------
  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // right/middle click never starts a pan/marquee
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (e.shiftKey) {
      // Shift-drag on empty space pans the board.
      bgGesture.current = { kind: "pan", mx: e.clientX, my: e.clientY };
      setIsPanning(true);
    } else {
      // Plain drag draws a marquee.
      bgGesture.current = { kind: "marquee", startX: e.clientX, startY: e.clientY, moved: false };
      setMarqueeRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const g = bgGesture.current;
    if (!g) return;
    if (g.kind === "pan") {
      pan(e.clientX - g.mx, e.clientY - g.my);
      g.mx = e.clientX;
      g.my = e.clientY;
      return;
    }
    g.moved = true;
    const start = { x: g.startX, y: g.startY };
    const cur = { x: e.clientX, y: e.clientY };
    setMarqueeRect(normalizeScreenRect(start, cur));
    replace(selectionFromMarquee(marqueeWorldRect(start, cur, vp), nodes));
  };
  const onUp = (e: React.PointerEvent) => {
    const g = bgGesture.current;
    bgGesture.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    setIsPanning(false);
    if (g?.kind === "marquee") {
      if (!g.moved) clear(); // a plain click on empty space deselects
      setMarqueeRect(null);
    }
  };
  // Trackpad two-finger / plain wheel pans; ⌘-scroll or pinch (ctrlKey) zooms.
  // Only the bare canvas pans/zooms: a wheel over a card, a textarea, or an
  // overlay (Inbox, Toolbar, Minimap, …) must scroll *that* element and never
  // leak into a board pan. Those all sit inside child elements, so the board
  // only reacts when the wheel lands directly on the background surface.
  const onWheel = (e: React.WheelEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.ctrlKey || e.metaKey) {
      zoomAt(e.deltaY < 0 ? 1.06 : 0.94, e.clientX, e.clientY);
    } else {
      pan(-e.deltaX, -e.deltaY);
    }
  };

  // ---- Node drag + selection (driven by NodeCard, owned here) ---------------
  const beginDrag = (ids: string[], pendingCollapse: string | null) => {
    const start = new Map<string, { x: number; y: number; z: number }>();
    for (const id of ids) {
      const n = nodeById.get(id);
      if (!n) continue;
      const p = optimistic.get(id) ?? n.position;
      start.set(id, { x: p.x, y: p.y, z: n.position.z });
    }
    dragRef.current = { start, pendingCollapse, suppress: false, moved: false, dx: 0, dy: 0 };
    setDrag({ ids, dx: 0, dy: 0 });
  };

  const handleNodeDown = (id: string, mods: SelectionMods) => {
    if (mods.shift || mods.meta) {
      clickNode(id, mods); // add / toggle — never drags
      dragRef.current = null;
      return;
    }
    if (selected.has(id) && selected.size > 1) {
      // Keep the multi-selection so a drag moves the group; a plain click
      // (no move) collapses to just this card on pointer-up.
      beginDrag([...selected], id);
    } else {
      replace([id]);
      beginDrag([id], null);
    }
  };

  const handleNodeDragDelta = (dx: number, dy: number) => {
    const d = dragRef.current;
    if (!d || d.suppress) return;
    d.moved = true;
    d.dx = dx;
    d.dy = dy;
    setDrag((v) => (v ? { ...v, dx, dy } : v));
  };

  const handleNodeDragEnd = (moved: boolean) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d || d.suppress) return;
    if (!moved) {
      if (d.pendingCollapse) replace([d.pendingCollapse]);
      return;
    }
    setOptimistic((prev) => {
      const next = new Map(prev);
      for (const [id, p] of d.start) next.set(id, { x: p.x + d.dx, y: p.y + d.dy });
      return next;
    });
    for (const [id, p] of d.start) {
      void move({ nodeId: id as Id<"nodes">, position: { x: p.x + d.dx, y: p.y + d.dy, z: p.z } });
    }
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

  // Drop a blank text card centered on a world point. `ai` starts it in AI-prompt mode.
  const addTextAt = async (world: { x: number; y: number }, ai = false) => {
    const id = await create({
      surfaceId,
      type: "text",
      text: "",
      position: { x: world.x - 110, y: world.y - 65, z: 0 },
      dimensions: { width: 220, height: 130 },
    });
    setFocusId(id as string);
    if (ai) setAiModeId(id as string);
    return id;
  };

  // Submit an AI image prompt for a card: morph it to a "generating" image (instant
  // spinner via the reactive query), then run the action which files the result back.
  const handleGenerateImage = async (nodeId: string, prompt: string) => {
    const p = prompt.trim();
    if (!p) return;
    setAiModeId(null);
    await morph({
      nodeId: nodeId as Id<"nodes">,
      type: "generated_image",
      text: p,
      attribution: "generating",
      dimensions: { width: 280, height: 280 },
    });
    generateImage({ nodeId: nodeId as Id<"nodes">, prompt: p }).catch((err) => {
      console.error("image generation failed", err);
      void morph({ nodeId: nodeId as Id<"nodes">, type: "generated_image", attribution: "error" });
    });
  };

  // Double-click empty canvas adds a text card where you clicked.
  const onDoubleClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return; // ignore dbl-clicks on cards / UI chrome
    void addTextAt(screenToBoard(e.clientX, e.clientY));
  };

  // Right-click empty canvas opens the add menu at the cursor.
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (e.target !== e.currentTarget) return; // only over bare canvas, not cards / UI
    setMenu({ x: e.clientX, y: e.clientY, world: screenToBoard(e.clientX, e.clientY) });
  };

  // Menu "Upload image": remember where to drop it, then open the file picker.
  const promptMenuUpload = (world: { x: number; y: number }) => {
    pendingWorld.current = world;
    menuFileRef.current?.click();
  };
  const onMenuFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    const w = pendingWorld.current;
    e.target.value = "";
    pendingWorld.current = null;
    if (!f || !w) return;
    const fileId = await uploadFile(f);
    await create({
      surfaceId,
      type: "image",
      fileId,
      position: { x: w.x - 120, y: w.y - 90, z: 0 },
      dimensions: { width: 240, height: 180 },
    });
  };

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

  // ---- Center on the board ----------------------------------------------
  // The toolbar's center button lands on the whole board: the average of every
  // card's center (was: nearest card to the current viewport center).
  const handleCenterBoard = useCallback(() => {
    const c = boardCentroid(nodes);
    if (!c) return;
    panTo(c.x, c.y, window.innerWidth, window.innerHeight);
  }, [nodes, panTo]);

  // Accessing the board lands on the same point as the center button. The
  // board stays mounted across nav, so "access" is `active` flipping true —
  // and on a restored board tab, the first load of a non-empty node list.
  const centeredOnAccess = useRef(false);
  const hasNodes = nodes.length > 0;
  useEffect(() => {
    if (!active) {
      centeredOnAccess.current = false;
      return;
    }
    if (centeredOnAccess.current || !hasNodes) return;
    centeredOnAccess.current = true;
    handleCenterBoard();
  }, [active, hasNodes, handleCenterBoard]);

  // ---- Center on a just-placed capture -----------------------------------
  // Placing from the Inbox keeps the spiral placement, but the viewport
  // follows: when the placed node lands in the reactive list, center on it.
  const pendingCenterNodeId = useRef<string | null>(null);
  const handlePlace = useCallback(
    async (captureId: Id<"captures">) => {
      const nodeId = await place({ captureId, surfaceId });
      if (nodeId) pendingCenterNodeId.current = nodeId as string;
    },
    [place, surfaceId],
  );
  useEffect(() => {
    const id = pendingCenterNodeId.current;
    if (!id) return;
    const n = nodes.find((node) => node._id === id);
    if (!n) return; // not in the list yet; the next nodes update retries
    pendingCenterNodeId.current = null;
    panTo(
      n.position.x + n.dimensions.width / 2,
      n.position.y + n.dimensions.height / 2,
      window.innerWidth,
      window.innerHeight,
    );
  }, [nodes, panTo]);

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
      data-tour="tour-whiteboard"
      className="relative w-full h-screen overflow-hidden bg-paper touch-none"
      style={{
        cursor: isPanning ? "grabbing" : marqueeRect ? "crosshair" : "default",
        backgroundImage: "radial-gradient(circle, #E7E1D4 1px, transparent 1px)",
        // Screen-space grid: constant dot size/spacing at every zoom level;
        // only pan shifts the pattern.
        backgroundSize: "24px 24px",
        backgroundPosition: `${vp.x}px ${vp.y}px`,
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
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
            selected={isSelected(n._id as string)}
            posOverride={renderPos(n._id as string, n.position)}
            onPointerDownNode={(mods) => handleNodeDown(n._id as string, mods)}
            onDragDelta={handleNodeDragDelta}
            onDragEnd={handleNodeDragEnd}
            startAiMode={aiModeId === (n._id as string)}
            onClearAiMode={() => setAiModeId(null)}
            onGenerateImage={(prompt) => void handleGenerateImage(n._id as string, prompt)}
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

      {menu && (
        <CanvasMenu
          x={menu.x}
          y={menu.y}
          onAddText={() => void addTextAt(menu.world)}
          onGenerate={() => void addTextAt(menu.world, true)}
          onUpload={() => promptMenuUpload(menu.world)}
          onClose={() => setMenu(null)}
        />
      )}

      {/* hidden picker for the menu's "Upload image" action */}
      <input
        ref={menuFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onMenuFile(e)}
      />

      <SelectionLayer rect={marqueeRect} />

      <SelectionActions count={selected.size} onDelete={deleteSelected} onClear={clear} />

      <Legend />

      <Inbox
        captures={inbox}
        onPlace={(c) => void handlePlace(c._id)}
        onDismiss={(c) => void softDelete({ captureId: c._id })}
      />

      {/* Minimap: only visible when there are nodes on the board */}
      <Minimap nodes={nodes} vp={vp} onPan={handleMinimapPan} />

      <Toolbar
        onAdd={() => void addCard()}
        onGather={() => void handleGather()}
        onCenterBoard={handleCenterBoard}
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
