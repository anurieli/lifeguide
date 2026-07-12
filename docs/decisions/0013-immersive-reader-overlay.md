# 0013. The immersive reader is a full-screen overlay, not scroll-pinning

**Status:** accepted (live) · **Date:** 2026-07-12

## Context

"Read" ritual steps deserve a stop-scroll moment: tapping the step should fill the viewport with the words (the full 8-pillar Blueprint doctrine is the design case), hold the page still while the reader scrolls the content, and — when the end is reached — mark the step read and release. The original sketch was scroll-pinning: capture the page's scroll and redirect it into the card until the content is exhausted. Scroll-pinning (scroll hijacking) is notoriously unreliable on mobile Safari — rubber-banding, address-bar collapse, touch-cancel quirks — and this surface is used on a phone at 7am.

## Decision

Skip the pinning attempt entirely and ship the fallback as the design (`components/today/ImmersiveReader.tsx`):

1. **A full-screen, in-page overlay** (`position: fixed`, no navigation) with **natural inner scroll** (`overflow-y: auto; overscroll-contain`) and `document.body` scrolling locked behind it.
2. **Reaching the end marks the step read** (scroll bottom within 24px → checked, a subtle "Read ✓" confirmation, then the overlay releases). Content shorter than the viewport counts as read after a considered pause.
3. **Never a trap:** a visible close affordance sits in the header at all times; closing early neither marks nor blocks anything, and "Read again" is always offered.
4. Typography over chrome: one measure (~560px), 17px, generous line height, doctrine markdown rendered pillar-by-pillar with a tiny built-in renderer (no dependency).

## Consequences

- Identical, boring-in-the-good-way behavior across iOS Safari, Android, and desktop; no scroll-event fighting.
- The "page continues past it" feel of true pinning is approximated by the release-on-finish, not literally implemented. Accepted.
- Auto-mark-on-scroll-end can be gamed by flick-scrolling to the bottom. Accepted: the ritual is a promise to yourself, not a compliance system (same stance as the checklist).
- `body` overflow locking is the one global side effect; it is restored on unmount.
