// Convex wraps thrown Error messages from actions/mutations with request-id and
// stack-trace noise (e.g. "[Request ID: …] Server Error\nUncaught Error: <msg>\n
// at handler (…)"). Pull just the human-readable message back out for display.
export function convexErrorMessage(e: unknown, fallback: string): string {
  const raw = e instanceof Error ? e.message : String(e);
  const match = raw.match(/Uncaught Error:\s*(.*)/);
  const line = (match ? match[1] : raw).split("\n")[0].trim();
  return line || fallback;
}
