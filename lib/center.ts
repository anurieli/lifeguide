// ============================================================================
// Pure op-planning for the Center.
// ============================================================================
// Given a pillar's CURRENT files and the FileOps a synthesis pass emitted, decide
// what to actually do: create new files, update existing ones, or hold a change as
// "pending" because it contradicts held truth. This is deliberately pure (no Convex,
// no network) so the routing rules are unit-tested in isolation. The orchestration
// that calls it lives in convex/center.ts. See agents/center/synthesis.ts for FileOp.
// ============================================================================

import type { FileOp } from "../agents/center/synthesis";

/** A file already on record for the pillar (only what planning needs). */
export type ExistingFile = { id: string; name: string };

export type PlannedOp =
  | { type: "create"; name: string; kind: string; content: string }
  | { type: "update"; targetId: string; name: string; kind: string; content: string }
  | { type: "pending"; targetId: string; name: string; kind: string; content: string; note: string };

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Resolve emitted FileOps against the pillar's existing files.
 *
 * Routing rules (name match is authoritative; the op label is only a hint):
 * - The op name matches an existing file:
 *     - contradiction set  -> "pending" (held for the person; never overwrites)
 *     - otherwise          -> "update"  (refine the held file)
 * - No match -> "create".
 * Multiple emitted ops for the same new name collapse into one create (last wins),
 * so a single pass can never produce two files with the same name.
 */
export function planFileOps(existing: ExistingFile[], ops: FileOp[]): PlannedOp[] {
  const byName = new Map(existing.map((f) => [norm(f.name), f.id]));
  const planned: PlannedOp[] = [];
  const createIndexByName = new Map<string, number>(); // norm name -> index into planned

  for (const op of ops) {
    const name = op.name.trim();
    const content = op.content.trim();
    if (!name || !content) continue; // nothing to file
    const kind = op.kind.trim() || "fact";
    const key = norm(name);
    const targetId = byName.get(key);

    if (targetId) {
      if (op.contradiction && op.contradiction.trim()) {
        planned.push({ type: "pending", targetId, name, kind, content, note: op.contradiction.trim() });
      } else {
        planned.push({ type: "update", targetId, name, kind, content });
      }
      continue;
    }

    // No existing file by this name — create, collapsing duplicates within this batch.
    const dup = createIndexByName.get(key);
    if (dup !== undefined) {
      planned[dup] = { type: "create", name, kind, content };
    } else {
      createIndexByName.set(key, planned.length);
      planned.push({ type: "create", name, kind, content });
    }
  }

  return planned;
}
