import OpenAI from "openai";

// One client, pointed at OpenRouter (OpenAI-compatible). Models are swapped by id in config.ts.
// Key is server-only (Convex env var); never reaches the client. ADR 0006.
export function openrouter(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Run: npx convex env set OPENROUTER_API_KEY sk-or-...",
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      // OpenRouter attribution headers (optional but recommended).
      "HTTP-Referer": "https://lifeguide.app",
      "X-Title": "LifeGuide",
    },
  });
}
