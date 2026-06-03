import OpenAI from "openai";

export type AiProvider = "openrouter" | "openai";

// One client, provider-flexible. Prefers OpenRouter (ADR 0006); falls back to OpenAI-direct when
// only an OpenAI key is present. Same SDK, different baseURL + model namespace. Server-only keys.
export function aiClient(): { client: OpenAI; provider: AiProvider } {
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    return {
      client: new OpenAI({
        apiKey: orKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: { "HTTP-Referer": "https://lifeguide.app", "X-Title": "LifeGuide" },
      }),
      provider: "openrouter",
    };
  }
  const oaKey = process.env.OPENAI_API_KEY;
  if (oaKey) {
    return { client: new OpenAI({ apiKey: oaKey }), provider: "openai" };
  }
  throw new Error(
    "No AI key set. Run: npx convex env set OPENROUTER_API_KEY sk-or-...  (or OPENAI_API_KEY sk-...)",
  );
}

// Canonical model ids are OpenRouter-namespaced ("openai/gpt-4o-mini"). For OpenAI-direct, strip
// the "openai/" prefix so the same config id works against either provider.
export function resolveModel(canonicalId: string, provider: AiProvider): string {
  if (provider === "openai" && canonicalId.startsWith("openai/")) {
    return canonicalId.slice("openai/".length);
  }
  return canonicalId;
}
