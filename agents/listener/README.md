# The Listener

The **Listener** is the ear of LifeGuide: the persona behind the always-available `/speak` voice call.

It does one thing — it lets a person think out loud and thinks *with* them. It runs no script, fills no form, and files nothing itself. It draws out the raw stream (what someone yaps about, dreams about, is scared of). After the call, the **Center** (`agents/center/`) routes that stream into the file system on the human.

- **Instructions:** [`persona.ts`](persona.ts) exports `LISTENER_INSTRUCTIONS`, the realtime system prompt, and `buildListenerInstructions`, which grounds it in a summary of the person's last call when one exists (ARI-23). It is imported by `convex/ai/voice/index.ts` when minting a session whose `experienceId` is `"listen"`.
- **Memory backbone (ARI-23):** the Listener's own conversational continuity, separate from the Center's identity filing. `convex/ai/listenerMemory.ts` summarizes every ended call (filed, abandoned, or tossed alike); `lib/listenerMemory.ts` holds the pure assembly/parsing/handoff logic. See [`docs/decisions/0023-listener-memory-backbone.md`](../../docs/decisions/0023-listener-memory-backbone.md).
- **Surface:** `components/voice/SpeakSurface.tsx` (and the `/speak` route) render the call; the realtime/WebRTC plumbing lives in `hooks/useRealtimeVoice.ts`.
- **Feature doc:** [`docs/product/features/listener.md`](../../docs/product/features/listener.md).

The Listener is deliberately separate from the onboarding **interviewer** persona (which still lives inline in `convex/ai/voice/index.ts`): the interviewer fills the fixed blueprint; the Listener just listens.
