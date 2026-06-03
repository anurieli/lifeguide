"use client";

import { useEffect, useState } from "react";
import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { StartButton } from "@/components/auth/StartButton";
import { Whiteboard } from "@/components/whiteboard/Whiteboard";

function Board() {
  const me = useQuery(api.users.current);
  const bootstrap = useMutation(api.users.bootstrap);
  const [seededSurface, setSeededSurface] = useState<Id<"surfaces"> | null>(null);

  // Seed once on first sign-in; bootstrap returns the new surface id.
  useEffect(() => {
    if (me && !me.bootstrapped) void bootstrap().then(setSeededSurface);
  }, [me, bootstrap]);

  // For a returning user the surface id arrives with `current` (one roundtrip, no flash).
  const surfaceId = me?.surfaceId ?? seededSurface;

  if (!surfaceId) {
    return (
      <div className="h-screen flex items-center justify-center bg-paper text-ink-mute">
        Preparing your space…
      </div>
    );
  }
  return <Whiteboard surfaceId={surfaceId} />;
}

export default function Home() {
  return (
    <>
      <Unauthenticated>
        <StartButton />
      </Unauthenticated>
      <Authenticated>
        <Board />
      </Authenticated>
    </>
  );
}
