"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function StartButton() {
  const { signIn } = useAuthActions();
  const [pending, setPending] = useState(false);

  return (
    <main className="h-screen flex items-center justify-center bg-paper">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-ink">
          LifeGuide<span className="text-gold">.</span>
        </h1>
        <p className="text-lg text-ink-soft mt-3">Your space.</p>
        <button
          onClick={() => {
            setPending(true);
            void signIn("anonymous").catch(() => setPending(false));
          }}
          disabled={pending}
          className="mt-8 bg-ink text-paper px-7 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {pending ? "Entering…" : "Enter"}
        </button>
      </div>
    </main>
  );
}
