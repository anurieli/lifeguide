"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { convexErrorMessage } from "@/lib/convexError";
import { PageHeader } from "@/components/shell/PageHeader";
import {
  Plus,
  RefreshCw,
  Hourglass,
  Inbox as InboxIcon,
  Sun,
  Trash2,
  FolderInput,
  Archive,
  X,
  Link2,
  MessageCircle,
} from "lucide-react";

// The Goals gallery: the things a person is chasing in life. No deadline = an
// aspiration (someday, dimmer); setting one graduates it into a Goal — the
// gallery groups dated goals by Pillar and keeps aspirations in their own
// section. Each card expands in place (not a modal) into its AI-drafted
// roadmap. The Today / Inbox / Waiting triage queue + Todoist sync are kept
// functionally as-is, just demoted to a secondary side panel.
// Spec: docs/product/features/goals.md, docs/decisions/0029.

type QueueView = "today" | "inbox" | "waiting";
type BoardGoal = Doc<"goals"> & { openCount: number; doneCount: number };

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  planning: "Planning",
  ongoing: "Ongoing",
};
const STATUS_BORDER: Record<string, string> = {
  active: "border-l-green",
  planning: "border-l-gold",
  ongoing: "border-l-blue",
};
const LADDER_LABEL: Record<string, string> = {
  five_year: "5-year vision",
  one_year: "1-year goal",
  one_month: "This month",
};
// Pillars are user-defined and free-form (no color field), so a card's accent
// is a deterministic hash of its pillarId into this fixed palette — no schema
// change. A real `pillars.color` field is a reasonable follow-on, not built here.
const PILLAR_PALETTE = ["bg-blue", "bg-green", "bg-violet", "bg-gold", "bg-teal"];

