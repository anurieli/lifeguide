import OpenAI from "openai";
import { internal } from "../_generated/api";
import { PROVIDERS, TASKS, type ProviderId, type TaskId } from "./config";

export type AiProvider = ProviderId;

// A context that can run queries (action or internalAction ctx). Kept loose so this
// file does not depend on a specific generated ctx type.
type RunQueryCtx = { runQuery: (ref: any, args: any) => Promise<any> };
// Actions that log AI calls also need runMutation.
type RunCtx = RunQueryCtx & { runMutation: (ref: any, args: any) => Promise<any> };

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
 * Build the AI client for a named task (an "AI node"). Provider + model resolve in
 * two steps: the person's own override for this node (saved in the Settings AI hub,
 * `aiOverrides`) wins; otherwise the config default from ./config.ts. The key is the
 * user's own profile key for that provider if set, otherwise the deployment env key.
 */
export async function aiForTask(
  ctx: RunQueryCtx,
  taskId: TaskId,
  userId?: string | null,
): Promise<TaskClient> {
  const task = TASKS[taskId];
  if (!task) throw new Error(`Unknown AI task: ${taskId}`);

  let provider = task.provider;
  let model = task.model;
  if (userId) {
    const ov = await ctx.runQuery(internal.aiModels.getOverrideInternal, { userId, taskId });
    if (ov) {
      provider = ov.provider;
      model = ov.model;
    }
  }

  const prov = PROVIDERS[provider];
  const key = await resolveKey(ctx, provider, userId);
  if (!key && !prov.keyOptional) {
    throw new Error(
      `No API key for provider "${provider}" (task "${taskId}"). Set ${prov.keyEnv} in the Convex env, or save your own key in Settings.`,
    );
  }

  const client = new OpenAI({
    apiKey: key ?? "local-no-key",
    baseURL: prov.baseURL,
    defaultHeaders: prov.defaultHeaders,
  });
  return { client, model, temperature: task.temperature, system: task.system, provider };
}

// ---------------------------------------------------------------------------
// Cost estimation (ADR 0017). A pricing snapshot per model — USD per 1M tokens,
// taken from the OpenRouter models API 2026-07-13 (OpenAI-direct rates from their
// price page). Best-effort: an unknown model logs tokens with costUsd undefined
// rather than a made-up number. Refresh the snapshot when models change.
// ---------------------------------------------------------------------------
const PRICING: Record<string, { inPerM: number; outPerM: number }> = {
  "openai/gpt-4o-mini": { inPerM: 0.15, outPerM: 0.6 },
  "anthropic/claude-sonnet-5": { inPerM: 2, outPerM: 10 },
  "anthropic/claude-haiku-4.5": { inPerM: 1, outPerM: 5 },
  "anthropic/claude-opus-4.8": { inPerM: 5, outPerM: 25 },
  "openai/gpt-5.6-terra": { inPerM: 2.5, outPerM: 15 },
  "openai/gpt-5.6-terra-pro": { inPerM: 2.5, outPerM: 15 },
  "openai/gpt-5-mini": { inPerM: 0.25, outPerM: 2 },
  "openai/gpt-5.4-mini": { inPerM: 0.75, outPerM: 4.5 },
  "google/gemini-3.5-flash": { inPerM: 1.5, outPerM: 9 },
  // OpenAI-direct (bare ids). gpt-4o-transcribe: text-out rate; audio-in tokens bill
  // higher (~$6/1M) — we price with the text rates we can attribute, so transcription
  // cost is a floor, not exact.
  "gpt-4o-transcribe": { inPerM: 2.5, outPerM: 10 },
  "gpt-4o-mini-transcribe": { inPerM: 1.25, outPerM: 5 },
};

export function estimateCostUsd(
  model: string,
  inputTokens?: number,
  outputTokens?: number,
): number | undefined {
  const p = PRICING[model];
  if (!p || (inputTokens === undefined && outputTokens === undefined)) return undefined;
  return ((inputTokens ?? 0) * p.inPerM + (outputTokens ?? 0) * p.outPerM) / 1_000_000;
}

