import { useEffect, useRef } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import type { OptimisticLocalStore } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// Drop a capture from the cached inbox immediately, so placing or dismissing it
// removes it on click with no round-trip flicker — and it never reappears while
// the server catches up. The server is the source of truth; this only hides the
// gap. (Convex reconciles to the real query result when the mutation lands.)
function removeFromInbox(store: OptimisticLocalStore, captureId: Id<"captures">) {
  const cur = store.getQuery(api.captures.inbox, {});
  if (cur) {
    store.setQuery(
      api.captures.inbox,
      {},
      cur.filter((c) => c._id !== captureId),
    );
  }
}

export function useCaptures() {
  const inbox = useQuery(api.captures.inbox, {});

  // One-time repair for ADR 0015 (the vision sieve): captures distilled before that
  // change shipped never got a boardWorthy verdict, so they're stuck out of the
  // Inbox — intentionally, per the ADR, until they "earn a verdict via
  // captures.reprocess." This queues exactly that re-verdict, once per load.
  const reverdict = useMutation(api.captures.reverdictPreSieveInbox);
  const ranReverdict = useRef(false);
  useEffect(() => {
    if (ranReverdict.current) return;
    ranReverdict.current = true;
    reverdict({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    inbox: inbox ?? [],
    loading: inbox === undefined,
    create: useMutation(api.captures.create),
    softDelete: useMutation(api.captures.softDelete).withOptimisticUpdate((store, { captureId }) =>
      removeFromInbox(store, captureId),
    ),
    place: useMutation(api.placement.placeCapture).withOptimisticUpdate((store, { captureId }) =>
      removeFromInbox(store, captureId),
    ),
    generateUploadUrl: useMutation(api.files.generateUploadUrl),
    /** Brain-dump: transcribe a spoken dump, split into thoughts, create captures, return IDs. */
    brainDump: useAction(api.voice.brainDump),
  };
}
