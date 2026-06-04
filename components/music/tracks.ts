// Atmosphere — the ambient moods. Each maps to one looping instrumental served
// as a static asset from /public/audio. The `key` is the durable id used across
// the UI (and, for the original four, in convex/schema.ts: settings.musicDefaultMood).
// See docs/product/features/atmosphere.md.

export type MoodKey =
  | "inspiration"
  | "deep-thinking"
  | "focus"
  | "calm-reset"
  | "reflection"
  | "stillness";

export type Track = {
  key: MoodKey;
  mood: string; // the mood label shown in the meter
  title: string; // the track's name
  desc: string; // one-line description
  color: string; // accent the whole player tints to (Tailwind palette hex)
  src: string; // looping audio asset
};

export const TRACKS: Track[] = [
  {
    key: "inspiration",
    mood: "Inspiration",
    title: "First Light",
    desc: "momentum & optimism",
    color: "#B8945A", // gold
    src: "/audio/inspiration.mp3",
  },
  {
    key: "deep-thinking",
    mood: "Creative Deep Thinking",
    title: "Wander",
    desc: "open-ended ideation",
    color: "#5B4B7A", // violet
    src: "/audio/deep-thinking.mp3",
  },
  {
    key: "focus",
    mood: "Super Focus",
    title: "Flow State",
    desc: "heads-down deep work",
    color: "#2F6E6A", // teal
    src: "/audio/focus.mp3",
  },
  {
    key: "calm-reset",
    mood: "Calm Reset",
    title: "After Hours",
    desc: "wind down & reflect",
    color: "#3A5C86", // blue
    src: "/audio/calm-reset.mp3",
  },
  {
    key: "reflection",
    mood: "Reflection",
    title: "Stillwater",
    desc: "contemplative neoclassical piano",
    color: "#5C6BB0", // indigo
    src: "/audio/reflection.mp3",
  },
  {
    key: "stillness",
    mood: "Stillness",
    title: "Still Water",
    desc: "soft, soothing piano",
    color: "#3E8278", // deep teal-green
    src: "/audio/stillness.mp3",
  },
];

export const TRACK_BY_KEY: Record<MoodKey, Track> = Object.fromEntries(
  TRACKS.map((t) => [t.key, t]),
) as Record<MoodKey, Track>;

export const DEFAULT_MOOD: MoodKey = "inspiration";

// AUTO mode — a v1 heuristic that maps the time of day to a mood. This is the
// lightweight stand-in for the Context Bus: when the Coach's context is wired
// in, this function is where richer signal (the active session, energy, the
// surface in view) replaces the clock. Hours are local.
export function moodForHour(hour: number): MoodKey {
  if (hour < 5) return "calm-reset"; // late night
  if (hour < 11) return "inspiration"; // morning
  if (hour < 16) return "focus"; // midday deep work
  if (hour < 20) return "deep-thinking"; // afternoon
  return "calm-reset"; // evening wind-down
}
