"use client";

// A tiny in-memory ring buffer of the page's recent JS/console errors, so a
// feedback submission can carry whatever went wrong right before it. Installed
// once at app mount (see app/providers.tsx). SSR-safe and idempotent: no-ops
// without `window`, and install only wires listeners on the first call.

export type CapturedError = { message: string; stack?: string; at: number };

const MAX = 25;
const buffer: CapturedError[] = [];
let installed = false;

function push(message: string, stack?: string) {
  buffer.push({ message: message.slice(0, 2000), stack: stack?.slice(0, 4000), at: Date.now() });
  if (buffer.length > MAX) buffer.shift();
}

/** Wire global error listeners + wrap console.error. Safe to call repeatedly. */
export function installErrorBuffer() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (e) => {
    const msg = e.message || String(e.error ?? "error");
    push(msg, e.error instanceof Error ? e.error.stack : undefined);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = (e as PromiseRejectionEvent).reason;
    if (reason instanceof Error) push(reason.message, reason.stack);
    else push("Unhandled rejection: " + String(reason));
  });

  const orig = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const first = args[0];
    const stack = first instanceof Error ? first.stack : undefined;
    push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(" "), stack);
    orig(...args);
  };
}

/** A copy of the current buffer (most recent last). */
export function snapshotErrors(): CapturedError[] {
  return buffer.slice();
}
