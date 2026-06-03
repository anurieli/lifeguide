# Design System

**Status:** the visual language (2026-06-03). Calm, masculine, paper-and-ink. The visual target is the clickable prototype [`../../mockup/index.html`](../../mockup/index.html); the implementation source of truth is the live `components/` and the tokens in `tailwind.config.ts` + `app/globals.css`. This doc names the tokens and components; it does not restate the rationale (that is [`interaction-principles.md`](interaction-principles.md)).

> Feel: warm paper, dark ink, one gold accent, a deep ink-blue for "you are here," and a near-black Coach that reads as a separate, trusted voice. Generous space. Soft motion. Nothing shouts.

---

## Tokens

All tokens live in [`../../tailwind.config.ts`](../../tailwind.config.ts) (the `:root` block in the mockup is the same palette). Use the named tokens, never raw hex in components.

### Color

| Token | Hex | Role |
|---|---|---|
| `paper` | `#FAF8F2` | app background, the room |
| `paper-2` | `#F3EFE5` | recessed surfaces, hover wells, segmented track |
| `card` | `#FFFFFF` | every card, the rail, panels |
| `ink` | `#1A1D24` | primary text, dark buttons |
| `ink-soft` | `#444B58` | secondary text |
| `ink-mute` | `#8A8F9C` | eyebrows, meta, placeholders |
| `line` / `line-2` | `#E7E1D4` / `#EFEADE` | borders, dividers (2 is softer) |
| `accent` | `#1E3A5F` | "you are here": active rail item, ritual toggle, links |
| `gold` | `#B8945A` | the single highlight: north star, Coach avatar, primary CTA on key moments |
| `green` `blue` `violet` `teal` | varies | pillar identity colors (assigned per pillar) |
| `coach` / `coach-soft` | `#1E232E` / `#2A303C` | the Coach's near-black world (dock, Mirror) |
| `coach-ink` / `coach-mute` | `#E9E6DD` / `#9AA0AD` | text inside the Coach world |

Discipline: gold is rare. One gold thing per screen (the north star, or the key CTA), never a field of gold. The Coach palette is reserved for the Coach and the Mirror, so the dark always reads as "the voice that knows you."

### Typography
System sans (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`). No web font; speed and calm over personality.

- Display / onboarding H1: ~34px, `leading-tight`, `tracking-tight` (-0.02em).
- Surface title (H2): 30px, tracking-tight.
- North star / Mirror headline: 21–24px, semibold.
- Body: 14.5–17px, `leading-relaxed`.
- Eyebrow / label: 11–12px, `uppercase`, letter-spacing 0.16–0.18em, `ink-mute`. The signature small-caps label sits above most blocks.

### Space, radius, motion
- Surfaces are centered columns: `max-w-[620px]` (Today), `720px` (Guide), `640px` (Settings), with `px-8`–`px-10` and tall top padding (`py-16` on Today). Air is the point.
- Radius: cards `18px`, inner fields `12px`, pills/toggles `999px`, modals `18px`.
- Shadow: barely-there on rest, a soft lift on hover; the Coach dock and FAB carry the only strong shadows.
- Motion: 150–220ms ease, gentle fades and small translate-ups. Cards pop in once (`scale .94 → 1`). The FAB has a slow gold ping. No bounce, no flash. (Honors rule 6 in [`interaction-principles.md`](interaction-principles.md).)

---

## Components

### Rail navigation
[`components/shell/Rail.tsx`](../../components/shell/Rail.tsx). 84px fixed left, `card` background, `line` right border. Logo "L" at top, vertical nav (icon + 10.5px label) in the middle, the user avatar (sign-out) at the bottom. Active item is filled `accent` white; others are `ink-mute`, hover wells to `paper-2`. Lucide icons, 21px, strokeWidth 2.

- **Do:** keep it to a few destinations (Today, Board, Guide, Settings). Persistent, quiet.
- **Don't:** badge it, add counts, or grow it into a sidebar of links.

### Card
White, `1px line` border, `18px` radius, `22–26px` padding, faint shadow. The atomic block of every surface. Variants:
- **Highlight card** (north star, direction): `border-gold` plus a gold ring (`box-shadow:0 0 0 1px gold`). The one gold thing.
- **Field card** (the move, tonight): holds a label, a prompt, a `paper`-filled textarea, one button.
- **Coach card** (Mirror): the `coach` near-black card with `gold` label and tag chips in `coach-soft`.

### Docked Coach
[`components/coach/CoachDock.tsx`](../../components/coach/CoachDock.tsx). A round `coach` FAB bottom-right (gold ping ring when closed) opens a 380px, ~72vh panel in the Coach palette: header (gold avatar, "Coach", a context line like "sees your board · knows you"), scrolling message body (coach bubbles `coach-soft`, user bubbles `gold`), and an input footer with a gold send. Always present, scoped to the current surface. This is rule 3 made physical.

- **Do:** update the context line per surface; keep it dockable and dismissible.
- **Don't:** make it modal or full-screen; it sits beside the work, never over it.

### Inputs and controls
- **Textarea / input:** `paper` fill, `line-2` border, `12px` radius, no focus ring shout.
- **Primary button:** `ink` fill, white, `12px` radius. Gold variant only for key moments ("Enter your space").
- **Ghost button:** transparent, `line` border, `ink-mute` text.
- **Toggle:** 44×26 pill, `green` when on (Settings).
- **Segmented control:** `paper-2` track, active segment is a white `card` with a small shadow (Settings: tone, reaching out, exercise).
- **Pill / chip:** `999px`, `line` border; pillar chips carry a colored dot; "add" chips use a dashed border.

### Board canvas (Board surface)
[`components/whiteboard/`](../../components/whiteboard/). A dotted-grid `paper` viewport you pan and zoom; `world` is the transformed plane. Nodes are cards (text, quote, image, star) with a left pillar-color accent bar, an uppercase kind label, a hover connect-handle (`blue` dot) and delete. Edges are thin `#B6AE9D` SVG lines with italic labels. A floating pill `toolbar` (Text / Quote / Image / Talk) sits bottom-center; the `Inbox` of captures docks top-right.

---

## Do / Don't (system-wide)
- **Do** build every surface as a centered column of cards on `paper`, one gold accent, lots of air.
- **Do** reserve the `coach`/dark palette for the Coach and the Mirror only.
- **Don't** introduce a second accent hue, a web font, hard shadows on content, or any red/urgency color.
- **Don't** fill empty space with widgets. Empty space is the calm (rule 6).

See the per-screen application in [`screens.md`](screens.md).
