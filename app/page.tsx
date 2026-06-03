"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { StartButton } from "@/components/auth/StartButton";

export default function Home() {
  return (
    <>
      <Unauthenticated>
        <StartButton />
      </Unauthenticated>
      <Authenticated>
        <div className="h-screen flex items-center justify-center text-ink-soft">
          Signed in. Whiteboard next.
        </div>
      </Authenticated>
    </>
  );
}
