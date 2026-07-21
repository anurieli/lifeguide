// Pure logic behind the feedback widget's image attachments (components/feedback/FeedbackWidget.tsx).
// Kept separate from the component so the accept/cap/filter rule is unit-testable without
// mounting React or touching the DOM (URL.createObjectURL, refs, etc. stay in the component).

// Given how many images are already attached and a batch of incoming files (from a file
// picker or a paste event), returns the subset that should be accepted: non-images are
// dropped, and the batch is capped so the total never exceeds `max`. Order is preserved;
// files past the cap are silently dropped (same as files past the cap in the same batch).
export function acceptImageFiles<F extends { type: string }>(
  currentCount: number,
  files: Iterable<F>,
  max: number,
): F[] {
  const accepted: F[] = [];
  let count = currentCount;
  for (const f of files) {
    if (!f.type.startsWith("image/")) continue;
    if (count >= max) break;
    accepted.push(f);
    count++;
  }
  return accepted;
}
