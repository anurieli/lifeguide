// The questions bank: the rotating reflection prompts that "question" ritual
// components draw from when they carry no fixed prompt of their own. Deliberately
// lean and code-resident (no AI generation, no storage): rotation is deterministic
// per ritual day, so every device shows the same question all day and the question
// changes at the 4am rollover with everything else.

export type QuestionBank = "morning" | "evening";

// Morning prompts point forward (the day ahead — the morning journal); evening
// prompts close the day (wins, lessons, honesty). Drawn from the Blueprint for
// Living doctrine's Direction pillar ("journal wins and lessons", "track progress
// not perfection"). The morning question rotates this bank, so the daily scroll
// carries a fresh journal prompt each day — the mirror of the night's Check out.
export const MORNING_QUESTIONS: string[] = [
  "What's one small thing today that points at it?",
  "What would make today feel won by tonight?",
  "What's the one thing you're most likely to dodge today?",
  "Who do you want to have been by the end of today?",
  "What deserves your best hour today?",
  "How are you arriving at today — honestly?",
  "What are you carrying in that you'd rather set down?",
  "What's one thing you're grateful for before the day starts?",
];

export const EVENING_QUESTIONS: string[] = [
  "What pulled at you today?",
  "What was today's win, however small?",
  "What did today teach you?",
  "Where did you keep a promise to yourself today?",
  "What drained you today that you didn't sign up for?",
  "What are you glad you did, even though you didn't feel like it?",
  "What would you do differently if today ran again?",
  "What's still sitting on your chest tonight?",
];

const BANKS: Record<QuestionBank, string[]> = {
  morning: MORNING_QUESTIONS,
  evening: EVENING_QUESTIONS,
};

// Days since epoch for a "YYYY-MM-DD" ritual-day key (UTC math on the key itself,
// so the result is timezone-independent and stable for a given key).
export function dayNumber(dayKey: string): number {
  const [y, m, d] = dayKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

// The bank question for one ritual day: a simple deterministic rotation. Consecutive
// days walk the bank in order, wrapping; the two banks are offset only by length.
export function questionForDay(bank: QuestionBank, dayKey: string): string {
  const list = BANKS[bank];
  const i = ((dayNumber(dayKey) % list.length) + list.length) % list.length;
  return list[i];
}
