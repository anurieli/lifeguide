// Pure validation + normalization for the post-hoc thought map (ARI-18). The model
// returns untrusted JSON; this turns it into exactly the shape the `thoughtMaps`
// table expects: dedupe ids, drop dangling edges, clamp text, and derive each
// node's level (depth from its nearest root) and the map's rootId (the root with
// the most descendants) from the nodes' parentId chains. Pure so it runs in unit
// tests and in convex/ai/thoughtMap.ts alike.

export type ThoughtMapNodeStatus = "active" | "superseded";
export type ThoughtMapEdgeKind = "leads_to" | "part_of" | "relates";

export type ThoughtMapNode = {
  id: string;
  label: string;
  detail?: string;
  level: number;
  status: ThoughtMapNodeStatus;
  parentId?: string;
};

export type ThoughtMapEdge = {
  from: string;
  to: string;
  kind: ThoughtMapEdgeKind;
  label?: string;
};

export type NormalizedThoughtMap = {
  nodes: ThoughtMapNode[];
  edges: ThoughtMapEdge[];
  rootId?: string;
};

const LABEL_CAP = 80;
const DETAIL_CAP = 300;
const EDGE_LABEL_CAP = 60;
const EDGE_KINDS = new Set<string>(["leads_to", "part_of", "relates"]);

// The steering memo's server-side cap (ARI-18 teachable map): shared by
// convex/settings.ts (what gets stored) and buildMapSystemPrompt below (belt and
// suspenders — never trust a memo reaching the prompt is already capped).
export const THOUGHT_MAP_MEMO_CAP = 2000;

const MEMO_HEADER =
  "The user's standing guidance for how they want their thinking mapped — follow it even where it overrides the defaults above:";

/**
 * Folds the person's steering memo into the thought-map task's base system
 * prompt, as a clearly-fenced section (ARI-18 teachable map) — so the model
 * reads it unambiguously as user-authored guidance, not part of the base
 * instructions. An empty or whitespace-only memo appends nothing: absent memo
 * is the unchanged default behavior. Pure so it's unit-testable and shared
 * between convex/ai/thoughtMap.ts and its tests.
 */
export function buildMapSystemPrompt(base: string, memo?: string | null): string {
  const trimmed = memo?.trim().slice(0, THOUGHT_MAP_MEMO_CAP);
  if (!trimmed) return base;
  return `${base}\n\n---\n${MEMO_HEADER}\n${trimmed}\n---`;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

type RawNode = {
  id: string;
  label: string;
  detail?: string;
  status: ThoughtMapNodeStatus;
  parentId?: string;
};

export function normalizeThoughtMap(raw: unknown): NormalizedThoughtMap | { error: string } {
  if (!isRecord(raw) || !Array.isArray(raw.nodes)) {
    return { error: "malformed thought map: no nodes array" };
  }

  // ---- nodes: validate shape, dedupe ids (first occurrence wins), clamp text ----
  const seen = new Set<string>();
  const rawNodes: RawNode[] = [];
  for (const n of raw.nodes) {
    if (!isRecord(n)) continue;
    const id = typeof n.id === "string" ? n.id.trim() : "";
    const label = typeof n.label === "string" ? n.label.trim() : "";
    if (!id || !label) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    const detail =
      typeof n.detail === "string" && n.detail.trim()
        ? n.detail.trim().slice(0, DETAIL_CAP)
        : undefined;
    const status: ThoughtMapNodeStatus = n.status === "superseded" ? "superseded" : "active";
    const parentId =
      typeof n.parentId === "string" && n.parentId.trim() ? n.parentId.trim() : undefined;
    rawNodes.push({ id, label: label.slice(0, LABEL_CAP), detail, status, parentId });
  }
  if (rawNodes.length === 0) return { error: "no valid nodes" };

  const idSet = new Set(rawNodes.map((n) => n.id));

  // A parentId pointing at a missing node (or itself) is not a real parent —
  // treat that node as its own root instead of dropping it.
  const parentOf = new Map<string, string>();
  for (const n of rawNodes) {
    if (n.parentId && n.parentId !== n.id && idSet.has(n.parentId)) {
      parentOf.set(n.id, n.parentId);
    }
  }

  // Cycle guard: a chain that revisits a node it already passed through would
  // recurse forever when deriving levels. Break each cycle once, at the first
  // node (in input order) that walks back into its own ancestry.
  for (const n of rawNodes) {
    const visited = new Set<string>();
    let cur: string | undefined = n.id;
    while (cur) {
      if (visited.has(cur)) {
        parentOf.delete(n.id);
        break;
      }
      visited.add(cur);
      cur = parentOf.get(cur);
    }
  }

  // ---- levels: depth from the nearest root (a node with no effective parent) ----
  const levelCache = new Map<string, number>();
  function levelOf(id: string): number {
    const cached = levelCache.get(id);
    if (cached !== undefined) return cached;
    const parent = parentOf.get(id);
    const level = parent ? levelOf(parent) + 1 : 0;
    levelCache.set(id, level);
    return level;
  }
  for (const n of rawNodes) levelOf(n.id);

  // ---- rootId: allow multiple roots (this is honest — a session can circle more
  // than one thing), but name the one with the most descendants as the crown. ----
  const roots = rawNodes.filter((n) => !parentOf.has(n.id)).map((n) => n.id);
  const descendantCount = new Map<string, number>(roots.map((r) => [r, 0]));
  for (const n of rawNodes) {
    let chainRoot = n.id;
    while (parentOf.has(chainRoot)) chainRoot = parentOf.get(chainRoot)!;
    if (n.id !== chainRoot && descendantCount.has(chainRoot)) {
      descendantCount.set(chainRoot, (descendantCount.get(chainRoot) ?? 0) + 1);
    }
  }
  let rootId: string | undefined;
  let best = -1;
  for (const r of roots) {
    const count = descendantCount.get(r) ?? 0;
    if (count > best) {
      best = count;
      rootId = r;
    }
  }

  const nodes: ThoughtMapNode[] = rawNodes.map((n) => ({
    id: n.id,
    label: n.label,
    ...(n.detail ? { detail: n.detail } : {}),
    level: levelOf(n.id),
    status: n.status,
    ...(parentOf.has(n.id) ? { parentId: parentOf.get(n.id)! } : {}),
  }));

  // ---- edges: drop anything referencing a missing/dropped node or an invalid kind ----
  const edges: ThoughtMapEdge[] = [];
  if (Array.isArray(raw.edges)) {
    for (const e of raw.edges) {
      if (!isRecord(e)) continue;
      const from = typeof e.from === "string" ? e.from.trim() : "";
      const to = typeof e.to === "string" ? e.to.trim() : "";
      const kind = typeof e.kind === "string" ? e.kind : "";
      if (!from || !to || !idSet.has(from) || !idSet.has(to) || !EDGE_KINDS.has(kind)) continue;
      const label =
        typeof e.label === "string" && e.label.trim()
          ? e.label.trim().slice(0, EDGE_LABEL_CAP)
          : undefined;
      edges.push({ from, to, kind: kind as ThoughtMapEdgeKind, ...(label ? { label } : {}) });
    }
  }

  return { nodes, edges, ...(rootId ? { rootId } : {}) };
}
