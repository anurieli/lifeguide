// Pure, dependency-free helpers for the "long audio, made readable" behavior
// (ARI-145). A long spoken take is hard to skim: the raw machine transcript is one
// unpunctuated run of words with filler and false starts. For those takes only, the
// distill pass derives two extra fields — a concise `summary` (shown at the collapsed
// top state) and a grammar-cleaned full `cleaned` transcript (shown on expand). The
// raw transcript (`captures.extractedText`) and the audio blob (`captures.rawFileId`)
// are always preserved untouched; this layer only decides WHEN to derive them and
// WHAT the UI shows. Kept pure so both the server (convex/ai/distill.ts) and the
// client (components/sessions/CaptureItem.tsx) share one source of truth, unit-tested
// without a model, React, or the Convex runtime. See docs/product/features/sessions.md.

export type AudioReadable = { summary: string; cleaned: string };

// Transcript length (in characters, trimmed) at or past which a spoken take is treated
// as "long" and earns the derived summary + cleaned transcript. Below it, a short note
// keeps its current direct-transcript experience: no summary, no cleanup, no extra
// tokens on the distill call. Chosen around a ~30-45s ramble: short voice notes and the
// demo takes (~230-280 chars) fall well under, a genuine think-out-loud passage lands
// above. Tuning this one number is the whole dial.
export const LONG_AUDIO_READABLE_THRESHOLD = 700;

// The maximum number of transcript characters the distill call sends (and the model may
// return as `cleaned`) on the long-audio path. The default distill input cap is 6000
// chars, tuned for the title/essence/pillars/sieve job where a slice is plenty. But the
// "cleaned" output promises the FULL long thought, so a 6000-char slice would silently
// truncate a genuinely long take. This raises the ceiling for that path only to a cap
// that stays comfortably inside the model's context window (~16k chars is roughly
// 4k tokens in, a similar amount back). It is a safety ceiling, not a target: the raw
// machine transcript in `extractedText` and the audio blob in `rawFileId` are never
// touched. A take PAST this cap keeps every word, and rather than show a cleaned span
// that silently stops short of the very end, `selectAudioDisplay` expands to the full
// raw transcript for such a take (see there) so the reader never gets a truncated
// "cleaned" version passed off as the whole thought.
export const LONG_AUDIO_DISTILL_INPUT_CAP = 16000;

// True only for an audio capture whose transcript is long enough to be worth the
// derived readable pair. Anything non-audio, or a short/absent transcript, is false —
// the caller then behaves exactly as it did before this feature.
export function isLongAudioTranscript(
  rawType: string,
  transcript: string | undefined | null,
): boolean {
  if (rawType !== "audio") return false;
  const text = transcript?.trim() ?? "";
  return text.length >= LONG_AUDIO_READABLE_THRESHOLD;
}

// What the UI shows for an audio capture that already has a transcript: the concise
// summary as the collapsed one-line preview and the grammar-cleaned thought on expand,
// WHEN both derived fields are present. Otherwise (a short note, a capture distilled
// before this feature, or an AI failure that left `readable` unset) it falls back to the
// raw transcript verbatim for both — the graceful, never-lose-the-words default.
// `hasCleaned` lets the card note honestly that the expanded text was tidied and the
// spoken original is still one tap (play) away.
//
// One honest edge for a VERY long take: `cleaned` can only cover the first
// LONG_AUDIO_DISTILL_INPUT_CAP characters the model was sent, so for a transcript past
// that cap the cleaned text is a truncated prefix, not the whole thought. There we still
// use the derived `summary` as the collapsed preview, but expand to the FULL raw
// transcript instead of the cut-off cleaned span, and report `hasCleaned: false` so the
// card does not claim it was tidied. Normal long takes and short takes are unaffected.
export function selectAudioDisplay(args: {
  transcript: string | undefined | null;
  readable: AudioReadable | undefined | null;
}): { preview: string; expanded: string; hasCleaned: boolean } {
  const transcript = args.transcript?.trim() ?? "";
  const summary = args.readable?.summary?.trim() ?? "";
  const cleaned = args.readable?.cleaned?.trim() ?? "";
  if (summary && cleaned) {
    if (transcript.length > LONG_AUDIO_DISTILL_INPUT_CAP) {
      return { preview: summary, expanded: transcript, hasCleaned: false };
    }
    return { preview: summary, expanded: cleaned, hasCleaned: true };
  }
  return { preview: transcript, expanded: transcript, hasCleaned: false };
}
