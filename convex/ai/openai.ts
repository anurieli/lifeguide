import OpenAI from "openai";
import { internal } from "../_generated/api";
import { PROVIDERS, TASKS, type ProviderId, type TaskId } from "./config";

export type AiProvider = ProviderId;

// A context that can run queries (action or internalAction ctx). Kept loose so this
// file does not depend on a specific generated ctx type.
type RunQueryCtx = { runQuery: (ref: any, args: any) => Promise<any> };

/**
 * Resolve the API key for a provider: a key the user saved to their own profile
 * wins over the deployment env key. The key is read server-side only and never
 * returned to the client.
 */
async function resolveKey(
  ctx: RunQueryCtx,
  provider: ProviderId,
  userId?: string | null,
): Promise<string | undefined> {
  if (userId) {
    const profileKey: string | null = await ctx.runQuery(internal.aiKeys.getKeyInternal, {
      userId,
      provider,
    });
    if (profileKey) return profileKey;
  }
  return process.env[PROVIDERS[provider].keyEnv];
}

export type TaskClient = {
  client: OpenAI;
  model: string;
  temperature: number;
  system?: string;
  provider: ProviderId;
};

/**
 * Build the AI client for a named task (an "AI node"). The task's provider and
 * model come from ./config.ts (the one place to tune them). The key is the user's
 * own profile key for that provider if set, otherwise the deployment env key.
 */
export async function aiForTask(
  ctx: RunQueryCtx,
  taskId: TaskId,
  userId?: string | null,
): Promise<TaskClient> {
  const task = TASKS[taskId];
  if (!task) throw new Error(`Unknown AI task: ${taskId}`);
  const prov = PROVIDERS[task.provider];

  const key = await resolveKey(ctx, task.provider, userId);
  if (!key && !prov.keyOptional) {
    throw new Error(
      `No API key for provider "${task.provider}" (task "${taskId}"). Set ${prov.keyEnv} in the Convex env, or save your own key in Settings.`,
    );
  }

  const client = new OpenAI({
    apiKey: key ?? "local-no-key",
    baseURL: prov.baseURL,
    defaultHeaders: prov.defaultHeaders,
  });
  return { client, model: task.model, temperature: task.temperature, system: task.system, provider: task.provider };
}

export async function aiForEngine(
  ctx: RunQueryCtx,
  engine: { provider: ProviderId; model: string; temperature: number; system?: string },
  userId?: string | null,
): Promise<TaskClient> {
  const prov = PROVIDERS[engine.provider];
  const key = await resolveKey(ctx, engine.provider, userId);
  if (!key && !prov.keyOptional) {
    throw new Error(
      `No API key for provider "${engine.provider}". Set ${prov.keyEnv} in the Convex env, or save your own key in Settings.`,
    );
  }

  const client = new OpenAI({
    apiKey: key ?? "local-no-key",
    baseURL: prov.baseURL,
    defaultHeaders: prov.defaultHeaders,
  });

  return {
    client,
    model: engine.model,
    temperature: engine.temperature,
    system: engine.system,
    provider: engine.provider,
  };
}

// ---------------------------------------------------------------------------
// Back-compat: the old global, key-only client. Prefer aiForTask going forward.
// ---------------------------------------------------------------------------
export function aiClient(): { client: OpenAI; provider: AiProvider } {
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    return {
      client: new OpenAI({
        apiKey: orKey,
        baseURL: PROVIDERS.openrouter.baseURL,
        defaultHeaders: PROVIDERS.openrouter.defaultHeaders,
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
