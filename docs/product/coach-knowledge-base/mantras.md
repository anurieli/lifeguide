# Mantras (Coach Knowledge Base)

> Part of the **Coach Knowledge Base** — the canonical coaching content the Coach draws from. The canonical source lives in the developer's Brain Vault (LifeGuide notes); this repo copy is pulled from there to seed the app. Edit the canon in the vault, then sync here. Until the vault note is created, this file is the working home.

## What a mantra is here

A mantra is a short, self-directed line a person reads to absorb, not a task to complete. In this build mantras form a **pool**: a flat, growing list the app draws from.

**The pool model (intended product shape):**

- Individual mantras, one line each. The list grows; the person (and the Coach) can add to it.
- Surfaced **always on screen, ambiently** — one, or a rotating few — **cycling daily**.
- **Independent of the morning/night ritual** in the always-on ambient form. That surface is still deferred (below).

**Live in the app (as of 2026-07-15):** the pool now also seeds the Daily Ritual's **`mantra` component** (see [`../features/daily-ritual.md`](../features/daily-ritual.md)) — a code-resident copy in `lib/mantras.ts`. Inside a scroll it renders **inline** (no reader, no Read tap — mantras are short) and **rotates deterministically per ritual day**, so the line differs by the day. This is beat-gated (it fires inside a morning scroll); the always-on ambient surface remains distinct and deferred. A person's own edits to a ritual mantra line live on that `ritualItems` row (their Personal KB), never writing back to this canon.

## Coach KB vs Personal KB

Two knowledge bases, one flows into the other:

- **Coach Knowledge Base** (this) — the canon. Owner-authored, owner-gated **admin** (see [`../features/admin.md`](../features/admin.md), ADR [0006](../../decisions/0006-owner-gated-admin.md)). The mantra pool, the Life Blueprint backbone, and the daily-conduct doctrine live here. Canonical source is the developer's Brain Vault.
- **Personal Knowledge Base** — per-user, **client-side, editable**. Seeded *from* the Coach KB, but it diverges per person as they adopt, edit, and add their own mantras. It **never writes back** to the canon.

Flow: Coach KB (defaults/templates) → user adopts → Personal KB (their editable instance).

## The pool

Seeded by splitting and adapting a parent-to-child writing (preserved verbatim under Provenance) into self-directed second-person lines.

- You are gifted intellectually.
- You can unlock your supreme athleticism.
- Build skills and knowledge no one can ever take from you. That is the secret to everlasting confidence.
- You can achieve whatever you want when you discipline yourself to work for it. It does not just happen.
- You have an unending capacity to work. You are not lazy.
- You set your standard. Others fit in with you.
- Get truly comfortable being alone, and people are drawn to you.
- Everything is a skill. You can learn anything, and it gets more interesting the more you learn about it.
- Whatever you are drawn to, be excellent in it. You will be supported.
- Genius is a state accessible to you.
- In any room you are in, you have valuable contributions to make. They matter because they come through someone like you.
- Do not shrink yourself. You deserve to take up space.
- Nobody has the right to disrespect you, at any age.

## Templates

Some mantras are reusable patterns a person can fill in for themselves, rather than fixed lines:

- Be excellent in `[your chosen path]`.
- Build `[the skill or knowledge]` that no one can take from you.

## Provenance

The original writing this pool was seeded from, kept verbatim. It is parent-to-child advice; the closing "fortress" passage and both bonuses are not self-mantras, so they stay here as source rather than in the pool.

> Younger parents tend to ask my parents for advice.
>
> I've condensed some key points over the years.
>
> Run these psyops on your children:
>
> - You are gifted intellectually
> - You can unlock your supreme athleticism.
> - Work diligently on skills and education that nobody can take away from you. That is the secret to everlasting confidence.
> - You are the type of person who can achieve whatever you want when you discipline yourself to work for it – It does not just happen.
> - You have an unending capacity to work, you are not lazy.
> - You set your standard. Others are to fit in with you.
> - Never worry about making friends, once you truly get comfortable being alone, people are drawn to you.
> - Everything is a skill. You can learn anything; anything becomes more interesting the more you learn about it.
> - Whatever you're interested in, be excellent in your chosen path. You will be supported.
> - Genius is a state accessible to you.
> - Nobody has the right to disrespect you, even at your young age. In any room you find yourself in, you have valuable contributions. They have inherent valuable because the words come through someone like you.
> - Do not shrink yourself. You deserve to take up space.
> - You can come to me for anything, even if you think I'll be upset – which I might be. But with me, you can unburden your conscience with the truth. I'm with you always.
>
> I will always be the fortress that supports you until my dying days; and when I'm gone, gaze upon the spread of the heavens.
>
> Know that I support you still.
>
> **Bonus 1:** Never insult them or their identity, even as a joke. It is not 'banter' — nothing is funny about making your child the punchline.
>
> **Bonus 2:** Religious household = raise them in the structure of it, but forcing them is useless. Embody core principles in your own life and demonstrate how you thrive living with the discipline. They may stray, but eventually develop strengthened and genuine faith for themselves.

## Deferred (intent, not built)

- **Coach KB in admin** — a surface for the owner to view and edit the mantra pool, blueprint, and doctrine. Net-new feature; goes through the commitment gate.
- **The always-on cycling pool surface** — the ambient on-screen display (distinct from the beat-gated ritual `mantra` component now built). Net-new feature; goes through the commitment gate.
- **Vault pull** — a light mechanism to pull the canon from Brain Vault into this repo copy (`lib/mantras.ts` is the current hand-pulled copy). Later.
