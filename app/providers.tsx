"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useEffect } from "react";
import { installErrorBuffer } from "@/lib/errorBuffer";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }) {
  // Start capturing the page's JS/console errors once, so feedback submissions
  // can carry recent failures. Idempotent + SSR-safe.
  useEffect(() => installErrorBuffer(), []);
  return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}
