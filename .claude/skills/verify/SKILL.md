---
name: verify
description: How to build, launch, and drive LifeGuide locally to verify a change end-to-end (Next.js + Convex dev deployment)
---

# Verifying LifeGuide locally

## Launch

1. Backend push (REQUIRED after any convex/ change; `npx convex codegen` alone does NOT deploy functions):
   `npx convex dev --once` (pushes schema + functions to the dev deployment in .env.local, gregarious-boar-475)
2. Frontend: `npm run dev` (Next.js on http://localhost:3000). Background it; ready in ~10s.

## Gotchas

- Schema pushes validate against LIVE data. Deployed rows may carry statuses/fields from branches or stashes that were deployed earlier (e.g. `interviewSessions.status: "tossed"`). If validation fails, the working-tree schema is missing something the data already has.
- First paint can be blank for a few seconds while the auth gate resolves; wait and re-screenshot.
- `npx next lint` is not configured (interactive prompt); skip lint.

## Drive

- Sign in: on the door, "or just look around →" creates a throwaway anonymous account (safe for testing, no credentials).
- Onboarding: "skip →" (top right, partially under the avatar bubble) jumps straight to the shell.
- Rail views: Today / Core / Board / Thoughts (the `dump` view) / Settings via the account menu.
- Thought Stream: composer at top. Cmd+Enter submits text; a bare URL becomes a link capture; statuses ("Reading the link…", "fetch failed" + Try again) and receipts ("What I took from it") fill in live via Convex reactivity, no refresh needed.
- AI keys (OpenRouter/OpenAI) are set on the dev deployment, so distillation/extraction run for real.

## Can't drive via automation

- Mic recording (OS mic permission dialog) and native file pickers (image/file upload). Verify those by hand or leave them to Ariel's manual QA list (TO-CHECK.md).
