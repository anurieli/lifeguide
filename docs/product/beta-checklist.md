# Beta-Tester Onboarding Checklist

**Status:** written 2026-07-18 (ARI-20) · **Companion to:** [`onboarding-strategy.md`](onboarding-strategy.md)

> The concrete list of everything needed before real beta testers can start using LifeGuide. Written by reading the actual auth (`convex/auth.ts`), AI config (`convex/ai/config.ts`), and security posture (`../architecture/security-privacy.md`) currently in the codebase — not aspirational. Where something is not yet built or not yet decided, it's marked **NOT READY** or **DECISION NEEDED** rather than assumed.

---

## 1. Accounts & auth

LifeGuide ships two Convex Auth providers today (`convex/auth.ts`):

- **Anonymous** — instant, cookie-bound, no signup friction. Works out of the box. **Caveat:** clearing cookies or switching browsers/devices loses the identity entirely (fresh empty person). There is **no account-linking path** from anonymous → Google yet (`docs/README.md`: "Account linking (anonymous data → Google account) — not built (clean start chosen)").
- **Google** — durable, survives cookie clears, works across devices. Code is wired but **requires `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET`** set in the Convex deployment environment, plus the OAuth callback URL (`https://<deployment>.convex.site/api/auth/callback/google`) registered in the Google Cloud OAuth client. Session cookies are set with a rolling 14-day `maxAge` (`middleware.ts`), so a beta tester is only asked to re-auth after 14 days of not opening the app.

**Given the observation contract asks for a two-week window of return visits (see `onboarding-strategy.md` §3), beta testers should sign in with Google, not stay Anonymous.** Anonymous is fine for a single throwaway look-around session but will silently lose a tester's entire Core/Sessions history on cookie clear or device switch — unacceptable for a two-week test.

- [ ] Confirm `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` are set in the target Convex deployment.
- [ ] Confirm the Google Cloud OAuth client's authorized redirect URI matches the deployment's `.convex.site/api/auth/callback/google`.
- [ ] Confirm each tester actually completes Google sign-in (not just "just look around") before they start the real two-week test — verify in `/admin` or the Convex dashboard `users` table that the row isn't anonymous-only.
- [ ] Decide and communicate: is this an invite-only beta (a fixed list of testers) or open sign-up? (**DECISION NEEDED** — nothing in the codebase gates or restricts who can sign in; every Google account that reaches the OAuth screen gets in.)

## 2. Environment / deployment