function pillarColorClass(pillarId?: string | null): string {
  if (!pillarId) return "bg-ink-mute";
  let hash = 0;
  for (let i = 0; i < pillarId.length; i++) hash = (hash * 31 + pillarId.charCodeAt(i)) | 0;
  return PILLAR_PALETTE[Math.abs(hash) % PILLAR_PALETTE.length];
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function daysAgo(ts: number): string {
  const days = Math.max(0, Math.floor((Date.now() - ts) / 86400000));
  return days === 0 ? "today" : `${days}d`;
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[12px] px-2.5 py-1 rounded-full border transition ${
        active
          ? "border-ink bg-ink text-white"
          : "border-line text-ink-mute hover:text-ink hover:border-ink-mute"
      }`}
    >
      {label}
    </button>
  );
}

// One task line: complete, due/waiting badges, and a small ⋯ menu to file,
// mark waiting, or delete. Shared by the queue and the goal drill-in.
function TaskRow({
  task,
  goals,
  today,
  showGoalTag,
}: {
  task: Doc<"goalTasks">;
  goals: BoardGoal[];
  today: string;
  showGoalTag: boolean;
}) {
  const setChecked = useMutation(api.goals.setChecked);
  const moveTask = useMutation(api.goals.moveTask);
  const setWaiting = useMutation(api.goals.setWaiting);
  const deleteTask = useMutation(api.goals.deleteTask);
  const [menuOpen, setMenuOpen] = useState(false);

  const overdue = task.dueDate && task.dueDate < today;
  const dueToday = task.dueDate === today;
  const goalName = task.goalId ? goals.find((g) => g._id === task.goalId)?.name : null;

  return (
    <div className="group relative flex items-start gap-2.5 py-2 border-b border-line-2 last:border-b-0">
      <button
        onClick={() => void setChecked({ id: task._id, checked: true })}
        aria-label="Complete task"
        className="mt-0.5 w-[18px] h-[18px] rounded-full border-[1.5px] border-ink-mute hover:border-green hover:bg-green/10 transition flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] text-ink leading-snug">{task.content}</div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {task.dueDate && (
            <span
              className={`text-[11px] ${
                overdue ? "text-red-500" : dueToday ? "text-gold" : "text-ink-mute"
              }`}
            >
              {overdue ? `overdue · ${task.dueDate}` : dueToday ? "today" : task.dueDate}
            </span>
          )}
          {task.waiting && (
            <span className="text-[11px] text-violet flex items-center gap-1">
              <Hourglass className="w-3 h-3" />
              waiting{task.waitingOn ? ` on ${task.waitingOn}` : ""} ·{" "}
              {daysAgo(task.waitingSince ?? task.createdAt)}
            </span>
          )}
          {showGoalTag && goalName && (
            <span className="text-[11px] text-ink-mute border border-line rounded px-1.5 py-px">
              {goalName}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="text-ink-mute opacity-0 group-hover:opacity-100 transition px-1"
        aria-label="Task actions"
      >
        ⋯
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[64]" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-8 w-52 bg-card border border-line rounded-xl shadow-xl py-1.5 z-[65]">
            <div className="px-3 pt-1 pb-1 text-[11px] tracking-[0.14em] uppercase text-ink-mute flex items-center gap-1.5">
              <FolderInput className="w-3 h-3" /> File to
            </div>
            <div className="max-h-44 overflow-auto">
              {task.goalId && (
                <button
                  onClick={() => {
                    void moveTask({ id: task._id });
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[13px] text-ink-soft hover:bg-paper-2"
                >
                  Inbox
                </button>
              )}
              {goals
                .filter((g) => g._id !== task.goalId)
                .map((g) => (
                  <button
                    key={g._id}
                    onClick={() => {
                      void moveTask({ id: task._id, goalId: g._id });
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-[13px] text-ink-soft hover:bg-paper-2 truncate"
                  >
                    {g.name}
                  </button>
                ))}
            </div>
            <div className="h-px bg-line my-1" />
            <button
              onClick={() => {
                void setWaiting({ id: task._id, waiting: !task.waiting });
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-[13px] text-ink-soft hover:bg-paper-2 flex items-center gap-2"
            >
              <Hourglass className="w-3.5 h-3.5" />
              {task.waiting ? "Not waiting anymore" : "Mark as waiting"}
            </button>
            <button
              onClick={() => {
                void deleteTask({ id: task._id });
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-[13px] text-red-500 hover:bg-paper-2 flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// The triage queue: Today / Inbox / Waiting with live counts and quick add.
// Functionally unchanged — only its position/weight in the page moved (see
// the `lg:flex-row-reverse` layout below) to read as a secondary panel.
function QueuePanel({
  board,
  goals,
  today,
}: {
  board: { todayCount: number; inboxCount: number; waitingCount: number };
  goals: BoardGoal[];
  today: string;
}) {
  const [tab, setTab] = useState<QueueView>("today");
  const [draft, setDraft] = useState("");
  const addTask = useMutation(api.goals.addTask);
  const tasks = useQuery(api.goals.tasks, { view: tab, today });

  const tabs: { key: QueueView; label: string; Icon: typeof Sun; count: number }[] = [
    { key: "today", label: "Today", Icon: Sun, count: board.todayCount },
    { key: "inbox", label: "Inbox", Icon: InboxIcon, count: board.inboxCount },
    { key: "waiting", label: "Waiting", Icon: Hourglass, count: board.waitingCount },
  ];

  const quickAdd = async () => {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    // Adding from Today schedules for today; otherwise it lands in the Inbox.
    await addTask({ content, dueDate: tab === "today" ? today : undefined });
  };

  return (
    <div className="bg-card/60 border border-line-2 rounded-2xl p-4 lg:w-[280px] flex-shrink-0 self-start w-full">
      <div className="flex gap-1 mb-3">
        {tabs.map(({ key, label, Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-[12.5px] rounded-lg py-2 transition ${
              tab === key ? "bg-accent/10 text-accent" : "text-ink-mute hover:bg-paper-2"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            <span className="tabular-nums">{count}</span>
          </button>
        ))}
      </div>
      {tab !== "waiting" && (
        <div className="flex gap-2 mb-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void quickAdd()}
            placeholder={tab === "today" ? "Add for today…" : "Capture to Inbox…"}
            className="flex-1 bg-paper border border-line rounded-lg px-3 py-2 text-[13px] outline-none text-ink placeholder:text-ink-mute"
          />
          <button
            onClick={() => void quickAdd()}
            aria-label="Add task"
            className="bg-ink text-white rounded-lg px-3 text-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="max-h-[46vh] lg:max-h-[62vh] overflow-auto">
        {(tasks ?? []).map((t) => (
          <TaskRow key={t._id} task={t} goals={goals} today={today} showGoalTag />
        ))}
        {tasks && tasks.length === 0 && (
          <div className="text-[12.5px] text-ink-mute py-6 text-center">
            {tab === "today" && "Nothing due today. Pull something in."}
            {tab === "inbox" && "Inbox zero. Nice."}
            {tab === "waiting" && "Not waiting on anything."}
          </div>
        )}
      </div>
    </div>
  );
}

// A goal/aspiration card: pillar dot, name, deadline badge or "Someday", the
// why, open count. Aspirations render dimmer (no status border) since they
// haven't yet been committed to a date.
function GoalCard({
  goal,
  pillars,
  onOpen,
}: {
  goal: BoardGoal;
  pillars: Doc<"pillars">[];
  onOpen: () => void;
}) {
  const pillarName = goal.pillarId ? pillars.find((p) => p._id === goal.pillarId)?.name : null;
  const isAspiration = !goal.deadline;

  return (
    <button
      onClick={onOpen}
      className={`text-left bg-card border rounded-2xl p-4 transition flex flex-col gap-2 min-h-[118px] ${
        isAspiration
          ? "border-line opacity-70 hover:opacity-100"
          : `border-line border-l-4 ${STATUS_BORDER[goal.status]} hover:shadow-md`
      }`}
    >
      <div className="flex items-center gap-2">
        <i className={`w-2 h-2 rounded-full flex-shrink-0 ${pillarColorClass(goal.pillarId)}`} />
        <span className="font-semibold text-[15px] text-ink truncate flex-1">{goal.name}</span>
        {isAspiration ? (
          <span className="text-[10.5px] uppercase tracking-wide text-ink-mute border border-line rounded px-1.5 py-0.5">
            Someday
          </span>
        ) : (
          <span className="text-[10.5px] text-ink-mute border border-line rounded px-1.5 py-0.5 tabular-nums">
            due {goal.deadline}
          </span>
        )}
      </div>
      {pillarName && <div className="text-[11px] text-ink-mute">{pillarName}</div>}
      <div className="text-[12.5px] text-ink-soft leading-snug line-clamp-2 flex-1">
        {goal.why || <span className="text-ink-mute italic">Why does this matter? Add it.</span>}
      </div>
      <div className="text-[11.5px] text-ink-mute">
        {goal.openCount} open{goal.doneCount ? ` · ${goal.doneCount} done` : ""}
      </div>
    </button>
  );
}

// The AI-drafted "what this actually takes" summary, with pending/error/done
// states so the card never hangs — and a Regenerate affordance once it lands.
function RoadmapDraft({ goal }: { goal: BoardGoal }) {
  const regenerate = useMutation(api.goals.regenerateRoadmap);
  const draft = goal.roadmapDraft;

  if (!draft || draft.status === "pending") {
    return (
      <div className="text-[12.5px] text-ink-mute italic mb-3">
        Coach is scoping what this takes…
      </div>
    );
  }
  if (draft.status === "error") {
    return (
      <div className="text-[12.5px] text-red-500 mb-3 flex items-center gap-2 flex-wrap">
        {draft.error ?? "Couldn't draft a roadmap."}
        <button
          onClick={() => void regenerate({ id: goal._id })}
          className="underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }
  return (
    <div className="mb-3">
      {draft.summary && (
        <div className="text-[13px] text-ink-soft leading-relaxed mb-1.5">{draft.summary}</div>
      )}
      <button
        onClick={() => void regenerate({ id: goal._id })}
        className="text-[11.5px] text-ink-mute hover:text-ink underline hover:no-underline"
      >
        Regenerate
      </button>
    </div>
  );
}

type RoadmapStep = Doc<"roadmapSteps"> & { blocked: boolean };

// One roadmap step: a status-cycling control, the title, and a "Blocked by"
// chip naming its unfinished blockers. `blocked` is server-computed, never
// stored, so it can't drift from the steps it depends on.
function RoadmapStepRow({ step, steps }: { step: RoadmapStep; steps: RoadmapStep[] }) {
  const updateStatus = useMutation(api.roadmapSteps.updateStatus);
  const cycle = () => {
    const next = step.status === "todo" ? "doing" : step.status === "doing" ? "done" : "todo";
    void updateStatus({ id: step._id, status: next });
  };
  const blockerTitles = step.blocked
    ? step.blockedBy
        .map((id) => steps.find((s) => s._id === id))
        .filter((s): s is RoadmapStep => !!s && s.status !== "done")
        .map((s) => s.title)
    : [];

  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-line-2 last:border-b-0">
      <button
        onClick={cycle}
        aria-label={`Step is ${step.status}, tap to advance`}
        className={`mt-0.5 w-[18px] h-[18px] rounded-full border-[1.5px] flex-shrink-0 transition ${
          step.status === "done"
            ? "bg-green border-green"
            : step.status === "doing"
              ? "border-gold bg-gold/20"
              : "border-ink-mute hover:border-gold"
        }`}
      />
      <div className="flex-1 min-w-0">
        <div
          className={`text-[13.5px] leading-snug ${
            step.status === "done" ? "text-ink-mute line-through" : "text-ink"
          }`}
        >
          {step.title}
          {step.isNextMove && step.status !== "done" && (
            <span className="ml-2 text-[10px] uppercase tracking-wide text-gold border border-gold/40 rounded px-1.5 py-0.5 align-middle whitespace-nowrap">
              Next move
            </span>
          )}
        </div>
        {blockerTitles.length > 0 && (
          <div className="text-[11px] text-ink-mute mt-0.5">
            Blocked by: {blockerTitles.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

function RoadmapSection({ goal }: { goal: BoardGoal }) {
  const steps = useQuery(api.roadmapSteps.list, { goalId: goal._id }) ?? [];
  const addStep = useMutation(api.roadmapSteps.add);
  const [draft, setDraft] = useState("");

  const add = async () => {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    await addStep({ goalId: goal._id, title });
  };

  return (
    <div className="mb-5">
      <div className="text-[11px] tracking-[0.14em] uppercase text-ink-mute mb-1.5">Roadmap</div>
      <RoadmapDraft goal={goal} />
      <div>
        {steps.map((s) => (
          <RoadmapStepRow key={s._id} step={s} steps={steps} />
        ))}
        {steps.length === 0 && goal.roadmapDraft?.status !== "pending" && (
          <div className="text-[12.5px] text-ink-mute py-2">No steps yet.</div>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void add()}
          placeholder="Add a step…"
          className="flex-1 bg-paper border border-line rounded-lg px-3 py-2 text-[13px] outline-none text-ink placeholder:text-ink-mute"
        />
        <button
          onClick={() => void add()}
          aria-label="Add step"
          className="bg-ink text-white rounded-lg px-3 text-sm"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// The expanded card: accordion-in-grid (a `col-span-full` wrapper reflows the
// rest of the grid automatically), replacing the old modal drill-in. Edit
// why/status/pillar/deadline/laddersTo, work the roadmap, work the goal's
// own open tasks, talk to the Coach, or archive.
function GoalExpanded({
  goal,
  goals,
  pillars,
  today,
  onClose,
  onTalkToCoach,
}: {
  goal: BoardGoal;
  goals: BoardGoal[];
  pillars: Doc<"pillars">[];
  today: string;
  onClose: () => void;
  onTalkToCoach?: (message: string) => void;
}) {
  const tasks = useQuery(api.goals.tasks, { view: "goal", today, goalId: goal._id });
  const updateGoal = useMutation(api.goals.updateGoal);
  const archiveGoal = useMutation(api.goals.archiveGoal);
  const addTask = useMutation(api.goals.addTask);
  const [why, setWhy] = useState(goal.why ?? "");
  const [draftTask, setDraftTask] = useState("");

  const addGoalTask = async () => {
    const content = draftTask.trim();
    if (!content) return;
    setDraftTask("");
    await addTask({ content, goalId: goal._id });
  };

  return (
    <div className="col-span-full bg-card border border-line rounded-[18px] p-5 md:p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <i className={`w-2.5 h-2.5 rounded-full ${pillarColorClass(goal.pillarId)}`} />
            <h2 className="font-semibold text-[19px] text-ink">{goal.name}</h2>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Collapse"
          className="w-8 h-8 rounded-full hover:bg-paper-2 text-ink-mute flex items-center justify-center"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap items-center">
        {(["active", "planning", "ongoing"] as const).map((s) => (
          <Chip
            key={s}
            label={STATUS_LABEL[s]}
            active={goal.status === s}
            onClick={() => void updateGoal({ id: goal._id, status: s })}
          />
        ))}
      </div>

      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <Chip
          label="No pillar"
          active={!goal.pillarId}
          onClick={() => void updateGoal({ id: goal._id, pillarId: null })}
        />
        {pillars.map((p) => (
          <Chip
            key={p._id}
            label={p.name}
            active={goal.pillarId === p._id}
            onClick={() => void updateGoal({ id: goal._id, pillarId: p._id })}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <label className="text-[12.5px] text-ink-mute flex items-center gap-2">
          Deadline
          <input
            type="date"
            value={goal.deadline ?? ""}
            onChange={(e) => void updateGoal({ id: goal._id, deadline: e.target.value || null })}
            className="bg-paper border border-line rounded-lg px-2.5 py-1.5 text-[13px] text-ink outline-none"
          />
        </label>
        {!goal.deadline && (
          <span className="text-[11.5px] text-ink-mute italic">
            No deadline yet — it&apos;s an aspiration until you set one.
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <span className="text-[11px] uppercase tracking-wide text-ink-mute">Ladders to</span>
        {(["none", "one_month", "one_year", "five_year"] as const).map((l) => (
          <Chip
            key={l}
            label={l === "none" ? "None" : LADDER_LABEL[l]}
            active={l === "none" ? !goal.laddersTo : goal.laddersTo === l}
            onClick={() =>
              void updateGoal({ id: goal._id, laddersTo: l === "none" ? null : l })
            }
          />
        ))}
      </div>

      <textarea
        value={why}
        onChange={(e) => setWhy(e.target.value)}
        onBlur={() => void updateGoal({ id: goal._id, why })}
        placeholder="Why does this matter? Keeping the reason written keeps the priority honest."
        rows={2}
        className="w-full bg-paper border border-line rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none text-ink placeholder:text-ink-mute resize-none mb-5"
      />

      <RoadmapSection goal={goal} />

      <div className="text-[11px] tracking-[0.14em] uppercase text-ink-mute mb-1.5">
        Open tasks
      </div>
      <div className="mb-3">
        {(tasks ?? []).map((t) => (
          <TaskRow key={t._id} task={t} goals={goals} today={today} showGoalTag={false} />
        ))}
        {tasks && tasks.length === 0 && (
          <div className="text-[12.5px] text-ink-mute py-4">No open tasks.</div>
        )}
      </div>
      <div className="flex gap-2 mb-6">
        <input
          value={draftTask}
          onChange={(e) => setDraftTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void addGoalTask()}
          placeholder={`Add a task to ${goal.name}…`}
          className="flex-1 bg-paper border border-line rounded-lg px-3 py-2 text-[13px] outline-none text-ink placeholder:text-ink-mute"
        />
        <button
          onClick={() => void addGoalTask()}
          aria-label="Add task"
          className="bg-ink text-white rounded-lg px-3.5 text-sm"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {onTalkToCoach && (
          <button
            onClick={() => onTalkToCoach(`Let's talk about my goal "${goal.name}".`)}
            className="text-[12.5px] text-ink-mute hover:text-gold transition flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Talk to the Coach about this
          </button>
        )}
        <button
          onClick={() => {
            void archiveGoal({ id: goal._id });
            onClose();
          }}
          className="text-[12.5px] text-ink-mute hover:text-red-500 transition flex items-center gap-1.5"
        >
          <Archive className="w-3.5 h-3.5" /> Archive this goal
        </button>
      </div>
    </div>
  );
}

