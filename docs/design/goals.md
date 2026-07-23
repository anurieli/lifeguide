# Goals screen: interaction and layout

Companion to the feature spec [`../product/features/goals.md`](../product/features/goals.md) (behavior, data, AI) and to [`interaction-principles.md`](interaction-principles.md) (the calm, non-bombarding baseline). This file covers only the on-screen interactions and layout of the Goals page. Where behavior is described, this file links rather than restating it.

## Page layout

The page is one scroll column (`max-w-[1080px]`, centered) under the shared `PageHeader`. Below the header the body splits into two, `lg:flex-row-reverse`:

- **Main column (left, primary):** the Big Things section, then the pillar filter chips, then the dated-goal groups by pillar, then the Aspirations section. This is the page's identity: the things you carry and the things you're chasing.
- **Side panel (right, secondary):** the Today / Inbox / Waiting triage queue, narrower and more muted. Unchanged by this work.

On mobile the two stack; the queue panel drops below the gallery.

## Big Things section (ARI-141)

Sits **first in the main column, above the gallery**, so the active commitments a person is carrying are the first thing they see. Behavior (what a Big Thing is, promotion semantics, why it is a separate table) lives in the feature doc; the interaction shape is:

- **Header row:** a bold "Big Things" label with a one-line subtitle ("Pending meetings, ongoing projects, commitments in flight.") on the left, and an "Add a big thing" text button on the right. When the capture form is open the button hides.
- **Grid:** the same responsive card grid as the gallery (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4`), so Big Things read as peers of goals without being styled like them.
- **Capture form:** a dashed-border card leading the grid, with a title input (autofocus), an optional context textarea, and an optional native date input. `Enter` in the title commits; `Escape` cancels; explicit **Add** / **Cancel** buttons are also present. Title-only is a valid capture. When there are no Big Things and the form is closed, the whole grid collapses to a single dashed call-to-action card that opens the form.
- **The card (read state):** title (bold), an optional date badge (top-right, tabular), and the context below it (or an "Add context…" placeholder when empty). A footer row carries **Promote to goal** (with an up-arrow icon) and **Archive**.
  - **Click-to-edit in place:** clicking the title, the context, or the "Add context…" placeholder swaps the card into its edit state (title input, context textarea, date input, Save / Cancel). `Enter` saves the title; `Escape` or **Cancel** discards unsaved local edits and restores the card's current stored values, so an abandoned edit never partially persists. The title cannot be emptied (an empty title on save reverts to the stored title).
- **Promote to goal:** an explicit per-card action. It creates the goal, schedules its roadmap draft, retires the Big Thing, and the page then **expands the newly created goal card** so the person lands directly on its drafting roadmap. The button shows a "Promoting…" pending label and is disabled while the mutation is in flight, so a double-tap can't create two goals.
- **Archive:** removes the Big Thing from the section. See the accessibility note below for its touch behavior.

## Accessibility and touch

- The **Archive** control on a Big Thing card is visible by default, then made hover-revealed only inside `@media (hover: hover)` on pointer devices. It therefore stays **fully visible and tappable on touch**, so a phone user is never left without a way to archive. Promote is always visible.
- Every icon-only or ambiguous control carries an accessible label; native date inputs and text inputs are used directly rather than custom widgets, so keyboard and screen-reader behavior comes for free.
- Card actions are real buttons, reachable and operable by keyboard; `Enter` / `Escape` drive the capture and edit forms.

## Relationship to the gallery

Big Things are visually distinct from goal cards (no pillar dot, no status border, no open/done counts) so the two layers never blur. Promotion is the one bridge between them, and a promoted Big Thing leaves this section entirely, so nothing is ever shown in both places at once.
