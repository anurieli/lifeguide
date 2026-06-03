"use client";

import { useEffect, useState } from "react";
import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { StartButton } from "@/components/auth/StartButton";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { AppShell } from "@/components/shell/AppShell";

function Preparing() {
  return (
    <div className="h-screen flex items-center justify-center bg-paper text-ink-mute">
      Preparing your space…
    </div>
  );
}

function Gate() {
  const me = useQuery(api.users.current);
  const bootstrap = useMutation(api.users.bootstrap);
  const [seeded, setSeeded] = useState<Id<"surfaces"> | null>(null);

  // Seed once on first sign-in.
  useEffect(() => {
    if (me && !me.bootstrapped) void bootstrap().then(setSeeded);
  }, [me, bootstrap]);

  if (!me) return <Preparing />;
  if (!me.bootstrapped && !seeded) return <Preparing />;
  if (!me.onboarded) return <Onboarding />;

  const surfaceId = me.surfaceId ?? seeded;
  if (!surfaceId) return <Preparing />;
  return <AppShell surfaceId={surfaceId} />;
}

export default function Home() {
  return (
    <>
      <Unauthenticated>
        <StartButton />
      </Unauthenticated>
      <Authenticated>
        <Gate />
      </Authenticated>
    </>
  );
}
