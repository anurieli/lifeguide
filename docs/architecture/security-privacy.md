# Security & Privacy

**Status:** rebuilt 2026-06-03. The trust contract. LifeGuide holds the most personal material a person has (who they are, what they want, photos of the self they are becoming), so isolation and restraint are architectural, not afterthoughts.

---

## Multi-tenancy is the one rule with no exceptions
Every table carries `userId`. Every query, mutation, and action calls `getAuthUserId` first and filters to that user. A function that cannot establish a user does not read or write. This is enforced per-call, not by a gateway, so there is no path that forgets it. See [`data-model.md`](data-model.md) and [`stack.md`](stack.md).

## Auth
Multi-tenant auth via `@convex-dev/auth` (`convex/auth.ts`), with two providers wired:
- **Anonymous:** instant, cookie-bound, throwaway identity for "just look around." Caveat: clearing the cookie starts a fresh person.
- **Google:** a durable account that survives cookie clears and works across browsers and devices. The code is wired; it needs `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` in the Convex deployment env and the callback URL `https://<deployment>.convex.site/api/auth/callback/google` registered in the Google Cloud OAuth client. Until those exist, `signIn("google")` fails but Anonymous still works.

Identity is established server-side; the client never asserts a `userId`. Durable login is what makes a per-profile OpenRouter key (see [`ai-layer.md`](ai-layer.md)) actually stick to a person across devices.

## Keys never reach the client
All AI keys (`OPENROUTER_API_KEY`, the `OPENAI_API_KEY` fallback) live in the Convex deployment environment and are read only inside server actions. No key is bundled, exposed via `NEXT_PUBLIC_`, or returned to the browser. See [`ai-layer.md`](ai-layer.md).

## Text is the shared currency (a privacy boundary, not just a data rule)
Images and video live inside their owning element (`nodes`, `futureSelf`). What flows into the shared context bus is the distilled TEXT behind them, never the binary. This bounds how far any single artifact travels: a photo stays in Future Self; only its meaning is published. See [`context-bus.md`](context-bus.md).

## Future Self likeness photos
Future Self may store `sourceFileIds`: the person's own photos used as likeness input for generation. These get the strictest handling:
- They are **excluded from all published context.** They never become a context fragment; only the generated image's distilled `caption` text is published.
- Retention and deletion guarantees (hard delete of the stored file, not just a soft flag) are a settle-on-build item, tracked in [`../product/features/future-self.md`](../product/features/future-self.md).
- Generation that sends a likeness to a third-party model provider is a consent point: the person opts in per use, and the provider's data-retention posture is recorded before the element ships.

## File storage
User-uploaded files (board images, Future Self photos, spoken-session audio) live in Convex file storage, addressed by `_storage` id and gated by the same per-user checks. Audio for spoken Journal answers is transcribed to text; the retention of the source audio after transcription is a settle-on-build item.

## Embeddings deferred
No embeddings are computed or stored in v1 (no vector index). The `embedding` fields stay optional and unused, so there is no semantic index of personal content to protect yet. When semantic recall lands, it inherits every rule above.

## What we do not do
- No social layer, no sharing surface: nothing a person writes is visible to anyone else by design (see [`../product/prd.md`](../product/prd.md), "OUT forever").
- No third-party analytics on personal content.
- No selling, no training of shared models on a person's Core.
