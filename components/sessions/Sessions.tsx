"use client";

import { Id } from "@/convex/_generated/dataModel";
import { SessionsList } from "./SessionsList";
import { SessionDoc } from "./SessionDoc";

/** The Thoughts surface: the chronological list, or one open entry. */
export function Sessions({
  activeSessionId,
  onOpenSession,
  onNew,
  onQuickRecord,
}: {
  activeSessionId: Id<"sessions"> | null;
  onOpenSession: (id: Id<"sessions"> | null) => void;
  onNew: () => void;
  onQuickRecord: () => void;
}) {
  return activeSessionId ? (
    <SessionDoc sessionId={activeSessionId} onBack={() => onOpenSession(null)} />
  ) : (
    <SessionsList onOpen={onOpenSession} onNew={onNew} onQuickRecord={onQuickRecord} />
  );
}
