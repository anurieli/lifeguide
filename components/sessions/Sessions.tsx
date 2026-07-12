"use client";

import { Id } from "@/convex/_generated/dataModel";
import { SessionsList } from "./SessionsList";
import { SessionDoc } from "./SessionDoc";

/** The Sessions surface: the chronological list, or one open entry. */
export function Sessions({
  activeSessionId,
  onOpenSession,
  autoRecordId,
  onAutoRecordConsumed,
}: {
  activeSessionId: Id<"sessions"> | null;
  onOpenSession: (id: Id<"sessions"> | null) => void;
  autoRecordId: Id<"sessions"> | null;
  onAutoRecordConsumed: () => void;
}) {
  return activeSessionId ? (
    <SessionDoc
      sessionId={activeSessionId}
      onBack={() => onOpenSession(null)}
      autoRecord={activeSessionId === autoRecordId}
      onAutoRecordConsumed={onAutoRecordConsumed}
    />
  ) : (
    <SessionsList onOpen={onOpenSession} />
  );
}
