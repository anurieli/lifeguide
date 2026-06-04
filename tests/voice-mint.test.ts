import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAIRealtimeAdapter } from "../convex/ai/voice/openaiRealtime";

// Pins the GA Realtime mint contract so an upstream endpoint change (like the one that
// broke "Talk it through" — /v1/realtime/sessions started 404ing) is caught by tests.
describe("OpenAIRealtimeAdapter.mint", () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test";
  });
  afterEach(() => {
    global.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("mints via /v1/realtime/client_secrets with a nested session config", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ value: "ek_abc", expires_at: 1000, session: { model: "m" } }),
        { status: 200 },
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new OpenAIRealtimeAdapter("gpt-4o-mini-realtime-preview");
    const out = await adapter.mint("be calm");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/realtime/client_secrets");
    const body = JSON.parse(init.body as string);
    expect(body.session.type).toBe("realtime");
    expect(body.session.model).toBe("gpt-4o-mini-realtime-preview");
    expect(body.session.instructions).toBe("be calm");

    expect(out.clientSecret).toBe("ek_abc");
    expect(out.expiresAt).toBe(1000 * 1000);
    expect(out.model).toBe("gpt-4o-mini-realtime-preview");
  });

  it("throws a clear error when no OpenAI key is set", async () => {
    delete process.env.OPENAI_API_KEY;
    const adapter = new OpenAIRealtimeAdapter("gpt-4o-mini-realtime-preview");
    await expect(adapter.mint("x")).rejects.toThrow(/OpenAI API key/);
  });
});
