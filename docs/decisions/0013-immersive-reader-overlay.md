# 0013. The immersive reader is a full-screen overlay, not scroll-pinning

**Status:** accepted (live) · **Date:** 2026-07-12 · **Revised:** 2026-07-20 (release is explicit, not automatic — see §Revision)

## Context

"Read" ritual steps deserve a stop-scroll moment: tapping the step should fill the viewport with the words (the full 8-pillar Blueprint doctrine is the design case), hold the page still while the reader scrolls the content, and — when the end is reached — mark the step read and release. The original sketch was scroll-pinning: capture the page's scroll and redirect it into the card until the content is exhausted. Scroll-pinning (scroll hijacking) is notoriously unreliable on mobile Safari — rubber-banding, address-bar collapse, touch-cancel quirks — and this surface is used on a phone at 7am.

## Decision

Skip the pinning attempt entirely and ship the fallback as the design (`components/today/ImmersiveReader.tsx`, factored into a reusable `ImmersiveShell` + `ImmersiveReader` on 2026-07-20 so the Blueprint's own immersive view — `components/settings/BlueprintImmersive.tsx` — can reuse the same overlay/scroll/release chrome for structured content):

1. **A full-screen, in-page overlay** (`position: fixed`, no navigation) with **natural inner scroll** (`overflow-y: auto; overscroll-contain`) and `document.body` scrolling locked behind it.
2. **Reaching the end marks the content read** (scroll bottom within 24px → a "Read ✓" confirmation appears, pinned at the bottom). Content shorter than the viewport counts as read after a considered pause (2.6s).
3. **Never a trap:** a visible close affordance sits in the header at all times; closing early neither marks nor blocks anything, and "Read again" is always offered.
4. Typography over chrome: one measure (~560px, wider for the Blueprint's structured pillar cards), 17px, generous line height, doctrine markdown rendered pillar-by-pillar with a tiny built-in renderer (no dependency).

## Revision (2026-07-20): the release is explicit, never automatic

The original design auto-closed the reader ~1.1s after reaching the bottom (`setTimeout(onClose, 1100)` inside `finish()`). Ariel wants the opposite: reaching the end must never close the reader on its own. Reaching the bottom (or the short-content pause) now only marks the content read and reveals a **pinned red "Done" button** at the bottom, next to the "Read ✓" confirmation — **only clicking that button closes the reader.** The header's top-left X remains the early-exit affordance (unchanged: it neither marks nor blocks). This applies uniformly to every consumer of `ImmersiveShell`, including the Blueprint's immersive view.

Rationale: an automatic close, even a gentle one, still takes the decision to leave out of the person's hands at the exact moment they finished reading — the moment most worth lingering in, not being swept past.

## Consequences

- Identical, boring-in-the-good-way behavior across iOS Safari, Android, and desktop; no scroll-event fighting.
- The "page continues past it" feel of true pinning is approximated by the release-on-finish, not literally implemented. Accepted.
- Auto-mark-on-scroll-end can be gamed by flick-scrolling to the bottom. Accepted: the ritual is a promise to yourself, not a compliance system (same stance as the checklist).
- `body` overflow locking is the one global side effect; it is restored on unmount.
- The reader now stays open indefinitely once finished, until the person actively dismisses it — a deliberate trade of "gets out of your way fast" for "never rushes you out."
