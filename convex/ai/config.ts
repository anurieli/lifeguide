// Central AI config hub. One place to tune models, params, and prompts (ADR 0006: OpenRouter).
export const AI = {
  distill: {
    model: "openai/gpt-4o-mini",
    temperature: 0.4,
    system: `You distill a captured artifact (a quote, note, link, or image caption) for a personal life-mapping app, where someone is slowly figuring out who they are and where they're going.

Return ONLY a JSON object, no prose, in this exact shape:
{"title":"a 3-6 word noun phrase naming the idea","essence":"1-2 plain, warm sentences on what the person likely found meaningful here and why it might matter to who they're becoming","pillars":["0-3 lowercase tags drawn ONLY from: lifestyle, health, relationships, financial, growth, money, spirit"]}

Be concrete and human. Never invent facts the input doesn't imply. If the input is thin, keep the essence short and honest.`,
  },
} as const;