export function Goals({
  onNavigate,
  onTalkToCoach,
}: {
  onNavigate?: (v: "settings") => void;
  onTalkToCoach?: (message: string) => void;
}) {
  const today = useMemo(localToday, []);
  const board = useQuery(api.goals.board, { today });
  const pillars = useQuery(api.pillars.list, {}) ?? [];
  const keyStatus = useQuery(api.aiKeys.status, {});
  const createGoal = useMutation(api.goals.createGoal);
  const syncTodoist = useAction(api.todoist.sync);

  const [pillarFilter, setPillarFilter] = useState<string | "unsorted" | null>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<Id<"goals"> | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const hasTodoist = (keyStatus ?? []).some((k) => k.provider === "todoist");
  const goals = board?.goals ?? [];

  const matchesFilter = (g: BoardGoal) => {
    if (!pillarFilter) return true;
    if (pillarFilter === "unsorted") return !g.pillarId;
    return g.pillarId === pillarFilter;
  };
  const shown = goals.filter(matchesFilter);
  const aspirations = shown.filter((g) => !g.deadline);
  const dated = shown.filter((g) => g.deadline);

  const pillarGroups: { key: string; label: string; goals: BoardGoal[] }[] = [];
  for (const p of pillars) {
    const gs = dated.filter((g) => g.pillarId === p._id);
    if (gs.length) pillarGroups.push({ key: p._id, label: p.name, goals: gs });
  }
  const unsortedDated = dated.filter((g) => !g.pillarId);
  if (unsortedDated.length) {
    pillarGroups.push({ key: "unsorted", label: "Unsorted", goals: unsortedDated });
  }

  const runSync = async () => {
    setSyncing(true);
    setSyncNote(null);
    try {
      const r = await syncTodoist();
      setSyncNote(`Synced ${r.projects} projects, ${r.tasks} tasks`);
    } catch (e) {
      setSyncNote(convexErrorMessage(e, "Sync failed — check your token in Settings"));
    } finally {
      setSyncing(false);
    }
  };

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    setNewOpen(false);
    // Lands as an aspiration (no pillar/deadline yet) — the AI roadmap drafts
    // in the background; refine pillar/deadline/why from the expanded card.
    await createGoal({ name });
  };

  const renderGrid = (list: BoardGoal[], trailing?: React.ReactNode) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {list.map((g) =>
        expandedGoalId === g._id ? (
          <GoalExpanded
            key={g._id}
            goal={g}
            goals={goals}
            pillars={pillars}
            today={today}
            onClose={() => setExpandedGoalId(null)}
            onTalkToCoach={onTalkToCoach}
          />
        ) : (
          <GoalCard
            key={g._id}
            goal={g}
            pillars={pillars}
            onOpen={() => setExpandedGoalId(g._id)}
          />
        ),
      )}
      {trailing}
    </div>
  );

  return (
    <div className="h-full overflow-auto bg-paper">
      <div className="max-w-[1080px] mx-auto px-5 pt-8 pb-24 md:px-10 md:pt-11">
        <PageHeader
          align="items-end"
          className="mb-6 flex-wrap"
          actions={
            <>
              {syncNote && <span className="text-[12px] text-ink-mute">{syncNote}</span>}
              {hasTodoist ? (
                <button
                  onClick={() => void runSync()}
                  disabled={syncing}
                  className="border border-line rounded-lg px-3.5 py-2 text-[13px] text-ink-soft hover:bg-paper-2 transition flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing…" : "Sync Todoist"}
                </button>
              ) : (
                <button
                  onClick={() => onNavigate?.("settings")}
                  className="border border-line rounded-lg px-3.5 py-2 text-[13px] text-ink-soft hover:bg-paper-2 transition flex items-center gap-2"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Connect Todoist
                </button>
              )}
            </>
          }
        >
          <div className="text-[11px] tracking-[0.18em] uppercase text-ink-mute mb-1">
            The things you&apos;re chasing
          </div>
          <h1 className="text-[30px] font-semibold text-ink leading-none">Goals</h1>
        </PageHeader>

        <div className="flex flex-col lg:flex-row-reverse gap-5 items-start">
          {board && <QueuePanel board={board} goals={goals} today={today} />}

          <div className="flex-1 w-full min-w-0">
            <div className="flex gap-1.5 mb-5 flex-wrap">
              <Chip label="All" active={!pillarFilter} onClick={() => setPillarFilter(null)} />
              {pillars.map((p) => (
                <Chip
                  key={p._id}
                  label={p.name}
                  active={pillarFilter === p._id}
                  onClick={() => setPillarFilter(pillarFilter === p._id ? null : p._id)}
                />
              ))}
              <Chip
                label="Unsorted"
                active={pillarFilter === "unsorted"}
                onClick={() => setPillarFilter(pillarFilter === "unsorted" ? null : "unsorted")}
              />
            </div>

            {pillarGroups.map((group) => (
              <div key={group.key} className="mb-6">
                <div className="text-[12px] font-semibold text-ink-soft mb-2">{group.label}</div>
                {renderGrid(group.goals)}
              </div>
            ))}

            <div className="mb-6">
              <div className="text-[12px] font-semibold text-ink-mute mb-2">
                Aspirations — someday
              </div>
              {renderGrid(
                aspirations,
                newOpen ? (
                  <div className="bg-card border border-dashed border-line rounded-2xl p-4 flex flex-col gap-2 min-h-[118px]">
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void create();
                        if (e.key === "Escape") setNewOpen(false);
                      }}
                      placeholder="Name what you're chasing…"
                      className="bg-paper border border-line rounded-lg px-3 py-2 text-[13.5px] outline-none text-ink"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => void create()}
                        className="bg-ink text-white rounded-lg px-3.5 py-1.5 text-[13px]"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => setNewOpen(false)}
                        className="text-[13px] text-ink-mute px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setNewOpen(true)}
                    className="border border-dashed border-line rounded-2xl p-4 min-h-[118px] text-ink-mute hover:text-ink hover:border-ink-mute transition flex items-center justify-center gap-2 text-[13.5px]"
                  >
                    <Plus className="w-4 h-4" /> New — what are you chasing?
                  </button>
                ),
              )}
            </div>

            {board && goals.length === 0 && (
              <div className="text-[13px] text-ink-mute mt-1 max-w-[420px] leading-relaxed">
                This is the space for the things you&apos;re actually chasing — a TED talk,
                climbing Everest, whatever it is. Start one; the Coach drafts what it&apos;d take
                in the background. Set a deadline whenever you&apos;re ready to commit it to a
                Goal.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
