# The Blueprint (for Living)

**Status:** built · **Element of:** the knowledge base (a pillar-level doctrine document) · **Owns:** `blueprint`

> The person's editable conduct doctrine — how a day is lived, on purpose. One document per user, seeded from the 8-pillar Blueprint for Living, fully theirs after that. **Structured, not free text** (2026-07-20): a header block plus 8 pillars, each holding practice+why items — one item is one editable unit. A ritual's read step — morning, night, or both — resolves its words from a derived markdown rendering of this structure: edit a line tonight, and it is what every wired-in read shows next.

## 1. Purpose

The knowledge base holds the person ([pillars](pillars.md) as folders, [files on the human](file-system-on-the-human.md) as content — the **Core**: who you are). The Blueprint is the missing sibling at the pillar level: not who you are but **how you conduct a day** — the standards sheet. Keeping it a first-class, editable document does three things: the doctrine is *owned* (adopted, then rewritten in the person's own words), it is *live* (the daily read draws from it, so editing it changes tomorrow), and it stays *distinct from the Core* — character and conduct interlink but never merge (the line the concept demands).

Until 2026-07-20 the document was one free-text markdown blob edited in a `<textarea>`. It is now **structured data** — a header plus 8 pillars of practice/why items — because a doctrine made of distinct, quotable lines (a practice, and the reason it matters) reads and edits better as distinct units than as an undifferentiated wall of markdown, and because a Coach agent editing "the why on this one line" needs to target that line directly, not diff a paragraph.

## 2. User-facing behavior

Settings carries **The Blueprint** card: title, one line of what it is, and Open (or **Adopt it**, the first time). Open launches the **immersive Blueprint view** (`components/settings/BlueprintImmersive.tsx`) — the same full-screen overlay family as the [morning read's immersive reader](daily-ritual.md#the-immersive-reader) — rendering the header (kicker, title, intro, the Source/Compiled/Structure meta line, "How to read this") and then every pillar: a big number, the pillar name, its subtitle, and each item as its own separated card — the **practice** line, and directly beneath it, visually subordinate, its **"why it pays off"** reason. Lines never run together into a paragraph.

**There is no edit mode.** The document reads as a document at rest — no toggle, no chrome, nothing to "enter". Editing affordances are latent: they appear only under the cursor and vanish when it leaves, so reading is the default state and is never dressed up as a form. Two gestures:

- **Add** — hovering the dead space beneath a section's last rule reveals a **ghost slot** (a dashed outline and a `+`). Clicking it opens an inline draft with two fields, **the practice** and **why it pays off**, resolved in the same breath by **X** (cancel) or **✓** (save). ⌘/Ctrl+Enter saves, Escape cancels. Save stays disabled until *both* fields are filled. The identical gesture at the foot of the document adds a whole **section**.
- **Edit** — clicking an existing rule opens it in place, the **practice** and the **reason** as two independent fields. Each saves on blur or ⌘/Ctrl+Enter; Escape reverts; emptying a field restores its previous value rather than saving a blank. The remove X stops propagation so it never opens the editor it is dismissing.
- **Remove** — hovering a rule reveals a minimal **X** on its right; a section's X sits beside its name. Either removes immediately, with no confirm — Convex's reactivity makes the UI follow at once.

**The surface is deliberately spare.** The header is a kicker, the title, and one line saying what this is — the provenance (source, compiled date, pillar count) and the "how to read this" preamble were cut, because they describe the document rather than state the doctrine and pushed the actual rules below the fold. A rule carries **no "Why it pays off" label and no divider**: the reason sits directly beneath its practice as smaller, quieter text, and the type scale alone distinguishes them. Padding, the gap between rules, and the gap between sections are all tight; chrome competes with the words.

Every rule carries its why: a practice with no reason cannot be saved. This is enforced in `addItem` server-side, not merely in the UI, because that mutation is also the contract an **agent** appends through — a human hovering a ghost slot and an agent calling `addItem` travel the same path and obey the same rule (see §7).

There is no raw markdown/free-text editor anywhere in this surface — every edit targets one named unit (one pillar, or one rule).

Beneath the card: **Read it each morning** adds the morning read step (idempotent; once present it shows a quiet "Read each morning ✓"). On the Today page, edit mode on *either* ritual offers **read from the Blueprint** independently — morning and night can each carry their own "Read the Blueprint" step, adopted and checked off on their own. **A blueprint read opens the same structured `BlueprintImmersive` component the Settings entry point opens** — one Blueprint surface, not two that drift apart. Only a legacy document that has not yet been upgraded to the structured shape (no `pillars`) falls back to the flat markdown [immersive reader](daily-ritual.md#the-immersive-reader).

Adoption is never destructive: adopting when a document exists simply returns it (upgrading it to the structured shape in place if it predates 2026-07-20 — see §4); an edited document is never re-seeded or clobbered, whatever buttons are pressed ([tested](../../../tests/convex/blueprintDoc.test.ts), [tested](../../../tests/convex/rituals.test.ts)).

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Adopt | Settings card first open / reader open with no doc / adopt-read | `blueprintDoc.adopt` → `ensureBlueprint`: create from the structured seed if missing, lazily upgrade a pre-2026-07-20 doc if needed; idempotent, never clobbers a structured doc | Manual | writes `blueprint` (once, or once more on upgrade) |
| Read (immersive Blueprint view) | Settings card Open | `blueprintDoc.get` (header + pillars rendered structurally, unit by unit) | Manual | reads `blueprint` |
| Read (morning/night ritual step) | The "Read" button on a `read` step | `blueprintDoc.get().content` (derived markdown; ImmersiveReader/DailyRead render it, unchanged since before this structured rework) | Manual | reads `blueprint` |
| Edit the header | Immersive view, edit mode | `blueprintDoc.updateHeader` — patches any header field, regenerates `content` | Manual (Coach-shaped) | writes `blueprint` |
| Add / remove a pillar | Immersive view, edit mode | `blueprintDoc.addPillar` / `removePillar` — whole-pillar unit, regenerates `content` | Manual (Coach-shaped) | writes `blueprint` |
| Edit a pillar's name/subtitle | Immersive view, edit mode | `blueprintDoc.updatePillar` | Manual (Coach-shaped) | writes `blueprint` |
| Add / remove an item | Immersive view, edit mode | `blueprintDoc.addItem` / `removeItem` — whole practice+why unit, regenerates `content` | Manual (Coach-shaped) | writes `blueprint` |
| Edit an item's practice/why | Immersive view, edit mode | `blueprintDoc.updateItem` | Manual (Coach-shaped) | writes `blueprint` |
| Legacy raw-content edit | (escape hatch, no UI) | `blueprintDoc.update({ title?, content? })` — overrides `content` directly, does NOT touch `header`/`pillars` | Manual | writes `blueprint` |
| Wire into a ritual | "Read it each morning" (morning) / edit-mode "read from the Blueprint" (morning or night) | `rituals.adoptBlueprintRead({ ritual })` (see [daily-ritual.md](daily-ritual.md)) | Manual | writes `ritualItems` |

## 4. Dynamics

- **The read path is preserved, not rebuilt:** `read` steps with `source: "blueprint"` still resolve from `blueprint.content` at render time (`RitualSequence.tsx`'s `readContent()`) — this is a plain markdown string, exactly as before. What changed is *where that string comes from*: `content` is now **derived** — `convex/blueprintDoc.ts`'s `renderMarkdown(header, pillars)` regenerates it on every structured mutation (header edit, pillar/item add/remove/update), in the same shape the tiny `DailyRead` renderer already parses (`## N · Name` headings, plain paragraphs, `*italic*` why-lines). This was the deliberate choice over teaching the read path to render structured pillars directly: it keeps `ImmersiveReader.tsx`/`DailyRead.tsx` untouched and the risk surface small.
- **Structured, unit-addressable data:** every pillar and item carries a stable string `id` (see §8), so a mutation names exactly the unit it means to change — the granularity a **Coach agent** would need to edit the Blueprint on the person's behalf later (see §7; not wired yet).
- **Seeded from the structured doctrine** — "The Blueprint for Living," 8 pillars assembled from 7 saved reels (`SEED_HEADER`/`SEED_PILLARS` in `convex/blueprintDoc.ts`); `seedVersion` (now 2) records which seed a document is on. The lazy upgrade path (`upgradeIfNeeded`, run inside `ensureBlueprint`): a document that already has `pillars` (even an empty array — a deliberate empty state) is never touched again; a document with no `pillars` (the pre-2026-07-20 shape) whose `content` matches the old free-text seed *exactly* is replaced outright with the new structured seed; one whose `content` differs (a genuine edit) is preserved — wrapped into a single `"Your Blueprint"` pillar holding the edited text as one item, `content` left byte-for-byte as written.
- **Beside, not inside, the Core:** deliberately its own table, not a `coreFiles` row — the Core's files are *about the person*; this is the person's *rulebook* ([ADR 0011](../../decisions/0011-typed-ritual-components.md) context notes the line). The Coach may hold a person against it (parked); the structured mutations exist for exactly that future.
- **Shares the immersive reader chrome:** `BlueprintImmersive.tsx` and `ImmersiveReader.tsx` both wrap the shared `ImmersiveShell` (`components/today/ImmersiveReader.tsx`) — the full-screen overlay, the always-visible top-X early exit, and (since [ADR 0013](../../decisions/0013-immersive-reader-overlay.md)'s 2026-07-20 revision) the pinned red "Done" release button that is now the ONLY way either view closes once its content is marked read. Reaching the bottom no longer auto-closes anything.

## 5. States

- **No document:** the card offers Adopt; a blueprint-sourced read step adopts on first open.
- **Structured, seeded / edited:** indistinguishable to the system — both are simply the person's document, rendered and edited the same way.
- **Pre-2026-07-20 (legacy free text), not yet touched since the migration:** still schema-valid (`header`/`pillars` are optional); upgraded in place the next time `ensureBlueprint` runs (any Open, any ritual adopt-read tap).
- **Wired into a ritual / not, per ritual:** the Settings card reflects the morning specifically ("Read each morning ✓" vs the button); each ritual's edit mode independently reflects whether that ritual has a blueprint-sourced read yet.
- **Immersive view: reading vs. editing.** Read mode renders every unit; edit mode (the top toggle) turns each field into an input and reveals add/remove controls for pillars and items.

## 6. Edge cases

- Repeated adopt taps, adopt after edit, adopt-read after adopt: all idempotent, nothing duplicated, nothing lost.
- Emptying a pillar of all items, or the whole document of all pillars, is allowed (it is theirs) — an emptied structure is "already structured" and is never re-seeded.
- `addItem`/`updateItem`/`removeItem` against an unknown `pillarId` throws (`"Pillar not found"` on add; a no-op filter on remove/update against a pillar that no longer exists) — never silently creates or edits the wrong pillar.
- Deleting a ritual's read step never touches the document; deleting the document is not offered (edit it down to nothing instead).
- The reader treats short content with the considered-pause rule, but even then requires the explicit red button to close ([ADR 0013](../../decisions/0013-immersive-reader-overlay.md)).

## 7. AI involvement

None at runtime yet. **Designed for, not wired:** the structured mutations (`updateHeader`, `addPillar`, `removePillar`, `updatePillar`, `addItem`, `removeItem`, `updateItem`) are explicitly shaped as "the Coach-editable surface" (see the header comment block in `convex/blueprintDoc.ts`) — each targets exactly one unit by id, which is the granularity a Coach agent reasoning in natural language ("add a pillar for X," "the why on this line should say Y") needs. No Coach code calls them today. Also parked: the Coach quoting the doctrine in benefit language, drift detection against it, a guided rewrite session.

## 8. Data touched

`blueprint { userId, title, header?: { kicker?, title, intro?, source?, compiled?, structure?, howToRead? }, pillars?: [{ id, name, subtitle?, items: [{ id, practice, why }] }], content (markdown, DERIVED — never hand-edited except via the legacy `update` escape hatch), seedVersion, createdAt, updatedAt }`, indexed `by_user`. See [`../../architecture/data-model.md`](../../architecture/data-model.md) for the full shape and migration policy. Code: `convex/blueprintDoc.ts` (seed, structured mutations, `renderMarkdown`, lazy upgrade), `components/settings/BlueprintCard.tsx` (entry point), `components/settings/BlueprintImmersive.tsx` (the full-screen structured view/editor), `components/today/ImmersiveReader.tsx` (shared `ImmersiveShell` + the plain-markdown ritual reader), resolution in `components/today/RitualSequence.tsx`.

## 9. Open questions

- Should the Blueprint appear in the knowledge-base browsing surfaces (the Center's tree) alongside pillars, or stay a Settings-reached document?
- Reordering pillars/items (drag or up/down) — not built in this pass; today a new pillar/item always lands at the end.
- Wiring the Coach to the mutations in §7 — the surface is shaped for it; nothing calls it yet.
- Seed-version upgrades beyond v1→v2: how to *offer* future doctrine revisions to a person who has already structurally edited their own Blueprint (today's policy only auto-replaces an *untouched* legacy seed).