/**
 * Append one row to the universal AI log. Best-effort by design: a logging failure
 * is swallowed (console only) so it can never take a feature down with it.
 */
export async function logAi(
  ctx: RunCtx,
  row: {
    userId?: string | null;
    taskId: string;
    fn: string;
    provider: string;
    model: string;
    kind: "chat" | "transcription" | "image" | "realtime";
    ok: boolean;
    error?: string;
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
    durationMs: number;
  },
): Promise<void> {
  try {
    await ctx.runMutation(internal.aiLogs.record, {
      ...row,
      userId: row.userId ?? undefined,
      at: Date.now(),
    });
  } catch (e) {
    console.error("aiLogs.record failed (non-fatal)", e);
  }
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: any };

/**
 * The one way to make a chat-completion call (ADR 0017): resolves the task's client
 * (config default or the person's override), prepends the task's config system prompt
 * when one exists and none was passed, makes the call, and ALWAYS logs it — model,
 * tokens, estimated cost, duration, ok/error — success or failure. Rethrows errors so
 * call sites keep their own fallback semantics.
 */
export async function chatComplete(
  ctx: RunCtx,
  opts: {
    taskId: TaskId;
    /** The server call site, for the log — e.g. "ai/distill.distillCapture". */
    fn: string;
    userId?: string | null;
    messages: ChatMessage[];
    jsonMode?: boolean;
  },
): Promise<string> {
  const { client, model, temperature, system, provider } = await aiForTask(
    ctx,
    opts.taskId,
    opts.userId,
  );
  const messages: ChatMessage[] =
    system && opts.messages[0]?.role !== "system"
      ? [{ role: "system", content: system }, ...opts.messages]
      : opts.messages;

  const started = Date.now();
  try {
    const res = await client.chat.completions.create({
      model,
      temperature,
      ...(opts.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      messages: messages as any,
    });
    const usage = res.usage;
    await logAi(ctx, {
      userId: opts.userId,
      taskId: opts.taskId,
      fn: opts.fn,
      provider,
      model,
      kind: "chat",
      ok: true,
      inputTokens: usage?.prompt_tokens,
      outputTokens: usage?.completion_tokens,
      costUsd: estimateCostUsd(model, usage?.prompt_tokens, usage?.completion_tokens),
      durationMs: Date.now() - started,
    });
    return res.choices[0]?.message?.content ?? "";
  } catch (e: any) {
    await logAi(ctx, {
      userId: opts.userId,
      taskId: opts.taskId,
      fn: opts.fn,
      provider,
      model,
      kind: "chat",
      ok: false,
      error: String(e?.message ?? e).slice(0, 500),
      durationMs: Date.now() - started,
    });
    throw e;
  }
}

/**
 * Transcribe one audio file through the task's client, logged (ADR 0017). Returns
 * the trimmed text. gpt-4o-transcribe reports usage tokens; whisper-1 does not —
 * tokens/cost are logged when the API provides them.
 */
export async function transcribeLogged(
  ctx: RunCtx,
  opts: { taskId: TaskId; fn: string; userId?: string | null; file: any },
): Promise<string> {
  const { client, model, provider } = await aiForTask(ctx, opts.taskId, opts.userId);
  const started = Date.now();
  try {
    const res = await client.audio.transcriptions.create({ file: opts.file, model });
    const usage: any = (res as any).usage;
    const inTok = usage?.input_tokens;
    const outTok = usage?.output_tokens;
    await logAi(ctx, {
      userId: opts.userId,
      taskId: opts.taskId,
      fn: opts.fn,
      provider,
      model,
      kind: "transcription",
      ok: true,
      inputTokens: inTok,
      outputTokens: outTok,
      costUsd: estimateCostUsd(model, inTok, outTok),
      durationMs: Date.now() - started,
    });
    return (res.text ?? "").trim();
  } catch (e: any) {
    await logAi(ctx, {
      userId: opts.userId,
      taskId: opts.taskId,
      fn: opts.fn,
      provider,
      model,
      kind: "transcription",
      ok: false,
      error: String(e?.message ?? e).slice(0, 500),
      durationMs: Date.now() - started,
    });
    throw e;
  }
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
