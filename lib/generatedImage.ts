// Shared, pure view logic for `generated_image` nodes on the Vision Board.
// Kept out of the React components so both the desktop card (NodeCard) and the
// phone list (MobileBoard) render the same states, and so the precedence can be
// unit-tested without a DOM.

export type GeneratedImageState = "generating" | "error" | "ready" | "pending";

// Which visual a generated_image card should show.
//
// `generating` deliberately wins over a present image: a **redo** re-runs the
// same node, and the previous image's `fileId` lingers until the new one is
// filed back. Keying off the image alone would flash the stale picture instead
// of the spinner, so the "generating" flag takes precedence while it is set.
export function generatedImageState(
  attribution: string | undefined,
  hasImage: boolean,
): GeneratedImageState {
  if (attribution === "generating") return "generating";
  if (attribution === "error") return "error";
  if (hasImage) return "ready";
  return "pending";
}

// The prompt a Redo / Try-again / Edit-prompt action starts from: the node's own
// text, which is where the generate flow stores the prompt. Never undefined so it
// can seed a controlled textarea directly.
export function redoPromptFor(text: string | undefined): string {
  return text ?? "";
}
