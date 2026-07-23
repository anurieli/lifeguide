// ============================================================================
// The Listener's memory backbone (ARI-23) — pure helpers.
// ============================================================================
// Assembling the model input for the post-call summary pass, parsing its output,
// and building the opening handoff appended to LISTENER_INSTRUCTIONS for the next
// call. Pure (no Convex, no network) so this logic is unit-tested directly. The
// action that calls these lives in convex/ai/listenerMemory.ts; the handoff lands
// in agents/listener/persona.ts via convex/ai/voice/index.ts. See
// docs/decisions/0023-listener-memory-backbone.md.
// ============================================================================

export type SummaryTurn = { role: "coach" | "user"; text: string };

export type SessionSummary = {
  text: string;
  topics: string[];
  openThreads: string[];
};

/** One labeled block in the orb's "what it knows" panel — a source the person
 *  can actually make sense of, as opposed to the model's raw, undifferentiated
 *  prompt text. */
export type ContextSource = { label: string; detail: string };

const INPUT_CAP = 8_000;

/** The summarization model's input: the call transcript, speaker-labeled, capped. */
export function assembleSummaryInput(transcript: SummaryTurn[], cap = INPUT_CAP): string {
  const lines = transcript
    .map((t) => `${t.role === "user" ? "Person" : "Listener"}: ${t.text}`.trim())
    .filter((line) => line.length > 0 && !line.endsWith(":"));
  return lines.join("\n").slice(0, cap);
}

/**
 * Parse the model's JSON into a clean SessionSummary. Tolerates fenced/lead-in
 * prose (matches the tolerance pattern in agents/center/synthesis.ts). Returns
 * null when there is nothing usable — an empty/unparsable response, or a
 * response with no actual summary text.
 */
export function parseSessionSummary(raw: string): SessionSummary | null {
  let obj: Record<string, unknown> = {};
  try {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      obj = JSON.parse(m[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  const text = typeof obj.summary === "string" ? obj.summary.trim() : "";
  if (!text) return null;

  const strings = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())
      : [];

  return {
    text,
    topics: strings(obj.topics),
    openThreads: strings(obj.open_threads),
  };
}

/**
 * The opening handoff (ARI-23): text appended to LISTENER_INSTRUCTIONS for a
 * "listen" session so the orb opens grounded in the last call instead of cold.
 * Empty string when there is no previous summary (the person's first call ever,
 * or the previous call's summary pass never produced usable text) — the base
 * instructions' generic opener stands unchanged in that case.
 */
export function buildListenerOpeningAddendum(prev: SessionSummary | null): string {
  if (!prev || !prev.text) return "";

  const parts = [`\n\nWhat you and this person last talked about: ${prev.text}`];
  if (prev.openThreads.length > 0) {
    parts.push(`Left open, worth a light check-in if it fits naturally: ${prev.openThreads.join("; ")}.`);
  }
  parts.push(
    "Open THIS call already oriented: greet them warmly and reference what you last talked about specifically (e.g. \"how did things land with X?\") instead of the generic opener above. Keep it short and natural, not a report — and if what they bring up now is clearly something new, follow THAT instead.",
  );
  return parts.join(" ");
}

/**
 * The display counterpart to `buildListenerOpeningAddendum`: the same last-call
 * memory, broken into labeled sources for the "what it knows" panel instead of
 * folded into one paragraph of self-instructions aimed at the model (e.g. "open
 * already oriented..."). That line is real, useful text for the model and noise
 * for a person reading the panel, so it's deliberately left out here. Empty
 * array when there's no previous summary yet (first-ever call, or the previous
 * summary pass never produced usable text).
 */
export function buildListenerContextSources(prev: SessionSummary | null): ContextSource[] {
  if (!prev || !prev.text) return [];
  const sources: ContextSource[] = [{ label: "What you last talked about", detail: prev.text }];
  if (prev.openThreads.length > 0) {
    sources.push({ label: "Left open from last time", detail: prev.openThreads.join("; ") });
  }
  return sources;
}
