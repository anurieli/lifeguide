// Pure helpers for the session digest: assemble the model input from a session's
// captures, and the list-view fallback title when no digest exists yet. Pure so
// they run in unit tests and in Convex functions alike.

export type DigestCapture = {
  rawType: string;
  rawText?: string;
  extractedText?: string;
  createdAt: number;
};

const INPUT_CAP = 6000;
const TITLE_WORDS = 7;

/** The best text a capture currently has: what ingest derived, else what was typed. */
export function captureText(c: DigestCapture): string {
  return (c.extractedText ?? c.rawText ?? "").trim();
}

function chronological(captures: DigestCapture[]): DigestCapture[] {
  return [...captures].sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * The digest model input: every capture's text in chronological order, labeled by
 * kind, capped head-first (the opening of a session carries its theme).
 */
export function assembleDigestInput(captures: DigestCapture[], cap = INPUT_CAP): string {
  const parts: string[] = [];
  for (const c of chronological(captures)) {
    const text = captureText(c);
    if (!text) continue;
    const label = c.rawType === "audio" ? "spoken" : c.rawType === "image" ? "photo" : "written";
    parts.push(`[${label}] ${text}`);
  }
  return parts.join("\n\n").slice(0, cap);
}

/** List-view fallback when the digest hasn't run or failed: the entry's first words. */
export function fallbackTitle(captures: DigestCapture[]): string {
  const first = chronological(captures)
    .map(captureText)
    .find((t) => t.length > 0);
  if (!first) return "Recording";
  const words = first.split(/\s+/);
  return words.slice(0, TITLE_WORDS).join(" ") + (words.length > TITLE_WORDS ? "…" : "");
}
