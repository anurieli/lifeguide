"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// The Life Wheel (ARI-11): the always-on precise working view onto the pillars — the
// domains that make a person, as one object the Core, Sessions, goals, and the Coach all
// read/write (docs/product/features/pillars.md). Deliberately NOT the North Star of the
// four brainstormed concepts (Temple / Orbit / Tree were the soulful-hero alternatives) —
// this is the plain, legible radar the Definition of Done asked to ship first.
//
// Identity is excluded on purpose: it is what the pillars hold up, not one of them (see
// docs/decisions/0022-identity-is-not-a-pillar.md). `pillars.wheel` already filters it out.

const SIZE = 340;
const CENTER = SIZE / 2;
const MAX_RADIUS = 118;
const RINGS = [25, 50, 75, 100];

function pointFor(angle: number, radius: number): { x: number; y: number } {
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

function polygonPoints(angles: number[], radiusOf: (i: number) => number): string {
  return angles.map((a, i) => { const p = pointFor(a, radiusOf(i)); return `${p.x},${p.y}`; }).join(" ");
}

export function PillarWheel() {
  const wheel = useQuery(api.pillars.wheel, {});
  const setStrength = useMutation(api.pillars.setStrength);
  const [draft, setDraft] = useState<Record<string, number>>({});

  const n = wheel?.length ?? 0;
  const angles = useMemo(
    () => Array.from({ length: n }, (_, i) => -Math.PI / 2 + (i * 2 * Math.PI) / n),
    [n],
  );

  if (wheel === undefined) {
    return <div className="text-[13px] text-ink-mute py-8 text-center">Loading your pillars…</div>;
  }
  if (wheel.length === 0) {
    return (
      <div className="text-[13px] text-ink-mute py-8 text-center">
        No pillars yet — they seed automatically once your Core is set up.
      </div>
    );
  }

  const strengthOf = (i: number) => draft[wheel[i]._id] ?? wheel[i].strength;

  return (
    <div className="bg-card border border-line rounded-2xl p-5 mb-9">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[20px] text-ink font-semibold">Life Wheel</h2>
        <span className="text-[11px] tracking-wide uppercase text-ink-mute">the pillars, at a glance</span>
      </div>
      <p className="text-[13.5px] text-ink-mute leading-relaxed mb-4 max-w-[600px]">
        Every point is a domain you&apos;re building — not just this one node. Identity isn&apos;t on the
        wheel; it&apos;s what these hold up. Drag a slider to rate how strong that part of your life
        feels right now.
      </p>

      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="flex-shrink-0">
          {/* Rings */}
          {RINGS.map((r) => (
            <polygon
              key={r}
              points={polygonPoints(angles, () => (MAX_RADIUS * r) / 100)}
              fill="none"
              stroke="#E7E1D4"
              strokeWidth={1}
            />
          ))}
          {/* Axes */}
          {angles.map((a, i) => {
            const p = pointFor(a, MAX_RADIUS);
            return <line key={i} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke="#E7E1D4" strokeWidth={1} />;
          })}
          {/* The strength polygon */}
          <polygon
            points={polygonPoints(angles, (i) => (MAX_RADIUS * strengthOf(i)) / 100)}
            fill="#B8945A"
            fillOpacity={0.22}
            stroke="#B8945A"
            strokeWidth={2}
          />
          {/* Vertices + labels */}
          {wheel.map((p, i) => {
            const vertex = pointFor(angles[i], (MAX_RADIUS * strengthOf(i)) / 100);
            const label = pointFor(angles[i], MAX_RADIUS + 34);
            const anchor = Math.cos(angles[i]) > 0.2 ? "start" : Math.cos(angles[i]) < -0.2 ? "end" : "middle";
            return (
              <g key={p._id}>
                <circle
                  cx={vertex.x}
                  cy={vertex.y}
                  r={5}
                  fill={p.rated ? "#B8945A" : "#FFFFFF"}
                  stroke="#B8945A"
                  strokeWidth={2}
                />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  className="fill-ink"
                  style={{ fontSize: 11.5 }}
                >
                  {p.name}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="flex-1 w-full min-w-[220px] space-y-3">
          {wheel.map((p, i) => (
            <div key={p._id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] text-ink">{p.name}</span>
                <span className="text-[12px] text-ink-mute tabular-nums">
                  {strengthOf(i)}
                  {!p.rated && draft[p._id] === undefined ? " · unrated" : ""}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={strengthOf(i)}
                onChange={(e) => setDraft((d) => ({ ...d, [p._id]: Number(e.target.value) }))}
                onMouseUp={(e) =>
                  void setStrength({
                    pillarId: p._id as Id<"pillars">,
                    strength: Number((e.target as HTMLInputElement).value),
                  })
                }
                onTouchEnd={(e) =>
                  void setStrength({
                    pillarId: p._id as Id<"pillars">,
                    strength: Number((e.target as HTMLInputElement).value),
                  })
                }
                className="w-full accent-gold"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
