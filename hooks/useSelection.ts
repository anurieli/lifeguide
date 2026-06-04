import { useCallback, useState } from "react";
import { SelectionMods, nextSelectionOnClick } from "@/lib/selection";

// Owns the ephemeral selection set for the vision board. Nothing here touches
// Convex — selection is pure UI state that lives for the length of a session.
export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const clear = useCallback(() => {
    setSelected((s) => (s.size === 0 ? s : new Set()));
  }, []);

  // Replace the selection with exactly these ids (used by single-click + marquee).
  const replace = useCallback((ids: Iterable<string>) => {
    setSelected(new Set(ids));
  }, []);

  // Apply a modifier-aware click (replace / add / toggle).
  const clickNode = useCallback((id: string, mods: SelectionMods) => {
    setSelected((s) => nextSelectionOnClick(s, id, mods));
  }, []);

  return { selected, isSelected, clear, replace, clickNode, setSelected };
}
