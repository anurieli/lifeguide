// Pure state logic for the in-place mantra editor (MantraStep in
// components/today/RitualSequence.tsx, ARI-144). In the Morning Scroll the mantra
// line is editable in place: tap it, retype, and a blur or Enter commits. The React
// component owns only the focus/keyboard wiring; every decision about what a commit
// DOES lives here, so all three paths (save, cancel, and a failed save) are
// unit-testable with no DOM (this repo's tests run in a node environment, no
// React testing library).

export interface MantraEditorState {
  editing: boolean;
  draft: string;
}

export interface MantraCommit {
  // The editor state right after an optimistic commit (before any save resolves).
  state: MantraEditorState;
  // The trimmed line to persist as the person's fixed mantra, or null when the
  // commit is a cancel (empty or unchanged) and nothing should be written.
  persist: string | null;
}

// Commit the current draft (a blur or Enter press). The draft is trimmed. An empty
// draft, or one equal to the line already resolved for the day, is a CANCEL: the
// editor closes and nothing is persisted (the resolved line stands). Any other line
// asks to persist the trimmed text and closes the editor optimistically.
export function commitMantra(state: MantraEditorState, resolved: string): MantraCommit {
  const next = state.draft.trim();
  if (!next || next === resolved) {
    return { state: { editing: false, draft: resolved }, persist: null };
  }
  return { state: { editing: false, draft: next }, persist: next };
}

// A persist that rejected (the save mutation threw). Keep the person's words and
// reopen the editor so a blur never silently swallows an edit the server did not
// accept; they can retry or Escape out. (ARI-144 failure path.)
export function reopenAfterFailedSave(content: string): MantraEditorState {
  return { editing: true, draft: content };
}

// Escape / explicit cancel: drop the draft back to the resolved line and close.
export function cancelMantra(resolved: string): MantraEditorState {
  return { editing: false, draft: resolved };
}
