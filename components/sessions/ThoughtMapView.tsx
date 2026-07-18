"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ChevronDown, ChevronRight, GitBranch, RefreshCw } from "lucide-react";
import { fitToContainer, layoutThoughtMap } from "@/lib/thoughtMapLayout";
import { ThoughtMapEdge, ThoughtMapNode } from "@/lib/thoughtMap";

/**
 * The thought map (ARI-18, UX rework): a VIEW of the session document, not a
 * popup — SessionDoc's view switcher swaps the page's content into this in
 * place of the thoughts feed. Reads only the user's own captures (never the
 * interviewer's replies, see convex/ai/thoughtMap.ts), distilled into a
 * hierarchy. Desktop renders it as a hand-rolled SVG graph, scaled via viewBox
 * to fit the container without scrolling (lib/thoughtMapLayout.ts's
 * fitToContainer; huge maps clamp at a readable minimum and fall back to
 * pan/scroll). Phone hides the graph and renders the same data as a
 * collapsible outline instead — same map, calm on a small screen. The map now
 * builds itself in the background as a session fills up (no tap required);
 * this component only owns the on-demand "Map now" / "Remap" affordances.
 */

type MapDoc = NonNullable<FunctionReturnType<typeof api.sessions.thoughtMap>>;

const LINE = "#E7E1D4";
const GOLD = "#B8945A";
const INK = "#1A1D24";
const INK_MUTE = "#8A8F9C";

// Flow-first (directive 5): leads_to is the visual spine — solid, arrowed,
// heaviest. part_of is a light structural (tree) line. relates is the
// thinnest, dashed. Kept inside the existing muted/stone/gold palette.
const EDGE_STYLE: Record<
  ThoughtMapEdge["kind"],
  { stroke: string; width: number; opacity: number; dash?: string }
> = {
  leads_to: { stroke: GOLD, width: 2.25, opacity: 0.85 },
  part_of: { stroke: LINE, width: 1.25, opacity: 0.75 },
  relates: { stroke: "#9C9586", width: 1, opacity: 0.45, dash: "4 3" },
};

// Rough char budget for a box of this width; long labels already got trimmed to
// 80 chars server-side, this just keeps the SVG text from spilling past its box.
function fitLabel(label: string, width: number): string {
  const budget = Math.max(4, Math.floor((width - 16) / 6.2));
  return label.length <= budget ? label : `${label.slice(0, budget - 1)}…`;
}

// Measures a container's rendered size so the graph can scale to fit it.
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, size };
}

function ThoughtGraph({
  nodes,
  edges,
  rootId,
}: {
  nodes: ThoughtMapNode[];
  edges: ThoughtMapEdge[];
  rootId?: string;
}) {
  const layout = useMemo(() => layoutThoughtMap(nodes, edges), [nodes, edges]);
  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const { ref, size } = useElementSize<HTMLDivElement>();
  const fit = useMemo(
    () => fitToContainer(layout, size.width, size.height),
    [layout, size.width, size.height],
  );
  const svgWidth = Math.max(layout.width * fit.scale, 1);
  const svgHeight = Math.max(layout.height * fit.scale, 1);

  return (
    <div
      ref={ref}
      className={`hidden md:flex h-full w-full items-center justify-center ${
        fit.fitsWithoutScroll ? "overflow-hidden" : "overflow-auto"
      }`}
    >
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${Math.max(layout.width, 1)} ${Math.max(layout.height, 1)}`}>
        <defs>
          <marker id="tm-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={GOLD} />
          </marker>
        </defs>
        {layout.edges.map((e, i) => {
          const style = EDGE_STYLE[e.kind];
          return (
            <path
              key={`${e.from}-${e.to}-${i}`}
              d={e.path}
              fill="none"
              stroke={style.stroke}
              strokeOpacity={style.opacity}
              strokeWidth={style.width}
              strokeDasharray={style.dash}
              markerEnd={e.kind === "leads_to" ? "url(#tm-arrow)" : undefined}
            />
          );
        })}
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
                strokeWidth={isRoot ? 2.5 : 1.25}
              />
              <text
                x={p.x + p.width / 2}
                y={p.y + p.height / 2 + 4}
                textAnchor="middle"
                fontSize={isRoot ? 12.5 : 11.5}
                fontWeight={isRoot ? 700 : 400}
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

  return (
    <div className="md:hidden flex flex-col overflow-y-auto h-full">
      {roots.map((r) => renderNode(r, 0))}
    </div>
  );
}

// The calm empty state: shown before a map has ever been requested or auto-generated.
function EmptyState({ onRequest }: { onRequest: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-10">
      <GitBranch className="w-5 h-5 text-ink-mute" />
      <p className="text-[13.5px] text-ink-mute max-w-[280px]">
        Your map builds itself shortly after you finish dumping.
      </p>
      <button
        type="button"
        onClick={onRequest}
        className="h-9 px-4 rounded-full border border-line-2 text-[12.5px] text-ink-mute hover:text-gold hover:border-gold transition"
      >
        Map now
      </button>
    </div>
  );
}

export function ThoughtMapView({ sessionId }: { sessionId: Id<"sessions"> }) {
  const map = useQuery(api.sessions.thoughtMap, { sessionId });
  const requestThoughtMap = useMutation(api.sessions.requestThoughtMap);
  const remap = () => void requestThoughtMap({ sessionId });

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <MapBody map={map} onRequest={remap} onRetry={remap} />
    </div>
  );
}

function MapBody({
  map,
  onRequest,
  onRetry,
}: {
  map: MapDoc | null | undefined;
  onRequest: () => void;
  onRetry: () => void;
}) {
  if (map === undefined) {
    return <p className="text-center text-[13px] text-ink-mute py-10">Loading…</p>;
  }
  if (map === null) {
    return <EmptyState onRequest={onRequest} />;
  }
  if (map.status === "pending") {
    return <p className="text-center text-[13px] text-ink-mute animate-pulse py-10">mapping your thinking…</p>;
  }
  if (map.status === "error") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-10">
        <p className="text-[13px] text-ink-mute">{map.error ?? "Couldn't map this one."}</p>
        <button type="button" onClick={onRetry} className="text-[12.5px] text-gold">
          Try again
        </button>
      </div>
    );
  }
  if (map.nodes.length === 0) {
    return <EmptyState onRequest={onRequest} />;
  }
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex justify-end px-1 pb-2 shrink-0">
        <button
          type="button"
          onClick={onRequest}
          className="flex items-center gap-1.5 text-[12px] text-ink-mute hover:text-gold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Remap
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <ThoughtGraph nodes={map.nodes} edges={map.edges} rootId={map.rootId} />
        <ThoughtOutline nodes={map.nodes} edges={map.edges} rootId={map.rootId} />
      </div>
    </div>
  );
}
