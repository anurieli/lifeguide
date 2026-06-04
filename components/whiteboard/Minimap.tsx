"use client";

import { useCallback } from "react";
import { NodeDoc, Viewport } from "@/lib/types";

// ---- layout constants --------------------------------------------------
const MAP_W = 148; // minimap panel width in px
const MAP_H = 100; // minimap panel height in px
const PAD = 20;    // world-space padding around node bounding box

interface MinimapProps {
  nodes: NodeDoc[];
  vp: Viewport;
  // Called when the user clicks a minimap region; caller pans the viewport.
  onPan: (wx: number, wy: number) => void;
}

export function Minimap({ nodes, vp, onPan }: MinimapProps) {
  // Compute world-space bounding box of all nodes.
  const bounds = computeBounds(nodes);

  // Scale factor that fits the world bounding box into the minimap area.
  const worldW = bounds.w + PAD * 2;
  const worldH = bounds.h + PAD * 2;
  const scaleX = MAP_W / worldW;
  const scaleY = MAP_H / worldH;
  const mapScale = Math.min(scaleX, scaleY, 1); // never magnify past 1:1

  // Offset applied to world coords when projecting onto the minimap SVG.
  const offX = -bounds.minX + PAD;
  const offY = -bounds.minY + PAD;

  // The viewport rect projected into the minimap.
  // Viewport transform: screenX = wx * vp.scale + vp.x  =>  wx = (screenX - vp.x) / vp.scale
  // Visible world region: from (0,0) to (screenW, screenH) in screen space.
  const sw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const sh = typeof window !== "undefined" ? window.innerHeight : 800;
  const visX = (-vp.x / vp.scale + offX) * mapScale;
  const visY = (-vp.y / vp.scale + offY) * mapScale;
  const visW = (sw / vp.scale) * mapScale;
  const visH = (sh / vp.scale) * mapScale;

  // Convert a minimap click (local SVG coords) back to a world coordinate.
  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      // Invert the minimap projection.
      const wx = lx / mapScale - offX;
      const wy = ly / mapScale - offY;
      onPan(wx, wy);
    },
    [mapScale, offX, offY, onPan],
  );

  if (nodes.length === 0) return null;

  return (
    <div
      className="fixed bottom-24 right-4 z-20 rounded-xl overflow-hidden shadow-md"
      style={{
        width: MAP_W + 2,   // +2 for border
        height: MAP_H + 2,
        background: "#F3EFE5",
        border: "1px solid #E7E1D4",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <svg
        width={MAP_W}
        height={MAP_H}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        style={{ display: "block", cursor: "crosshair" }}
        onClick={handleClick}
      >
        {/* Node rects */}
        {nodes.map((n) => {
          const x = (n.position.x + offX) * mapScale;
          const y = (n.position.y + offY) * mapScale;
          const w = Math.max(2, n.dimensions.width * mapScale);
          const h = Math.max(2, n.dimensions.height * mapScale);
          return (
            <rect
              key={n._id}
              x={x}
              y={y}
              width={w}
              height={h}
              rx={Math.max(1, 3 * mapScale)}
              fill="#FFFFFF"
              stroke="#B6AE9D"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Viewport indicator */}
        <rect
          x={Math.max(0, visX)}
          y={Math.max(0, visY)}
          width={Math.min(MAP_W, visW)}
          height={Math.min(MAP_H, visH)}
          rx={2}
          fill="rgba(30,58,95,0.06)"
          stroke="#1E3A5F"
          strokeWidth={1}
          strokeDasharray="3 2"
          style={{ pointerEvents: "none" }}
        />
      </svg>
    </div>
  );
}

// ---- helpers -----------------------------------------------------------

interface Bounds {
  minX: number;
  minY: number;
  w: number;
  h: number;
}

function computeBounds(nodes: NodeDoc[]): Bounds {
  if (nodes.length === 0) return { minX: 0, minY: 0, w: 600, h: 400 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + n.dimensions.width);
    maxY = Math.max(maxY, n.position.y + n.dimensions.height);
  }
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}
