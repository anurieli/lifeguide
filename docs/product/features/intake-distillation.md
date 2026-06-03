# Feature: Intake & Distillation

**Summary:** One pipeline that turns any input — text, image, link, video link, audio, (later) share-sheet/email/calendar — into a clean text-meaning node + metadata + an embedding + a routing decision, so a saved reel or screenshot *means something* instead of rotting in a folder.
**Status:** ✅ specified (🟢 building in Plan 1; audio in Plan 3)
**Phase:** v1 · Plan 1 (paste/upload/url) → Plan 3 (audio) → v1.5 (share-sheet/email)
**Surfaces:** A cross-cutting pipeline, not a surface. Feeds the [Whiteboard](whiteboard.md) (Inbox tray → nodes) and writes the [Mirror](mirror.md). Later feeds any surface.
**Related:** [`whiteboard.md`](whiteboard.md) · [`mirror.md`](mirror.md) · [`pillars.md`](pillars.md) · [`coach.md`](coach.md) · [`../prd.md`](../prd.md) (F4) · [`../concept-and-soul.md`](../concept-and-soul.md) · [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md) · [`../../architecture/data-model.md`](../../architecture/data-model.md) · [`../../architecture/context-bus.md`](../../architecture/context-bus.md)

---

## 1. Purpose — why it exists

A lost young man already collects the raw material of his own direction — screenshots of posts that hit him, links he means to read, photos of pages, half-formed voice notes muttered in the car. But it scatters across camera rolls, browser tabs, and Notes apps and **rots there, unmeaning.** The collecting is not the problem; the *metabolizing* is. Nothing turns the artifact into a thought he can act on, connect, or be reminded of.

Intake & Distillation is the front door to the whole system, and it does two things that the concept (`../concept-and-soul.md`) demands:

1. **Frictionless capture.** Per the interaction contract ("talk *or* operate", "progressive disclosure", "ambient, not anxious"), saving something must cost nothing — paste, drop, type, speak, anywhere, and it's in. No form, no folder, no decision.
2. **Reduce everything to textual meaning.** The Mirror is "the text layer behind the human" (`../concept-and-soul.md`); the Context Bus reasons over text. So every input — an image, a 40-minute video, an audio ramble — must collapse to a short, embedded, tagged piece of *text* the system can hold the long view over. **Distillation is the magic that makes a saved reel mean something.**

This is **F4** in the PRD (`../prd.md`): "One pipeline turning any input into a clean node + embedding + Mirror delta." It is built in build-sequence step 2 (right after the context spine) precisely because it is the spine's data source — without distilled, embedded captures, the Mirror has nothing to compound and the Coach has nothing to recall.

The discipline that makes it cheap is **distill-on-write** (the PillarOS `analyzeIntakeItem` lesson, `../../research/extraction/02-pillaros.md` §6): do the summarization and embedding work *once*, at capture time, so every later context assembly is reading pre-distilled essence rather than re-summarizing raw artifacts on every call. "Summarize at write time" keeps the always-on context payload small forever.

## 2. User-facing behavior

The user never sees "Intake & Distillation." They see things getting *captured* and *understood*. The calm, one-thing-per-screen view holds: nothing here is a settings panel; it is ambient plumbing behind a single moving piece (the Inbox tray).

