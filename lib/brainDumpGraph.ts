export type BrainDumpIdea = {
  id: string;
  title: string;
  summary: string;
  details: string[];
  mentions: number;
  createdAt: number;
  updatedAt: number;
};

export type BrainDumpRelation = {
  id: string;
  from: string;
  to: string;
  label: string;
  reason: string;
  strength: number;
  createdAt: number;
};

export type BrainDumpGraph = {
  version: 1;
  ideas: BrainDumpIdea[];
  relations: BrainDumpRelation[];
};

export type BrainDumpEngine = {
  provider: "openrouter" | "openai" | "local";
  model: string;
  temperature: number;
  systemPrompt: string;
};

const MAX_IDEAS = 36;
const MAX_RELATIONS = 80;
const MAX_DETAILS = 5;

export const DEFAULT_BRAIN_DUMP_SYSTEM_PROMPT = `You maintain an evolving JSON thought map for a person speaking freely.

You receive:
1. The full transcript so far.
2. The newest sentence or sentence-like chunk.
3. The current JSON thought map.

Return ONLY the updated JSON object in this exact shape:
{
  "version": 1,
  "ideas": [
    {
      "id": "I1",
      "title": "short main idea",
      "summary": "one concise bullet-style sentence",
      "details": ["specific supporting point"],
      "mentions": 1,
      "createdAt": 0,
      "updatedAt": 0
    }
  ],
  "relations": [
    {
      "id": "R1",
      "from": "I1",
      "to": "I2",
      "label": "short relationship",
      "reason": "why these ideas are connected",
      "strength": 0.7,
      "createdAt": 0
    }
  ]
}

Rules:
- Preserve stable idea ids. If the newest sentence expands an existing idea, update that idea instead of creating a duplicate.
- Add a new idea only when a genuinely new topic appears.
- Keep each idea as a main bullet point, not a full transcript.
- Use details for short evidence or specifics that make the idea richer.
- Write idea titles/summaries as direct concepts, not commentary about the person speaking.
- Never say "the speaker", "the user", "they said", "expresses frustration", or similar meta narration inside ideas.
- Prefer concrete product/UX concepts, decisions, requirements, tensions, or observations.
- Ignore greetings, sign-offs, mic tests, filler words, repeated fragments, accidental repeats, and low-information utterances.
- Do not create transcript-like ideas. If the newest sentence has no substantial concept, return the current JSON unchanged.
- Avoid duplicate or redundant ideas. Merge overlapping ideas into the older stable idea id and increase mentions/details only when the new detail adds real information.
- Avoid repeated details. Do not add the same supporting point twice with different wording.
- Add or update relations when two ideas are meaningfully connected. The reason must explain the relation.
- Never invent facts beyond the transcript. Never delete useful existing ideas unless they are clear duplicates.
- Use timestamps from existing objects when present; new timestamps may be 0 because the app will normalize them.`;

export const DEFAULT_BRAIN_DUMP_ENGINE: BrainDumpEngine = {
  provider: "openrouter",
  model: "openai/gpt-4o-mini",
  temperature: 0.25,
  systemPrompt: DEFAULT_BRAIN_DUMP_SYSTEM_PROMPT,
};

export function emptyBrainDumpGraph(): BrainDumpGraph {
  return { version: 1, ideas: [], relations: [] };
}

