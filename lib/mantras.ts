// The mantra pool: short, self-directed lines a person reads to absorb, not tasks
// to complete. A "mantra" ritual component surfaces one INLINE (no reader, no
// Read button — mantras are short), rotating daily so the line differs by the day.
// Deliberately lean and code-resident, exactly like lib/questions.ts: rotation is
// deterministic per ritual day, so every device shows the same mantra all day and
// it changes at the 4am rollover with everything else.
//
// Seeded from the Coach Knowledge Base pool
// (docs/product/coach-knowledge-base/mantras.md). The canonical source is the
// developer's Brain Vault; this copy seeds the app until the vault-pull exists.

import { dayNumber } from "./questions";

// The pool, one self-directed line each. Kept short on purpose — a mantra is read
// in a breath, absorbed, and the day moves on.
export const MANTRA_POOL: string[] = [
  "You are gifted intellectually.",
  "You can unlock your supreme athleticism.",
  "Build skills and knowledge no one can ever take from you. That is the secret to everlasting confidence.",
  "You can achieve whatever you want when you discipline yourself to work for it. It does not just happen.",
  "You have an unending capacity to work. You are not lazy.",
  "You set your standard. Others fit in with you.",
  "Get truly comfortable being alone, and people are drawn to you.",
  "Everything is a skill. You can learn anything, and it gets more interesting the more you learn about it.",
  "Whatever you are drawn to, be excellent in it. You will be supported.",
  "Genius is a state accessible to you.",
  "In any room you are in, you have valuable contributions to make. They matter because they come through someone like you.",
  "Do not shrink yourself. You deserve to take up space.",
  "Nobody has the right to disrespect you, at any age.",
];

// The mantra for one ritual day: the same deterministic rotation as the question
// bank (lib/questions.ts). Consecutive days walk the pool in order, wrapping, so a
// device shows one stable mantra all day and a fresh one after the 4am rollover.
export function mantraForDay(dayKey: string): string {
  const i = ((dayNumber(dayKey) % MANTRA_POOL.length) + MANTRA_POOL.length) % MANTRA_POOL.length;
  return MANTRA_POOL[i];
}