- **Domain:** production is `https://mylifesguide.com` (`www.mylifesguide.com` also whitelisted). One shared Convex deployment (`gregarious-boar-475`, per `docs/architecture/security-privacy.md`) currently serves both local dev and prod — `SITE_URL` and the `ALLOWED_APP_ORIGINS` whitelist in `convex/auth.ts` are what make that safe; if beta testers are pointed at a different domain, that domain must be added to the whitelist and to Google's authorized origins, or OAuth redirect will throw.
- **Required Convex deployment env vars** (from `convex/ai/config.ts`, `convex/auth.ts`):
  - [ ] `OPENROUTER_API_KEY` — primary AI provider (distillation, Coach replies, synthesis, thought maps).
  - [ ] `OPENAI_API_KEY` — fallback provider, and **required separately** for the voice interview (OpenAI Realtime API is not proxied through OpenRouter — `convex/ai/voice/openaiRealtime.ts` calls `api.openai.com` directly). If this is missing, voice onboarding will error and fall back to text (the UI handles this gracefully, but voice testers won't be able to use it).
  - [ ] `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` — Google sign-in (see §1).
  - [ ] `SITE_URL` — should point at whatever domain testers actually use.
  - [ ] Confirm the app's own env (`.env.local` or deployment config) points `NEXT_PUBLIC_CONVEX_URL` / equivalent at the correct Convex deployment (dev vs. prod) — testers must not accidentally land on a dev deployment with stale or seeded data.
- [ ] Confirm the deployment is reachable over HTTPS on a stable, sharable URL (not `localhost`) — beta testers are external and need a real link.
- [ ] Smoke-test end-to-end on a clean (non-dev) account before sending invites: sign in, complete the Door, run one interview question, confirm a Coach reply comes back, confirm no console errors.

## 3. What to test

Give each beta tester the same walk-through so feedback is comparable. In order:

1. **Onboarding** (see `onboarding-strategy.md` §4 for the full journey): the Door, choosing an experience (try **both** text and voice across your tester pool, not just one), the interview (answer some, skip some, let at least one circle-back happen), Synthesis, and the reveal screen.
2. **Today (the daily ritual).** Morning and evening beats — note this is genuinely **time-gated in the shipped app** (morning is only reachable before ~5pm, evening after 5pm/before 4am per `TO-CHECK.md`'s "Ritual beats locked to the clock" section) — a tester opening the app mid-afternoon will only see the morning tab active. Testers should be told this up front so it doesn't read as a bug.
3. **Thought capture (Thoughts / Sessions).** Start a fresh entry via the ➕, try both a typed and a spoken take, try the "Brain dump" vs. "Conversation" mode toggle, try "Map my thinking."
4. **The Board (vision board).** Confirm the Door's answer and any subsequent captures land as nodes; try the "Add anything" capture path directly.
5. **The Guide.** Confirm the Blueprint N/18 + Level marker reflects onboarding progress; look at the Mirror/pillars view.
6. **The Coach.** Open the dock from at least two different surfaces; confirm it has page-specific context (ask it something about what's currently on screen).
7. **Settings.** Rhythm, tone, pillars — confirm changes persist across a reload.
8. **Mobile.** At minimum one full pass (Door → interview → Today → Thoughts) on an actual phone, not just a resized desktop browser — several recent fixes (cold-start take loss, quick-record swipe, mobile feedback nub) were mobile-only bugs.

## 4. What to capture / report

- **In-app feedback widget is the primary channel** (`components/*` feedback widget, `docs/product/features/feedback-widget.md`): a draggable "Feedback?" tab (desktop) / nub (mobile) on every authenticated screen. Testers should use it live, in the moment something feels off — it auto-captures the route, page state, viewport, and recent console errors alongside their note, and (bug/feature/other) can include screenshots or a dictated note. **Tell testers explicitly to use this instead of a separate bug tracker or Slack message** — it's the only path that ships full repro context automatically.
- **The feedback queue lives at `/admin`.** This is owner-gated (per ADR 0006 admin-gating pattern) — only Ariel reviews and triages incoming tickets there; testers do not need or get access to `/admin` themselves.
- [ ] Confirm `/admin` is reachable and the feedback queue is empty/clean before beta starts, so incoming tickets are easy to distinguish from any dev-phase noise.
- **Beyond the widget**, ask testers to specifically flag (even if the widget doesn't have a dedicated field for it):
  - Any point where they felt pushed, judged, or rushed — this is a direct violation of the "calm, never bombarding" design contract and should be treated as a P0 UX bug, not a style nitpick.
  - Any point where the Coach said something generic or clearly not grounded in what they'd actually written — a correctness signal on synthesis/coaching quality, not just UI.
  - Whether they understood, unprompted, what the app wanted from them over the next two weeks (this directly tests the onboarding-strategy gap flagged in §4 of that doc — the observation contract isn't stated in the flow yet, so expect testers to be unclear on this until the tour build closes it).

## 5. Success criteria

A beta cohort onboarding pass is successful if, per tester:

- [ ] They reach `settings.onboardedAt` set (completed or explicitly skipped) without a dead end, crash, or unrecoverable error.
- [ ] At least one Blueprint box is filled by the end of onboarding (i.e., they didn't hit the header "skip →" as their very first action) — a full 0-for-18 skip is a signal the Door/interview isn't landing, not just an acceptable off-ramp.
- [ ] They return for at least one more session within 48 hours without being prompted outside the app (validates the ritual handoff, not just the interview itself).
- [ ] They file at least one piece of feedback (bug, confusion point, or positive note) via the widget — silence is not success, it's ambiguous.
- [ ] No P0 (data loss, crash, cannot proceed) reports in the first session for any tester. Any single P0 pauses further invites until root-caused.
- [ ] By day 7-14 (per the observation contract's own timeline), at least a majority of the cohort has logged the "seven or eight brain dumps" + regular check-in cadence the contract asks for — short of that, the test is measuring onboarding friction more than product value, and that's worth knowing explicitly rather than reading low usage as "they didn't like it."

---

## See also

- [`onboarding-strategy.md`](onboarding-strategy.md) — the outcome, ICP, readiness, and journey this checklist is testing against.
- [`features/feedback-widget.md`](features/feedback-widget.md) — the feedback mechanism in full.
- [`../architecture/security-privacy.md`](../architecture/security-privacy.md) — the auth and multi-tenancy trust contract.