**Entry points (capture from anywhere):**
- **Paste** (`Cmd/Ctrl+V`) anywhere on the Whiteboard that isn't a text field — an image, a URL, a quote, plain text.
- **Drop** a file onto the canvas (image, later PDF).
- **Upload** via the toolbar's Image control.
- **Type** into the persistent "type-anywhere" input (the [Whiteboard](whiteboard.md)'s `QuickInput`).
- **Speak** via the 🎙 Talk control (Plan 3 → see [`audio-capture.md`], audio → transcript → nodes).
- **(Later)** the OS **share-sheet** ("Share → LifeGuide" from Instagram, Safari, Photos) and **email-forwarding** (forward a newsletter to a personal capture address). v1.5.

**The happy path, narrated:**
1. The user is scrolling and sees a Reel that articulates something he's been feeling. He screenshots it and pastes it onto his board (or, later, shares it straight in).
2. A card appears **immediately** in the top-right **Inbox tray** showing the raw thumbnail and a quiet **"distilling…"** shimmer. Capture never blocks on AI — the artifact is already saved and safe.
3. A second or two later the card flips: a **title** ("Discipline Over Motivation"), a one-to-two-sentence **essence** ("Wants to stop waiting to feel ready and act on a schedule instead."), and small **pillar tags** (e.g. *growth*).
4. He drags it onto the board — or asks the Coach to "place that with my morning stuff" — and it becomes a permanent **node** he can connect to others. Or he **dismisses** it; even dismissed, it has already nudged the **Mirror** (the system noticed the theme of *discipline* even if the card never lived on the board).
5. Over a week, the things he captured **compound**: the Mirror visibly knows him better, and the Coach can resurface "three weeks ago you saved something about exactly this" because the essence was embedded the moment it came in.

The felt experience is: *I throw things at this and it gets me.* Capturing is thoughtless; meaning appears on its own.

## 3. Functions & actions (exhaustive)

Intake is a small set of **sources** feeding a fixed **pipeline of steps**, ending in a **routing decision** and (on placement) a node. The tables below enumerate every source and every step. "Manual" = the user triggers it directly; "Via Coach" = the Coach triggers it through its tool registry (e.g. it pastes a URL it found, or generates an image and routes it as a capture with `source:"agent"`).

### 3a. Sources (every way content enters)

| Source | Manual | Via Coach | rawType(s) | What happens at capture | Data effect |
|---|---|---|---|---|---|
| **Paste text** | ✓ (`Cmd+V`, not in a field) | ✓ | `text` (or `quote`) | Stored verbatim as `rawText`; type-detect may reclassify as link/quote | insert `captures` (source=`paste`) |
| **Paste / type URL** | ✓ | ✓ | `link` | URL string stored as `rawUrl`; flagged for link extraction | insert `captures` (source=`paste`/`url`) |
| **Paste / drop image** | ✓ | ✓ (generated image) | `image` | Bytes uploaded to Convex `_storage`; `rawFileId` set | insert `captures` + `_storage` blob |
| **Upload file** (toolbar) | ✓ | n/a | `image` (PDF later) | File validated → `_storage` → `rawFileId` | insert `captures` + `_storage` |
| **Type a thought** (QuickInput) | ✓ | ✓ | `text` | Short text; may skip heavy distill (length-gated) | insert `captures` (source=`paste`) |
| **Video link** (YouTube/IG/TikTok URL) | ✓ | ✓ | `video_link` | URL stored as `rawUrl`; flagged for caption/transcript fetch | insert `captures` (source=`url`) |
| **Audio** (🎙 Talk) — Plan 3 | ✓ | n/a | (audio → text) | Recorded → Whisper transcript → segmented; see [`audio-capture.md`] | insert `captures` (source=`audio`) + nodes |
| **Coach-authored** | n/a | ✓ | any | Coach emits a capture (e.g. a synthesized quote, a generated image) | insert `captures` (source=`agent`) |
| **Share-sheet** — v1.5 | ✓ (OS share) | n/a | image/link/video_link/text | OS hands content to LifeGuide; enters same pipeline | insert `captures` (source TBD) |
| **Email-forward** — v1.5 | ✓ (forward email) | n/a | text/link | Inbound email parsed to text + links | insert `captures` (source TBD) |
| **Calendar / to-dos** — deferred (F6) | n/a | n/a (read-only later) | — | **Context-only**; slot reserved, no connector in v1 | — |

`source ∈ {paste, upload, url, audio, agent}` and `rawType ∈ {text, image, link, video_link, quote}` are the v1 enums in the schema (`../../architecture/data-model.md`); share-sheet/email extend `source` later.

### 3b. Pipeline steps (every capture runs this, server-side)

The capture record is written by a client mutation; the moment it lands, a Convex **action is scheduled** (`scheduler.runAfter(0, …)`) so distillation runs **off the UI thread, server-side, never with a client-passed payload**. Steps:

| Step | What it does | Manual | Via Coach | Where (v1) | Data effect |
|---|---|---|---|---|---|
| **1. Capture (immutable raw)** | Persist the artifact exactly as received; never lose the original | ✓ | ✓ | `convex/captures.ts` `create` | insert `captures` (raw fields) |
| **2. Type-detect** | Decide `rawType` (text vs URL vs quote vs image vs video_link); URL/video sniffing on paste | (auto) | (auto) | client `QuickInput` + server | sets `captures.rawType` |
| **3. Extract → text** | Turn the raw artifact into plain text the model can read (see 3c per-type) | (auto) | (auto) | `convex/ai/distill.ts` (+ extractors) | transient text |
| **4. Distill** | One `gpt-4o-mini` JSON-mode call → `{title, essence, pillars[]}` | (auto) | (auto) | `convex/ai/distill.ts` `distillCapture` | patch `captures.distilled` |
| **5. Embed** | Embed `"title. essence"` → 1536-dim vector for semantic recall | (auto) | (auto) | `convex/ai/embed.ts` `embed` | patch `captures.embedding` |
| **6. Route** | Decide: Inbox (default) / direct-placement / Mirror-only | (auto + user) | ✓ | `placement.ts` + Mirror delta | see 3d |
| **7. Place → node** | On Place, mint a node (spiral, non-overlapping) carrying title/text/image/pillars | ✓ (Place) | ✓ (arrange/place) | `convex/placement.ts` `place` | insert `nodes`, patch `captures.placedAt/nodeId` |
| **8. Mirror delta** | Emit themes/values/recurring nouns to the Mirror (even if dismissed) | (auto) | (auto) | `interactions` → Mirror | insert `interactions`, async Mirror update |
| **9. Dismiss** | Soft-delete the capture without placing; raw + delta retained | ✓ | ✓ | `captures.softDelete` | `captures.isActive=false` |

The defining shape of the v1 distill action (grounded in Plan 1, Task 7): fetch the capture server-side → resolve `content = rawText ?? rawUrl ?? "[Image: <storage url>]"` → one chat completion with `response_format: { type: "json_object" }` → `parseDistill()` (defensive: caps `title` to 100 chars, `essence` to 400, `pillars` to 3, lowercases tags, returns `null` on bad JSON) → embed `"title. essence"` → write `distilled` + `embedding` back in one mutation. If any step yields nothing usable, it **returns quietly** and the raw capture stands (see §6).

### 3c. Extraction, per source type (Step 3 detail)

This is the **media → text-node pipeline** carried over and *modernized* from braindump (`../../research/extraction/01-braindump.md` §4), with platform-native extraction tried **before** any LLM (the cost rule in `../../architecture/ai-layer.md`):

- **Text / quote** — already text. Used verbatim as the distill input (long text truncated to the distill budget; see §6). Quotes keep their optional attribution.
- **Image** — v1: the storage URL is handed to the distiller as `[Image: <url>]` and **GPT-4o vision** reads it (OCR of any text in the screenshot + a description of the scene), returning the same `{title, essence, pillars}`. This replaces braindump's deprecated `gpt-4-vision-preview` standalone `analyzeHandwriting` tool and **wires OCR directly into the capture flow** (braindump's gap: its Vision OCR was never connected to attachment-create). Cheap pre-checks (image dimensions, thumbnail) come from braindump's browser-native `getImageDimensions`/`generateThumbnail` utilities (reuse).
- **Link (URL)** — fetch the page server-side and pull **OG/Twitter/meta** (title, description, image, favicon) via the dependency-free scraper ported from braindump's `api/link-preview` (with tightened SSRF: block private IP ranges and internal redirects). v1 distills from the title+description; richer "fetch the body and summarize it" is the natural extension so links become first-class recall-able context (braindump recommended this; we adopt it).
- **Video link** — try **platform-native captions/transcript first** (YouTube/IG/TikTok caption tracks, oEmbed title/author) — the "platform-native extraction before LLM" rule. Distill from transcript+title. If no transcript is available, fall back to OG metadata (title/thumbnail/description) like any link. (Full audio transcription of arbitrary video is out of v1 scope; we lean on existing captions.)
- **PDF** (post-v1 intake) — extract the text layer (pdf.js / server parse) and distill the text; page-count/nav model from braindump is fine. braindump only ever drew a *fake* PDF thumbnail and never OCR'd PDFs — we fix both. Until then, PDFs fall under "unsupported media → store + flag" (§6).
- **Audio** (Plan 3) — record-then-process: `MediaRecorder` blob → **Whisper** transcript → the Coach **segments** the transcript into discrete nodes (sequential thoughts optionally linked). Each segment can itself be distilled/embedded. Live streaming (OpenAI Realtime) is later. See [`audio-capture.md`] and `../../research/extraction/02-pillaros.md` §4 for the rebuilt-on-OpenAI rationale (PillarOS's Gemini-Live implementation leaked its key; we use server-minted/ephemeral and Whisper).

### 3d. The routing decision (Step 6 detail)

Every distilled capture takes exactly one of three routes:

| Route | When | Effect |
|---|---|---|
| **Inbox (default)** | Almost always in v1 | Capture sits in the Whiteboard Inbox tray as a distilled card awaiting Place/dismiss |
| **Direct placement** | Coach-driven ("save this onto the board near X"), or a future auto-place setting | Skips the tray; `placement.place` runs immediately and a node appears |
| **Mirror-only** | Capture is meaningful but not board-worthy (or user dismisses) | No node; the delta still informs the Mirror |

The **three writes** that define this feature: (1) the **capture record** (immutable raw + later distilled + embedding), (2) the **node** (only on placement — a capture's *visual presence*), and (3) the **Mirror delta** (always, even on dismiss). A capture is the *event of inspiration*; a node is its *visual presence*; the Mirror is what it *taught the system* (`../../architecture/data-model.md` notes).

## 4. Dynamics & interactions

- **Context Bus** (`../../architecture/context-bus.md`): Intake is not a surface, so it does not publish selection/viewport/surface snapshots itself. Instead it **populates the substance** that surfaces publish and the Assembler retrieves. Specifically, it **activates the dormant embeddings** — braindump computed an embedding on every idea but *never read it* (`../../research/extraction/01-braindump.md` §6: the `/similar` route called a `match_ideas` RPC that didn't exist). LifeGuide makes those embeddings the **semantic-retrieval backbone**: every capture/node carries one, and the Assembler's "semantic retrieval for the long tail" (PRD §4.3) pulls relevant off-screen captures by vector similarity instead of dumping everything. **We activate the embeddings — we do not re-derive them.** Intake contributes no Coach tools of its own (placement/dismiss live on the Whiteboard's registry); the Coach captures-as-agent by writing a `captures` row with `source:"agent"`, which then flows through the identical pipeline.
- **The Mirror** (`mirror.md`): every capture emits a **delta** — recurring nouns/verbs, themes, values, identity claims, north-star candidates — extracted cheaply and batched. **Dismissed captures still write to the Mirror** (the system learns from what he *almost* kept). This is the compounding loop: distill-on-write keeps the deltas pre-summarized, so Mirror accumulation stays cheap.
- **The Whiteboard** (`whiteboard.md`): the primary consumer. The Inbox tray renders distilled captures; **Place** turns a capture into a node via `placement.place` (spiral, non-overlapping placement reused from braindump's `idea-positioning.ts`), copying `distilled.title`, the resolved text/image, and `distilled.pillars` onto the node and stamping `captures.placedAt`/`nodeId`. The "distilling…" state in the tray is the Whiteboard's window into this pipeline.
- **Pillars** (`pillars.md`): distillation **suggests** pillar tags from the preset vocabulary (`lifestyle, health, relationships, financial, growth, money, spirit`). Tags are reinforcement signals, not containers; a capture can carry 0–3. The default "Lifestyle" pillar means even an untagged capture has a home (progressive disclosure — no setup screen).
- **The Coach** (`coach.md`): reads distilled captures + their embeddings as part of assembled context; can **route from far away** (place/dismiss/arrange a capture while the user is on another surface) and can **author captures** (generated image, synthesized quote) that re-enter the pipeline. Audio segmentation (Plan 3) is a Coach action over a Whisper transcript.
- **The Guide** (`guide.md`) / **daily ritual** (`daily-ritual.md`): captured themes feed what the Guide reflects back ("what I've noticed about you"); a morning/evening capture is just another input through this same door.

Architecturally: distillation runs **server-side as a Convex action, scheduled immediately after the capture insert** (`scheduler.runAfter(0, …)`). The server boundary is "where runaway cost dies" (`../../architecture/ai-layer.md`) — log, throttle, abort there.

## 5. States

A capture moves through a small, legible lifecycle: **captured → distilling → distilled → placed / dismissed** (with **failed** as a terminal-but-recoverable variant). What each looks/behaves like:

- **Captured (raw, just landed).** The `captures` row exists with raw fields; the artifact is safe. The Inbox card shows the raw thumbnail/text and a quiet **"distilling…"** shimmer. Crucially, **capture never blocks on AI** — even if the model is down, the row stands.
- **Distilling.** The scheduled action is running (extract → distill → embed). UI: the shimmer persists. This is the only "loading" the user perceives, and it's non-blocking (he can keep capturing or working).
- **Distilled.** `captures.distilled = {title, essence, pillars}` and `captures.embedding` are written. The card flips to title + essence + tags. The capture is now placeable and already retrievable by semantic search.
- **Placed.** `placement.place` minted a node; `captures.placedAt` + `nodeId` are set. The capture leaves the Inbox tray and lives on the board as a node (its visual presence). The capture record persists immutably behind it.
- **Dismissed.** `captures.isActive = false`. No node; removed from the tray. The Mirror delta has already been (or is still) emitted — dismissal is *not* erasure of meaning.
- **Failed (recoverable).** Distillation produced nothing usable (bad JSON, model error, unsupported media, empty content). The capture **stays as raw**; the card shows the raw content and remains placeable as a raw node. Distillation may retry; the pipeline degrades, it does not break (`../../architecture/ai-layer.md`). See §6.

Across all states: **Convex reactivity** means the flip from distilling→distilled, and any cross-device placement, syncs in real time without polling. Empty/first-use: there is no separate "intake empty state" — the empty Whiteboard's single gentle prompt *is* the first capture invitation; onboarding may pre-seed captures from the user's first inputs.

## 6. Edge cases & failure modes

| Case | Behavior |
|---|---|
| **Distill failure → raw fallback** | If the `gpt-4o-mini` call errors, returns malformed JSON, or `parseDistill` returns `null`, the action **returns quietly**; `distilled` stays unset and the capture remains its raw self. The Inbox card shows raw content; it is still placeable (becomes a raw text/image/link node). Never blocks placement. Distillation may be retried later (the raw is preserved, so re-running is safe and idempotent). |
| **Unsupported / unknown media** | Anything we can't yet extract (e.g. PDF pre-Plan-X, video, exotic file types) is **stored + flagged**: the `captures` row and `_storage` blob persist, `rawType` records what it is, and it's surfaced as a raw card. No data loss; distillation simply no-ops for that type until an extractor exists. |
| **Huge content** | Text/transcripts are **truncated to the distill budget** before the model call (the embed action already slices input to ~8000 chars; the distill input is similarly capped). The output is bounded structurally: `title ≤ 100` chars, `essence ≤ 400`, `pillars ≤ 3` (enforced in `parseDistill`, not trusted from the model). A very long audio transcript is **segmented into a bounded number of nodes** with overflow folded into one summary node (Whiteboard §6 / [`audio-capture.md`]). |
| **Paywalled / blocked / dead URLs** | The link scraper is **best-effort**: on fetch failure, redirect-to-internal, or empty/garbage HTML, we **store the URL** and distill from whatever we have (often just the URL string and any OG title). The capture is never lost; it degrades to "a saved link we couldn't read fully." SSRF guard blocks private IP ranges / localhost / internal redirects (tightened from braindump's basic guard). |
| **Video with no transcript** | Falls back to OG/oEmbed metadata (title, channel, thumbnail, description) and distills from that, like any link. |
| **Duplicate captures** | **Allowed in v1.** The same screenshot pasted twice creates two captures (and potentially two nodes). Capture is intentionally frictionless; **dedup is a later concern** (an embedding-similarity check at capture time is the obvious post-v1 lever, and the embeddings to power it already exist). |
| **Paste into a text field** | The global paste handler **ignores** pastes targeted at a textarea/input, so editing a node's text doesn't spawn a stray capture (shared rule with Whiteboard §6). |
| **Empty / whitespace capture** | If extraction yields no usable `content`, the action returns without calling the model (no cost). The (empty) capture can be dismissed. |
| **AI layer fully down** | Capture, store, and **manual placement all still work** — the board never hard-depends on the model (`../../architecture/ai-layer.md`). Captures sit raw until the model recovers; distillation is a retriable enhancement, not a gate. |
| **Cost runaway (highest-volume call)** | Distillation is the **highest-volume AI call** in the system (one per capture). Mitigations: cheap tier (`gpt-4o-mini`) by default, length-gating (skip heavy distill for trivially short text — the braindump <60-char lesson), platform-native extraction before any LLM, embed-once-reuse-forever, and the server boundary as the throttle/abort point. |
| **Multi-device race on placement** | Placement is a server mutation; Convex reconciles. A capture already `placedAt` won't double-place (the mutation reads current state). |
| **Large Inbox backlog** | Distillation is scheduled per-capture and naturally serializes through Convex; a flood of pastes queues rather than stampedes. Batching the silent work (deltas, daily generation) is the cost discipline (`../../architecture/ai-layer.md`). |

## 7. AI involvement

Every AI process here runs **server-side** in Convex actions; the OpenAI key never reaches the client (fixing the PillarOS leak, `../../research/extraction/02-pillaros.md` §4/§12). All model/param/prompt config lives in **one hub** — `convex/ai/config.ts` (the `AI` object), the `AI_PROCESSES` pattern ported from PillarOS plus braindump's `src/lib/ai/` shape, with a `provider` field reserved for multi-model later (`../../architecture/ai-layer.md`).

| Process | Model | Mode | Where | Role in this pipeline |
|---|---|---|---|---|
| **Distillation** | `gpt-4o-mini` | JSON mode (`response_format: {type:"json_object"}`), `temperature ~0.4` | `convex/ai/distill.ts` `distillCapture` | The core call: raw text/URL/image-ref → `{title, essence, pillars[]}`. One call per capture. Output is **structurally clamped** by `parseDistill` (lengths + pillar count + lowercase), never trusted raw. |
| **Embeddings** | `text-embedding-3-small` (1536-dim) | — | `convex/ai/embed.ts` `embed` | Embeds `"title. essence"` (input sliced to ~8000 chars) → Convex vector index. **Embed once, reuse forever.** This is the activation of braindump's dormant, computed-but-unused embeddings — now the recall backbone. |
| **OCR / Vision** | `gpt-4o` (vision) | (same JSON distill prompt, with image) | `convex/ai/distill.ts` (image path) | Reads text *and* scene out of pasted screenshots/photos, folded into the same distill output. Modernizes braindump's deprecated `gpt-4-vision-preview` and **wires OCR into the capture flow** (it was a disconnected standalone tool before). |
| **Transcription** | Whisper (`whisper-1` / `gpt-4o-transcribe`) | record-then-process | Plan 3 (`convex/ai/transcribe.ts`) | Audio → text, then segmented into nodes by the Coach. Live streaming (Realtime API, ephemeral tokens) is later. |
| **Mirror delta extraction** | cheap tier, batched | — | Mirror pipeline (`mirror.md`) | Pulls themes/values/recurring terms from each capture; batched to stay cheap. |

**The distill prompt** (lives in `convex/ai/config.ts`, not hardcoded in the action): instructs the model to return *only* JSON with a 3–6-word noun-phrase `title`, a 1–2-sentence `essence` about "what the person likely found meaningful," and 0–3 lowercase `pillars` from the preset set — and explicitly to **avoid generic words like "inspiration"/"motivation"** and be specific. Full prompt text and per-process params: `../../architecture/ai-layer.md`.

**Cost profile.** Distillation is the **highest-volume call** in LifeGuide (one per capture), so the entire cost posture is built around making it cheap and not redundant: cheap model tier by default, length-gating, platform-native extraction first (captions, OG tags) before spending an LLM call, batching the silent delta work, embedding exactly once, and killing runaway cost at the server boundary (log/throttle/abort). See the cost-discipline section of `../../architecture/ai-layer.md`.

**Graceful degradation.** If any model is unavailable, **capture and manual placement keep working**; distillation retries; nodes fall back to raw content. The pipeline is an enhancement layer over an always-functional manual core — it never hard-depends on a live model.

## 8. Data touched

Schema and indexes: `../../architecture/data-model.md`.

- **`captures`** — the heart of this feature. Written at capture (`source`, `rawType`, one of `rawText`/`rawUrl`/`rawFileId`, `isActive`, `createdAt`); patched at distill (`distilled{title, essence, pillars[]}`, `embedding`); patched at placement (`placedAt`, `nodeId`); soft-deleted on dismiss (`isActive=false`). The **immutable raw** fields are never overwritten — a capture is the permanent *event of inspiration*. Indexes: `by_user[userId, createdAt]`, `by_user_unplaced[userId, placedAt]`.
- **`_storage`** — Convex file storage for uploaded/pasted/dropped binaries (images, later PDFs/audio). `captures.rawFileId` references the blob; nodes reference it via `fileId`/resolved `imageUrl`. (We store **references**, not base64-in-row — explicitly fixing braindump's base64-in-DB bloat, `../../research/extraction/01-braindump.md` §4a.)
- **`nodes`** — written **only on placement**: `captureId`, `type` (text/quote/image/link), resolved `text`/`imageUrl`/`fileId`, `title` (from `distilled.title`), `pillars` (from `distilled.pillars`), `embedding` (carried/derived), spiral `position`, `dimensions`, `isActive`. Vector index `by_embedding(1536, filter userId)`.
- **`mirror`** — receives deltas (themes/values, into `structured` + the rolling `summary`); versioned (`version`, `takenAt`). Written async on significant capture events, including dismissals.
- **`interactions`** — the event log (`type`, `payload`, `at`) for capture/distill/place/dismiss events; the **source of Mirror deltas**.
- **`pillars`** — read for the preset tag vocabulary and reinforced by distillation's tag suggestions; v1 seeds the single default "Lifestyle" pillar.

## 9. Reuse & build notes

The whole feature is an **assembly of two proven patterns**, modernized:

- **From `braindump` (`../../research/extraction/01-braindump.md`) — the media → text-node pipeline.** Reuse/adapt: image metadata + thumbnail utils (§4b, browser-native, no deps — reuse); the dependency-free **link-preview / OG scraper** (§4d — reuse, tighten SSRF); the **PDF** text-extract model (§4c — adapt; replace the *fake* thumbnail with real pdf.js text extraction and actually OCR it); **GPT Vision OCR** (§4e — adapt: bump deprecated `gpt-4-vision-preview` → `gpt-4o`, run it **through** the central AI runner instead of a raw fetch, and **wire it into the capture flow** which braindump never did); the **length-gated AI** idea (<60 chars ⇒ skip the heavy call — §2b); spiral **non-overlap placement** (`idea-positioning.ts` — reuse for Place). **Activate the dormant embeddings** (§6): braindump *computed and stored* an embedding on every idea but the read path was dead (`match_ideas` RPC never existed, no UI caller). The expensive half is already designed; we build the cheap half (reading them) and make embeddings the recall spine. **Drop:** base64-in-DB file storage (use Convex `_storage` references); the orphan `BackgroundJobQueue` (Convex scheduled actions replace it); the two-divergent-pipeline mess (one server-side chokepoint that logs cost).
- **From `PillarOS` (`../../research/extraction/02-pillaros.md`) — the `analyzeIntakeItem` distill-on-write pattern (§6).** Reuse the shape: paste anything → one structured-output AI call → `{title, clean content/essence, analysis, suggested classification}` → review → commit, with token accounting and **graceful degradation** (missing key/parse failure → return the original). Adapt: swap Gemini `responseMimeType`/`responseSchema` for OpenAI **JSON mode** (`response_format`) + vision; route the distilled item straight into the Context Bus so every surface sees it. Reuse the **`AI_PROCESSES` config hub** (§7 — the single best structural idea there; add the `provider` field) and the **review-queue UX** (distill in the background, commit on approval — our Inbox tray *is* this review queue). **Drop:** the client-leaked key (server-side actions only); the single growing text-blob memory (the Mirror is structured + embedded instead).

**Key gotchas to carry in:** distillation is the **highest-volume** call — keep it on the cheap tier, length-gate it, and try platform-native extraction first. **Capture must never block on AI** (schedule the action; persist raw first). **Clamp model output** in code (`parseDistill`), don't trust it. **Embed once.** Store **file references, not blobs.** Keep the **raw immutable** so re-distillation is always safe.

Build source of truth: `../../plans/2026-05-20-lifeguide-v1-plan1-foundation-whiteboard.md` (Task 6 — capture intake paste/upload/URL + files; Task 7 — distillation pipeline + embed + placement + Inbox).

## 10. Open questions

- **Share-sheet vs email-forwarding for mobile intake** (v1.5): which lands first, and what `source` enum values they take. Share-sheet is the more native "save this Reel" path; email-forwarding is the lowest-effort to ship.
- **Auto-place vs always-inbox:** v1 defaults every capture to the Inbox tray. When (if ever) should distillation route a high-confidence capture **directly** onto the board (or Mirror-only) without the tray? Tie to a Settings preference.
- **How much "why this resonates" to infer and store.** The `essence` already guesses "what the person likely found meaningful." Do we store a separate, more speculative resonance signal for the Mirror, and how do we keep it correctable (it's a draft, not a verdict — the Mirror principle)?
- **Dedup policy.** v1 allows duplicates. When duplicates become noise, do we dedup at capture time via embedding similarity (the embeddings exist), and do we merge or just flag?
- **Link body depth.** v1 distills from OG title/description. When do we fetch and summarize the full page body (richer recall) vs stay light (cost)? Likely a per-type budget call.
- **Video transcription depth.** v1 relies on existing captions/oEmbed. Is full Whisper-over-video ever in scope, or do we always lean on platform captions?

Promote resolved questions to an ADR in `../../decisions/`.
