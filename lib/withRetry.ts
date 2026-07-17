// Small retry wrapper for the handful of Convex mutations that must survive a
// COLD START. When the app opens fresh — or resumes after the phone was locked,
// the screen dimmed, or the PWA sat in the background — the stored auth token can
// be momentarily stale while ConvexAuth refreshes it. The very first mutation then
// throws "Not authenticated" (the server sees no identity), the refresh lands a
// beat later, and the next call succeeds. That race is exactly why "the first one
// after opening doesn't save, the second one is fine."
//
// Convex already retries on a dropped socket, but a THROWN server error (like the
// auth check) rejects the promise and is not retried. This wrapper adds a few
// short, backed-off retries around such calls. Every op we wrap is safe to re-run
// on throw: the auth check throws *before* any write, so nothing is duplicated.

export type RetryOptions = {
  /** How many extra attempts after the first (default 4 → 5 tries total). */
  retries?: number;
  /** First backoff in ms; each retry doubles it (default 300 → 300/600/1200/2400). */
  baseDelayMs?: number;
  /** Return false to stop retrying a given error (default: retry everything). */
  shouldRetry?: (err: unknown) => boolean;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Run `fn`, retrying with exponential backoff if it throws. Re-throws the last
 * error only after every attempt is exhausted. The total wait across the default
 * schedule (~4.5s) comfortably covers an auth-token refresh on resume.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 4;
  const base = opts.baseDelayMs ?? 300;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      if (opts.shouldRetry && !opts.shouldRetry(err)) break;
      await sleep(base * 2 ** attempt);
    }
  }
  throw lastErr;
}
