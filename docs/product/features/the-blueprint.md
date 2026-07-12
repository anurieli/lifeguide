# The Blueprint (for Life)

**Status:** built · **Element of:** the knowledge base (a pillar-level doctrine document) · **Owns:** `blueprint`

> The person's editable conduct doctrine — how a day is lived, on purpose. One document per user, seeded from the 8-pillar Blueprint for Living, fully theirs after that. The morning's read step resolves its words from here: edit it tonight in Settings, and it is what tomorrow morning reads.

## 1. Purpose

The knowledge base holds the person ([pillars](pillars.md) as folders, [files on the human](file-system-on-the-human.md) as content — the **Core**: who you are). The Blueprint is the missing sibling at the pillar level: not who you are but **how you conduct a day** — the standards sheet. Keeping it a first-class, editable document does three things: the doctrine is *owned* (adopted, then rewritten in the person's own words), it is *live* (the daily read draws from it, so editing it changes tomorrow), and it stays *distinct from the Core* — character and conduct interlink but never merge (the line the concept demands).

## 2. User-facing behavior

Settings carries **The Blueprint** card: title, one line of what it is, and Open (or **Adopt it**, the first time). Open reveals the document in a plain editor — markdown, the 8 pillars each as practice + payoff — with Save. Beneath it: **Read it each morning** adds the morning read step (idempotent; once present it shows a quiet "Read each morning ✓"). On the Today page, the morning's "Read the Blueprint" step opens the [immersive reader](daily-ritual.md#the-immersive-reader) with this document's current words, pillar by pillar.

Adoption is never destructive: adopting when a document exists simply returns it; an edited document is never re-seeded or clobbered, whatever buttons are pressed ([tested](../../../tests/convex/rituals.test.ts)).

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Adopt | Settings card first open / reader open with no doc / adopt-read | `blueprintDoc.adopt` → `ensureBlueprint`: create from the seed if missing; idempotent, never clobbers | Manual | writes `blueprint` (once) |
| Read | Settings card Open / the morning read step | `blueprintDoc.get` (the reader renders `content` pillar-by-pillar) | Manual | reads `blueprint` |
| Edit | Settings editor, Save | `blueprintDoc.update` — the single source of truth; tomorrow's read changes with it | Manual | writes `blueprint` |
| Wire into the morning | "Read it each morning" / edit-mode "read from the Blueprint" | `rituals.adoptBlueprintRead` (see [daily-ritual.md](daily-ritual.md)) | Manual | writes `ritualItems` |

## 4. Dynamics

- **Read by the [Daily Ritual](daily-ritual.md):** `read` steps with `source: "blueprint"` resolve from `blueprint.content` at render time — no copies anywhere.
- **Seeded from the research doctrine** [`../../research/blueprint-for-living.md`](../../research/blueprint-for-living.md) (`BLUEPRINT_SEED` in `convex/blueprintDoc.ts`); `seedVersion` records which seed was adopted (future seeds never overwrite edits).
- **Beside, not inside, the Core:** deliberately its own table, not a `coreFiles` row — the Core's files are *about the person*; this is the person's *rulebook* ([ADR 0011](../../decisions/0011-typed-ritual-components.md) context notes the line). The Coach may hold a person against it (parked).

## 5. States

- **No document:** the card offers Adopt; a blueprint-sourced read step adopts on first open.
- **Seeded, unedited / edited:** indistinguishable to the system — both are simply the person's document.
- **Wired into the morning / not:** the card reflects it ("Read each morning ✓" vs the button).

## 6. Edge cases

- Repeated adopt taps, adopt after edit, adopt-read after adopt: all idempotent, nothing duplicated, nothing lost.
- Emptying the document is allowed (it is theirs); the reader treats short content with the considered-pause rule ([ADR 0013](../../decisions/0013-immersive-reader-overlay.md)).
- Deleting the read step never touches the document; deleting the document is not offered (edit it to nothing instead).

## 7. AI involvement

None at runtime. Parked: the Coach quoting the doctrine in benefit language, drift detection against it, a guided rewrite session.

## 8. Data touched

`blueprint { userId, title, content (markdown), seedVersion, createdAt, updatedAt }`, indexed `by_user`. Code: `convex/blueprintDoc.ts`, `components/settings/BlueprintCard.tsx`, resolution in `components/today/RitualSequence.tsx`.

## 9. Open questions

- Should the Blueprint appear in the knowledge-base browsing surfaces (the Center's tree) alongside pillars, or stay a Settings-reached document?
- Structured pillars (one editable block per pillar) instead of one markdown body?
- Seed-version upgrades: how to *offer* new doctrine content without touching edits (a diff view? an appendix?).