function text(value: unknown, fallback = "", max = 240): string {
  const raw = typeof value === "string" ? value : fallback;
  return raw.replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanIdeaCopy(value: unknown, fallback = "", max = 240): string {
  return text(value, fallback, max)
    .replace(/^(the\s+)?(speaker|user|person)\s+(says|said|states|stated|mentions|mentioned|expresses|expressed|wants|wanted|thinks|thought)\s+(that\s+)?/i, "")
    .replace(/^(this\s+is\s+about|this\s+relates\s+to)\s+/i, "")
    .replace(/\b(the\s+)?(speaker|user|person)\b/gi, "the workflow")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function hasSubstance(value: string): boolean {
  const words = normalizedWords(value);
  if (words.length < 2) return false;
  return new Set(words).size >= 2;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nextIdeaId(used: Set<string>, ordinal: number): string {
  let n = ordinal;
  while (used.has(`I${n}`)) n += 1;
  return `I${n}`;
}

function nextRelationId(used: Set<string>, ordinal: number): string {
  let n = ordinal;
  while (used.has(`R${n}`)) n += 1;
  return `R${n}`;
}

export function normalizeBrainDumpGraph(input: unknown, now = Date.now()): BrainDumpGraph {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const rawIdeas = Array.isArray(source.ideas) ? source.ideas : [];
  const usedIdeaIds = new Set<string>();

  const ideas: BrainDumpIdea[] = rawIdeas.slice(0, MAX_IDEAS).map((raw, index) => {
    const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const proposed = text(obj.id, "", 18).toUpperCase();
    const validId = /^I\d+$/.test(proposed) && !usedIdeaIds.has(proposed);
    const id = validId ? proposed : nextIdeaId(usedIdeaIds, index + 1);
    usedIdeaIds.add(id);

    const title = cleanIdeaCopy(obj.title, "Untitled idea", 80) || "Untitled idea";
    const summary = cleanIdeaCopy(obj.summary, title, 360) || title;
    const rawDetails = Array.isArray(obj.details) ? obj.details : [];
    const details = rawDetails
      .map((d) => cleanIdeaCopy(d, "", 180))
      .filter((detail) => detail && hasSubstance(detail))
      .slice(0, MAX_DETAILS);

    return {
      id,
      title,
      summary,
      details,
      mentions: Math.max(1, Math.round(finiteNumber(obj.mentions, 1))),
      createdAt: finiteNumber(obj.createdAt, now),
      updatedAt: finiteNumber(obj.updatedAt, now),
    };
  });

  const ideaIds = new Set(ideas.map((idea) => idea.id));
  const rawRelations = Array.isArray(source.relations) ? source.relations : [];
  const usedRelationIds = new Set<string>();
  const relationKeys = new Set<string>();
  const relations: BrainDumpRelation[] = [];

  for (const raw of rawRelations) {
    if (relations.length >= MAX_RELATIONS) break;
    const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const from = text(obj.from, "", 18).toUpperCase();
    const to = text(obj.to, "", 18).toUpperCase();
    if (!ideaIds.has(from) || !ideaIds.has(to) || from === to) continue;

    const label = text(obj.label, "relates to", 60) || "relates to";
    const key = `${from}->${to}:${label.toLowerCase()}`;
    if (relationKeys.has(key)) continue;
    relationKeys.add(key);

    const proposed = text(obj.id, "", 18).toUpperCase();
    const validId = /^R\d+$/.test(proposed) && !usedRelationIds.has(proposed);
    const id = validId ? proposed : nextRelationId(usedRelationIds, relations.length + 1);
    usedRelationIds.add(id);

    relations.push({
      id,
      from,
      to,
      label,
      reason: text(obj.reason, "", 220),
      strength: clamp(finiteNumber(obj.strength, 0.5), 0, 1),
      createdAt: finiteNumber(obj.createdAt, now),
    });
  }

  return { version: 1, ideas, relations };
}

export function parseBrainDumpGraph(content: string, now = Date.now()): BrainDumpGraph {
  const trimmed = content.trim();
  const candidates = [
    trimmed,
    trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1),
  ].filter((candidate) => candidate.startsWith("{") && candidate.endsWith("}"));

  for (const candidate of candidates) {
    try {
      return normalizeBrainDumpGraph(JSON.parse(candidate), now);
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("Invalid brain dump graph JSON");
}

function titleFromSentence(sentence: string): string {
  const cleaned = sentence.replace(/[.!?]+$/g, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const title = words.slice(0, 7).join(" ");
  return title ? title[0].toUpperCase() + title.slice(1) : "New idea";
}

export function fallbackBrainDumpGraph(
  graph: BrainDumpGraph,
  sentence: string,
  now = Date.now(),
): BrainDumpGraph {
  const normalized = normalizeBrainDumpGraph(graph, now);
  const used = new Set(normalized.ideas.map((idea) => idea.id));
  const id = nextIdeaId(used, normalized.ideas.length + 1);
  const cleanSentence = text(sentence, "", 360);
  if (!cleanSentence) return normalized;

  return {
    ...normalized,
    ideas: [
      ...normalized.ideas,
      {
        id,
        title: titleFromSentence(cleanSentence),
        summary: cleanSentence,
        details: [],
        mentions: 1,
        createdAt: now,
        updatedAt: now,
      },
    ].slice(0, MAX_IDEAS),
  };
}
