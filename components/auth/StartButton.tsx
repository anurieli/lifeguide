"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function StartButton() {
  const { signIn } = useAuthActions();
  const [pending, setPending] = useState<"google" | "anon" | null>(null);

  return (
    <main className="h-screen flex items-center justify-center bg-paper">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-ink">
          LifeGuide<span className="text-gold">.</span>
        </h1>
        <p className="text-lg text-ink-soft mt-3">Your space.</p>

        <button
          onClick={() => {
            setPending("google");
            // Tell Convex which origin to send the browser back to after OAuth, so the auth
            // token lands on whatever host we're actually on (prod or localhost). Without this
            // Convex falls back to its single SITE_URL and the token never persists on prod.
            void signIn("google", { redirectTo: window.location.origin }).catch(() =>
              setPending(null),
            );
          }}
          disabled={pending !== null}
          className="mt-8 flex items-center gap-3 mx-auto bg-card border border-line text-ink px-7 py-3 rounded-xl text-sm font-medium hover:border-gold transition disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
            />
          </svg>
          {pending === "google" ? "Connecting…" : "Continue with Google"}
        </button>

        <div className="mt-4">
          <button
            onClick={() => {
              setPending("anon");
              void signIn("anonymous").catch(() => setPending(null));
            }}
            disabled={pending !== null}
            className="text-[13px] text-ink-mute hover:text-ink transition disabled:opacity-50"
          >
            {pending === "anon" ? "Entering…" : "or just look around →"}
          </button>
        </div>
      </div>
    </main>
  );
}
