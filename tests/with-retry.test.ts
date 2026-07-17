import { describe, it, expect } from "vitest";
import { withRetry } from "../lib/withRetry";

// baseDelayMs: 0 keeps the backoff sleeps instant so the tests don't actually wait.
const fast = { baseDelayMs: 0 };

describe("withRetry", () => {
  it("returns the value without retrying when the first attempt succeeds", async () => {
    let calls = 0;
    const out = await withRetry(async () => {
      calls++;
      return "ok";
    }, fast);
    expect(out).toBe("ok");
    expect(calls).toBe(1);
  });

  it("retries a throwing op and returns once it succeeds", async () => {
    let calls = 0;
    const out = await withRetry(async () => {
      calls++;
      if (calls < 3) throw new Error("Not authenticated");
      return "landed";
    }, fast);
    expect(out).toBe("landed");
    expect(calls).toBe(3);
  });

  it("re-throws the last error after exhausting all attempts", async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls++;
        throw new Error(`fail ${calls}`);
      }, { ...fast, retries: 2 }),
    ).rejects.toThrow("fail 3");
    // retries: 2 → 3 total attempts (the first plus two retries).
    expect(calls).toBe(3);
  });

  it("stops early when shouldRetry rejects the error", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error("permanent");
        },
        { ...fast, retries: 5, shouldRetry: () => false },
      ),
    ).rejects.toThrow("permanent");
    expect(calls).toBe(1);
  });
});
