"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ChevronDown, ChevronRight, GitBranch, Loader2, RefreshCw, X } from "lucide-react";
import { layoutThoughtMap } from "@/lib/thoughtMapLayout";
import { ThoughtMapEdge, ThoughtMapNode } from "@/lib/thoughtMap";

/**
 * The post-hoc thought map surface (ARI-18): reads only the user's own captures
 * (never the interviewer's replies, see convex/ai/thoughtMap.ts), distilled into
 * a hierarchy. Desktop renders it as a hand-rolled SVG graph (layered by level,
 * lib/thoughtMapLayout.ts computes the positions); phone hides the graph and
 * renders the same data as a collapsible outline instead — same map, calm on
 * a small screen. Owns its own query + the (re)generate mutation, so the caller
 * (SessionDoc) just decides when the panel is open.
 */

type MapDoc = NonNullable<FunctionReturnType<typeof api.sessions.thoughtMap>>;

const EDGE_STROKE = "#9C9586";
const LINE = "#E7E1D4";
const GOLD = "#B8945A";
const INK = "#1A1D24";
const INK_MUTE = "#8A8F9C";

// Rough char budget for a box of this width; long labels already got trimmed to
// 80 chars server-side, this just keeps the SVG text from spilling past its box.
function fitLabel(label: string, width: number): string {
  const budget = Math.max(4, Math.floor((width - 16) / 6.2));
  return label.length <= budget ? label : `${label.slice(0, budget - 1)}…`;
}

