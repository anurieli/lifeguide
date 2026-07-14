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
} from "lucide-react";

// The Goals board (Orbit): the few Big Things that matter, each with a why,
// plus the Today / Inbox / Waiting triage queue. Spec:
// docs/product/features/goals.md (seeded from the Orbit PRD).

type QueueView = "today" | "inbox" | "waiting";
type BoardGoal = Doc<"goals"> & { openCount: number; doneCount: number };

const AREA_DOT: Record<string, string> = {
  business: "bg-blue",
  personal: "bg-green",
  people: "bg-violet",
};
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
    <div className="bg-card border border-line rounded-2xl p-4 lg:w-[310px] flex-shrink-0 self-start w-full">
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

// A Big Thing card: title, area dot, status pill, the why, open count.
function GoalCard({ goal, onOpen }: { goal: BoardGoal; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className={`text-left bg-card border border-line border-l-4 ${
        STATUS_BORDER[goal.status]
      } rounded-2xl p-4 hover:shadow-md transition flex flex-col gap-2 min-h-[118px]`}
    >
      <div className="flex items-center gap-2">
        <i className={`w-2 h-2 rounded-full flex-shrink-0 ${AREA_DOT[goal.area]}`} />
        <span className="font-semibold text-[15px] text-ink truncate flex-1">{goal.name}</span>
        <span className="text-[10.5px] uppercase tracking-wide text-ink-mute border border-line rounded px-1.5 py-0.5">
          {STATUS_LABEL[goal.status]}
        </span>
      </div>
      <div className="text-[12.5px] text-ink-soft leading-snug line-clamp-2 flex-1">
        {goal.why || <span className="text-ink-mute italic">Why does this matter? Add it.</span>}
      </div>
      <div className="text-[11.5px] text-ink-mute">
        {goal.openCount} open{goal.doneCount ? ` · ${goal.doneCount} done` : ""}
      </div>
    </button>
  );
}

// Drill-in: run one Big Thing — edit its why/status/area, work its open tasks.
function GoalDetail({
  goal,
  goals,
  today,
  onClose,
}: {
  goal: BoardGoal;
  goals: BoardGoal[];
  today: string;
  onClose: () => void;
}) {
  const tasks = useQuery(api.goals.tasks, { view: "goal", today, goalId: goal._id });
  const updateGoal = useMutation(api.goals.updateGoal);
  const archiveGoal = useMutation(api.goals.archiveGoal);
  const addTask = useMutation(api.goals.addTask);
  const [why, setWhy] = useState(goal.why ?? "");
  const [draft, setDraft] = useState("");

  const add = async () => {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    await addTask({ content, goalId: goal._id });
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card rounded-[18px] w-full max-w-[560px] max-h-[86dvh] overflow-auto p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <i className={`w-2.5 h-2.5 rounded-full ${AREA_DOT[goal.area]}`} />
              <h2 className="font-semibold text-[19px] text-ink">{goal.name}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full hover:bg-paper-2 text-ink-mute flex items-center justify-center"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {(["active", "planning", "ongoing"] as const).map((s) => (
            <Chip
              key={s}
              label={STATUS_LABEL[s]}
              active={goal.status === s}
              onClick={() => void updateGoal({ id: goal._id, status: s })}
            />
          ))}
          <span className="w-px bg-line mx-1" />
          {(["business", "personal", "people"] as const).map((a) => (
            <Chip
              key={a}
              label={a[0].toUpperCase() + a.slice(1)}
              active={goal.area === a}
              onClick={() => void updateGoal({ id: goal._id, area: a })}
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
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void add()}
            placeholder={`Add a task to ${goal.name}…`}
            className="flex-1 bg-paper border border-line rounded-lg px-3 py-2 text-[13px] outline-none text-ink placeholder:text-ink-mute"
          />
          <button
            onClick={() => void add()}
            aria-label="Add task"
            className="bg-ink text-white rounded-lg px-3.5 text-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

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

export function Goals({ onNavigate }: { onNavigate?: (v: "settings") => void }) {
  const today = useMemo(localToday, []);
  const board = useQuery(api.goals.board, { today });
  const keyStatus = useQuery(api.aiKeys.status, {});
  const createGoal = useMutation(api.goals.createGoal);
  const syncTodoist = useAction(api.todoist.sync);

  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [openGoalId, setOpenGoalId] = useState<Id<"goals"> | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const hasTodoist = (keyStatus ?? []).some((k) => k.provider === "todoist");
  const goals = board?.goals ?? [];
  const shown = areaFilter ? goals.filter((g) => g.area === areaFilter) : goals;
  const openGoal = goals.find((g) => g._id === openGoalId) ?? null;

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
    await createGoal({ name });
  };

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
            The big things
          </div>
          <h1 className="text-[30px] font-semibold text-ink leading-none">Goals</h1>
        </PageHeader>

        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {board && <QueuePanel board={board} goals={goals} today={today} />}

          <div className="flex-1 w-full">
            <div className="flex gap-1.5 mb-3 flex-wrap">
              <Chip label="All" active={!areaFilter} onClick={() => setAreaFilter(null)} />
              {(["business", "personal", "people"] as const).map((a) => (
                <Chip
                  key={a}
                  label={a[0].toUpperCase() + a.slice(1)}
                  active={areaFilter === a}
                  onClick={() => setAreaFilter(areaFilter === a ? null : a)}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {shown.map((g) => (
                <GoalCard key={g._id} goal={g} onOpen={() => setOpenGoalId(g._id)} />
              ))}
              {newOpen ? (
                <div className="bg-card border border-dashed border-line rounded-2xl p-4 flex flex-col gap-2 min-h-[118px]">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void create();
                      if (e.key === "Escape") setNewOpen(false);
                    }}
                    placeholder="Name the big thing…"
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
                  <Plus className="w-4 h-4" /> New Big Thing
                </button>
              )}
            </div>
            {board && goals.length === 0 && (
              <div className="text-[13px] text-ink-mute mt-5 max-w-[420px] leading-relaxed">
                This board holds the few things that actually matter — each with a written
                why. Start one, or connect Todoist in Settings and sync your projects in.
              </div>
            )}
          </div>
        </div>
      </div>

      {openGoal && (
        <GoalDetail
          goal={openGoal}
          goals={goals}
          today={today}
          onClose={() => setOpenGoalId(null)}
        />
      )}
    </div>
  );
}
