"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SpeakSurface } from "@/components/voice/SpeakSurface";

// /speak — the always-available Listener, reachable as its own URL from anywhere.
// Closing returns to the app. Unauthenticated visitors are bounced home.

function Loading() {
  return (
    <div className="h-[100dvh] flex items-center justify-center bg-paper text-ink-mute">
      Opening a quiet space…
    </div>
  );
}

function Bounce() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return <Loading />;
}

export default function SpeakPage() {
  const router = useRouter();
  return (
    <>
      <AuthLoading>
        <Loading />
      </AuthLoading>
      <Unauthenticated>
        <Bounce />
      </Unauthenticated>
      <Authenticated>
        <SpeakSurface onClose={() => router.push("/")} />
      </Authenticated>
    </>
  );
}
