"use client";

import { Id } from "@/convex/_generated/dataModel";
import { SessionsList } from "./SessionsList";
import { SessionDoc } from "./SessionDoc";

/** The Sessions surface: the chronological list, or one open entry. */
export function Sessions({
  activeSessionId,
  onOpenSession,
}: {
  activeSessionId: Id<"sessions"> | null;
  onOpenSession: (id: Id<"sessions"> | null) => void;
}) {
  return activeSessionId ? (
    <SessionDoc sessionId={activeSessionId} onBack={() => onOpenSession(null)} />
  ) : (
    <SessionsList onOpen={onOpenSession} />
  );
}