function ThoughtGraph({ nodes, edges, rootId }: { nodes: ThoughtMapNode[]; edges: ThoughtMapEdge[]; rootId?: string }) {
  const layout = useMemo(() => layoutThoughtMap(nodes, edges), [nodes, edges]);
  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <div className="hidden md:block overflow-auto">
      <svg width={Math.max(layout.width, 1)} height={Math.max(layout.height, 1)}>
        <defs>
          <marker id="tm-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={EDGE_STROKE} />
          </marker>
        </defs>
        {layout.edges.map((e, i) => (
          <path
            key={`${e.from}-${e.to}-${i}`}
            d={e.path}
            fill="none"
            stroke={EDGE_STROKE}
            strokeOpacity={0.55}
            strokeWidth={1.5}
            strokeDasharray={e.kind === "relates" ? "4 3" : undefined}
            markerEnd={e.kind === "leads_to" ? "url(#tm-arrow)" : undefined}
          />
        ))}
        {layout.nodes.map((p) => {
          const n = nodesById.get(p.id);
          if (!n) return null;
          const isRoot = n.id === rootId;
          const superseded = n.status === "superseded";
          return (
            <g key={p.id} opacity={superseded ? 0.55 : 1}>
              <title>{n.detail ?? n.label}</title>
              <rect
                x={p.x}
                y={p.y}
                width={p.width}
                height={p.height}
                rx={10}
                fill={isRoot ? "#B8945A14" : "#FFFFFF"}
                stroke={isRoot ? GOLD : LINE}
                strokeWidth={isRoot ? 2 : 1.25}
              />
              <text
                x={p.x + p.width / 2}
                y={p.y + p.height / 2 + 4}
                textAnchor="middle"
                fontSize={11.5}
                fill={superseded ? INK_MUTE : INK}
                textDecoration={superseded ? "line-through" : undefined}
              >
                {fitLabel(n.label, p.width)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ThoughtOutline({ nodes, edges, rootId }: { nodes: ThoughtMapNode[]; edges: ThoughtMapEdge[]; rootId?: string }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { childrenOf, roots, byId, leadsTo } = useMemo(() => {
    const idSet = new Set(nodes.map((n) => n.id));
    const childrenOf = new Map<string, ThoughtMapNode[]>();
    const roots: ThoughtMapNode[] = [];
    for (const n of nodes) {
      if (n.parentId && idSet.has(n.parentId)) {
        if (!childrenOf.has(n.parentId)) childrenOf.set(n.parentId, []);
        childrenOf.get(n.parentId)!.push(n);
      } else {
        roots.push(n);
      }
    }
    const leadsTo = new Map<string, ThoughtMapEdge[]>();
    for (const e of edges) {
      if (e.kind !== "leads_to") continue;
      if (!leadsTo.has(e.from)) leadsTo.set(e.from, []);
      leadsTo.get(e.from)!.push(e);
    }
    return { childrenOf, roots, byId: new Map(nodes.map((n) => [n.id, n])), leadsTo };
  }, [nodes, edges]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderNode = (n: ThoughtMapNode, depth: number): React.ReactNode => {
    const kids = childrenOf.get(n.id) ?? [];
    const isCollapsed = collapsed.has(n.id);
    const isRoot = n.id === rootId;
    const superseded = n.status === "superseded";
    const outgoing = leadsTo.get(n.id) ?? [];
    return (
      <div key={n.id} style={{ marginLeft: depth * 16 }} className="mt-2.5 first:mt-0">
        <div className="flex items-start gap-1.5">
          {kids.length > 0 ? (
            <button
              type="button"
              onClick={() => toggle(n.id)}
              aria-label={isCollapsed ? "Expand" : "Collapse"}
              className="mt-0.5 shrink-0 text-ink-mute hover:text-ink"
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div
              className={`text-[13.5px] leading-snug ${
                superseded ? "text-ink-mute line-through" : isRoot ? "text-ink font-semibold" : "text-ink"
              }`}
            >
              {n.label}
            </div>
            {n.detail && <div className="text-[11.5px] text-ink-mute mt-0.5">{n.detail}</div>}
            {outgoing.map((e, i) => {
              const target = byId.get(e.to);
              if (!target) return null;
              return (
                <div key={i} className="text-[11px] text-gold mt-0.5">
                  → leads to: {target.label}
                </div>
              );
            })}
          </div>
        </div>
        {!isCollapsed && kids.map((k) => renderNode(k, depth + 1))}
      </div>
    );
  };

  return <div className="md:hidden flex flex-col">{roots.map((r) => renderNode(r, 0))}</div>;
}

export function ThoughtMapView({ sessionId, onClose }: { sessionId: Id<"sessions">; onClose: () => void }) {
  const map = useQuery(api.sessions.thoughtMap, { sessionId });
  const requestThoughtMap = useMutation(api.sessions.requestThoughtMap);

  const remap = () => void requestThoughtMap({ sessionId });

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch md:items-center md:justify-center bg-black/25 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ml-auto md:ml-0 w-full max-w-[420px] md:max-w-[760px] h-full md:max-h-[80vh] md:h-auto md:rounded-2xl bg-card border border-line shadow-xl flex flex-col"
      >
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-line md:px-6">
          <GitBranch className="w-4 h-4 text-gold" />
          <h2 className="flex-1 text-[14px] font-medium text-ink">Thought map</h2>
          {map?.status === "done" && (
            <button
              type="button"
              onClick={remap}
              className="flex items-center gap-1.5 text-[12px] text-ink-mute hover:text-gold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Remap
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-mute hover:text-ink">
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 md:p-6">
          <MapBody map={map} onRetry={remap} />
        </div>
      </div>
    </div>
  );
}

function MapBody({ map, onRetry }: { map: MapDoc | null | undefined; onRetry: () => void }) {
  if (map === undefined) {
    return <p className="text-[13px] text-ink-mute">Loading…</p>;
  }
  if (map === null || map.status === "pending") {
    return <p className="text-[13px] text-ink-mute animate-pulse">mapping your thinking…</p>;
  }
  if (map.status === "error") {
    return (
      <p className="text-[13px] text-ink-mute">
        {map.error ?? "Couldn't map this one."}{" "}
        <button type="button" onClick={onRetry} className="text-gold">
          Try again
        </button>
      </p>
    );
  }
  if (map.nodes.length === 0) {
    return <p className="text-[13px] text-ink-mute">Nothing to map yet.</p>;
  }
  return (
    <>
      <ThoughtGraph nodes={map.nodes} edges={map.edges} rootId={map.rootId} />
      <ThoughtOutline nodes={map.nodes} edges={map.edges} rootId={map.rootId} />
    </>
  );
}
