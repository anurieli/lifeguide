# VoiceField

A voice-capable input you can drop into **any** text field in LifeGuide. It behaves
the same everywhere: tap the mic → speak → see a live transcript → the words get
shaped by AI into what the field is actually asking for, with contextual "say this
next" prompts floating around the field while you talk.

It's a **drop-in replacement for a controlled `<textarea>`** — same `value` /
`onChange` contract — plus voice. If you can wire a textarea, you can wire this.

> Product spec (behavior, states, edge cases, AI): [`docs/product/features/voice-field.md`](../../docs/product/features/voice-field.md).
> AI layer: [`docs/architecture/ai-layer.md`](../../docs/architecture/ai-layer.md) (role 6).

---

## Quick start

```tsx
import { VoiceField } from "@/components/voice/VoiceField";

const [text, setText] = useState("");

<VoiceField
  meta={{
    id: "today.one-move",
    question: "What's one small thing today that points at it?",
    descriptor: "It can be tiny. That's the point.",
    placeholder: "It can be tiny. That's the point.",
    intent: "extract a single concrete, doable action for today",
  }}
  value={text}
  onChange={setText}
  onCommit={(v) => save(v)}   // optional: fired on blur + after a voice answer is shaped
/>
```

That's the whole integration. The host keeps rendering the field's label/question;
`meta` carries that same info to the AI so shaping + prompts are about THIS field.

---

## The field bundle (`meta`)

The one thing each mount must provide. Defined once in [`lib/voiceField.ts`](../../lib/voiceField.ts).
Kept deliberately minimal for v1.

| Key | Required | Purpose |
|---|---|---|
| `id` | ✓ | Stable key for the field (e.g. `"today.one-move"`, a blueprint `qKey`). Used for telemetry/where the answer lives. |
| `question` | ✓ | The question the field asks. Given to the AI as the field's identity. |
| `intent` | ✓ | One short phrase telling the AI what a *good answer is* (e.g. "extract a single concrete action"). **The biggest lever** on shaping + prompts. |
| `descriptor` | – | One-line helper under the question; also extra AI framing. |
| `placeholder` | – | Placeholder for the idle text box. |

Same component + different bundle = different behavior, no per-field code.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `meta` | `FieldMeta` | — | The field bundle above. |
| `value` | `string` | — | Controlled value (like a textarea). |
| `onChange` | `(next: string) => void` | — | Fired on typing and after shaping/raw-toggle. |
| `onCommit` | `(next: string) => void` | – | Persist hook: fired on blur and after a voice answer is shaped. Use this for autosave-on-blur fields. |
| `variant` | `"default" \| "compact"` | `"default"` | `compact` is a tighter skin (e.g. a dock). |
| `rows` | `number` | `2` | Idle textarea rows. |
| `className` | `string` | `""` | Wrapper classes (layout: centering, margins). |
| `inputClassName` | `string` | sensible default | Classes for the textarea itself, so each surface keeps its own field styling. Add `pr-12` so text clears the mic. |

## What happens under the hood

1. **Transcription is client-side** — the browser Web Speech API
   ([`lib/useSpeechRecognition.ts`](../../lib/useSpeechRecognition.ts)). No audio leaves
   the device; no server cost. If the browser can't do it, the mic is hidden and the
   field is a plain textarea.
2. On finish, the raw transcript + `meta` go to **`voice.shape`** (a Convex action) →
   cleaned text. The raw is kept; "show raw" reverts in one tap (never silently
   overwritten).
3. While listening, **`voice.prompts`** generates contextual nudges from `meta` + the
   Mirror; the UI shows **one at a time**, inside the recording surface, rotating gently
   and refreshing as you speak. It's ambient: any failure → no prompts, no error.

Both AI tasks live in [`convex/voice.ts`](../../convex/voice.ts) and are tuned in
[`convex/ai/config.ts`](../../convex/ai/config.ts) (`voiceShape`, `voicePrompts`) like
every other AI node — swap model/provider there without touching this component.

## Motion / styling

All animation is CSS in [`app/globals.css`](../../app/globals.css) under the `vf-*`
classes (transform/opacity only, strong ease-out curves, blur to mask state swaps,
`prefers-reduced-motion` honored). The component is markup-only; restyle the field via
`inputClassName` without touching motion.

## Wired today

- **Today** (`components/today/Today.tsx`) — morning "one move", evening reflection.
- **Blueprint / Core** (`components/core/Core.tsx`) — all 18 blueprint boxes.
- **Onboarding** — the Door (`components/onboarding/Door.tsx`, "What do you want out of
  life?") and the text interview (`components/onboarding/Interview.tsx`, every blueprint
  question). The realtime `VoiceInterview` is a separate spoken-conversation path; the
  phone composer (`app/interview/[sessionId]/page.tsx`) is a chat box, a future fit for
  the compact variant.

## Gotchas

- A voice take **appends** to existing field text (newline-joined), never destroys it.
- `onCommit` is where persistence happens for autosave-on-blur fields (Core). Today
  uses an explicit Save button, so it only needs `onChange`.
- Adding new fields needs **no** server changes — `meta` is passed from the client; the
  AI tasks are field-agnostic.
