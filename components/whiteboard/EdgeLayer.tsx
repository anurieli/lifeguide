"use client";

import { EdgeDoc, NodeDoc } from "@/lib/types";

// Renders connections as subtle curves between node centers, with an optional label chip.
// Lives inside the transformed canvas layer, so coordinates are in canvas space.
export function EdgeLayer({
  edges,
  nodes,
  onRemove,
}: {
  edges: EdgeDoc[];
  nodes: NodeDoc[];
  onRemove?: (edgeId: EdgeDoc["_id"]) => void;
}) {
  const byId = new Map(nodes.map((n) => [n._id, n]));
  const center = (n: NodeDoc) => ({
    x: n.position.x + n.dimensions.width / 2,
    y: n.position.y + n.dimensions.height / 2,
  });

  return (
    <svg className="absolute left-0 top-0 overflow-visible pointer-events-none" width={1} height={1}>
      {edges.map((e) => {
        const a = byId.get(e.fromNode);
        const b = byId.get(e.toNode);
        if (!a || !b) return null;
        const p = center(a);
        const q = center(b);
        const mx = (p.x + q.x) / 2;
        const my = (p.y + q.y) / 2;
        return (
          <g key={e._id}>
            <line
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              stroke="#9C9586"
              strokeOpacity={0.45}
              strokeWidth={1.5}
            />
            {e.label && (
              <g
                className="pointer-events-auto cursor-pointer"
                onClick={() => onRemove?.(e._id)}
              >
                <rect
                  x={mx - e.label.length * 3.6 - 6}
                  y={my - 9}
                  width={e.label.length * 7.2 + 12}
                  height={18}
                  rx={9}
                  fill="#FFFFFF"
                  stroke="#E7E1D4"
                />
                <text
                  x={mx}
                  y={my + 3}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#444B58"
                >
                  {e.label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
