# Goals (the Orbit board)

**Status:** built (v1), live in local dev
**Seed spec:** `_source-apps/goal-manager/Orbit-PRD.md` (the Orbit PRD). This doc describes what is actually built in LifeGuide; the PRD remains the fuller product vision.

## Purpose

The Goals tab reframes a flat task list as a small set of **Big Things**, the projects and goals that actually matter, each carrying a written **why** so priorities stay honest. Around them sits the daily triage loop: **Today** (due/overdue), **Inbox** (unfiled capture), and **Waiting** (blocked, with aging). Optionally the board two-way syncs with the user's Todoist.

## Where it lives

- **Desktop:** a `Goals` tab in the left rail (Target icon), between Board and Thoughts.
- **Mobile:** the fifth slot of the bottom bar (`Today · Board · ➕ · Thoughts · Goals`): it took the place of the account avatar.
- **The account avatar:** on **desktop** it stays at the foot of the left rail (unchanged). On **mobile**, since Goals took its bottom-bar slot, it moves to a fixed top-right corner button (`AppShell`, `md:hidden`). Both open Settings / Account / Sign out.

## User-facing behavior

### The board
- Card grid of Big Things (1/2/3 columns responsive). Each card: area dot (business = blue, personal = green, people = violet), name, status pill, the why (or a prompt to add one), open/done counts. Left border color encodes status (active = green, planning = gold, ongoing = blue).
- Area filter chips (All / Business / Personal / People).
- **+ New Big Thing** creates a goal inline (defaults: kind `big`, status `planning`, area `personal`).
- Clicking a card opens the **drill-in** (modal): edit status and area via chips, edit the why (saves on blur), work the open task list, add tasks inline, archive the goal.

### The queue (left panel; stacks on top on mobile)
- Three tabs with live counts: **Today** (due today or overdue, priority first), **Inbox** (unfiled, newest first), **Waiting** (aging order).
- Quick add: from Today the task is scheduled for today; from Inbox it lands unfiled.
- Each task row: complete circle, due tag (red overdue / gold today), waiting badge with who + aging, goal tag, and a `⋯` menu: file to a goal or the Inbox, mark/unmark waiting, delete.

### Waiting (Orbit Phase 1)
A task state, not a list: `waiting` + optional free-text `waitingOn` + `waitingSince`. Surfaced in the Waiting queue tab with day-count aging.

### Todoist sync (thin, per the PRD's Path 1)
- The user saves their **Todoist API token** in Settings → "Goals & Todoist" (stored in the `apiKeys` table, provider `todoist`; server-only, never returned to the client: same posture as AI keys). When no token is set, the board header shows a **"Connect Todoist"** button that jumps straight to Settings (via the `onNavigate` prop); once connected it becomes the "Sync Todoist" button.
- **Pull: "Sync Todoist"** button on the board header: fetches all projects and active tasks over the Todoist REST API and reconciles. Projects become goals (the Todoist Inbox maps to our Inbox, no card); sub-projects link `parentId`; tasks upsert by `todoistTaskId` (content/description/due/priority refresh; Todoist is authoritative for task content). Linked tasks missing from the active snapshot are marked done here.
- **Push** (write-through, scheduled from mutations; silent no-op without a token): completing/reopening a linked task closes/reopens it in Todoist; a task added in LifeGuide is created in Todoist (in the linked project or the Todoist Inbox) and linked back.
- Orbit-only metadata (why, status, area, grouping, order, waiting) never leaves LifeGuide.

## Data touched

Tables `goals` and `goalTasks` (see `convex/schema.ts`), plus the `apiKeys` provider union gained `"todoist"`. API: `convex/goals.ts` (board/tasks queries, goal + task mutations), `convex/todoist.ts` (sync action, push actions, internal plumbing).

## AI involvement

None yet. The Coach's per-view context string includes the goals view. Candidates later: distill captures into goal tasks, why-coaching, weekly review.

## Known gaps / not in v1 (from the PRD)

- Drag-and-drop (filing is via the `⋯` menu), sections, subtasks, quick-list ("shelf") tabs UI, updates/comments thread, Focus mode, People directory (Phase 2), Todoist webhooks (pull is manual "Sync now"), label mirroring.
- Sub-project nesting is stored (`parentId` via Todoist sync) but rendered flat.
- A Todoist task deleted (not completed) over there is indistinguishable from completed in the pull snapshot; we mark it done locally.

## Open questions

- Should sync run automatically (on tab open / on a schedule) instead of a button?
- Mirror Waiting to a `@waiting` Todoist label so mobile capture round-trips (PRD open decision)?
