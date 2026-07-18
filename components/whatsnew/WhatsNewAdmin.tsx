"use client";

// ============================================================================
// WHAT'S NEW ADMIN — the owner-gated authoring panel for the bottom-of-shell feed.
// ============================================================================
// A self-contained, embeddable panel (lives in /admin today, no route dependency —
// mirrors components/feedback/FeedbackInbox.tsx). `enabled` gates the query the same
// way FeedbackInbox does (skip when the page-level isDev||isOwner check fails); the
// real security boundary is server-side isOwner in convex/whatsNew.ts regardless of
// this flag. Create / edit / delete entries with user-facing title + body + which
// tab (View) the entry links to. See docs/product/features/whats-new.md, ADR 0026.
// ============================================================================

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { View } from "@/components/shell/Rail";
import { Pencil, Trash2, Plus } from "lucide-react";

const VIEWS: View[] = ["today", "core", "board", "goals", "sessions", "settings"];

type Draft = { title: string; body: string; view: View };
const EMPTY: Draft = { title: "", body: "", view: "today" };

export function WhatsNewAdmin({ enabled = true }: { enabled?: boolean }) {
  const entries = useQuery(api.whatsNew.listAll, enabled ? {} : "skip");
  const create = useMutation(api.whatsNew.create);
  const update = useMutation(api.whatsNew.update);
  const remove = useMutation(api.whatsNew.remove);

  const [editingId, setEditingId] = useState<Id<"whatsNew"> | null>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);

  const startCreate = () => {
    setDraft(EMPTY);
    setEditingId(null);
    setComposing(true);
  };

  const startEdit = (id: Id<"whatsNew">, title: string, body: string, view: View) => {
    setDraft({ title, body, view });
    setEditingId(id);
    setComposing(true);
  };

  const cancel = () => {
    setComposing(false);
    setEditingId(null);
    setDraft(EMPTY);
  };

  const save = async () => {
    if (!draft.title.trim() || !draft.body.trim()) return;
    setBusy(true);
    try {
      if (editingId) {
        await update({ id: editingId, title: draft.title.trim(), body: draft.body.trim(), view: draft.view });
      } else {
        await create({ title: draft.title.trim(), body: draft.body.trim(), view: draft.view });
      }
      cancel();
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) return null;

  return (
    <div className="bg-card border border-line rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-ink-mute text-[12px] uppercase tracking-[0.14em]">What&rsquo;s New</div>
        {!composing && (
          <button
            type="button"
            onClick={startCreate}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] bg-ink text-white hover:opacity-90 transition"
          >
            <Plus className="w-3.5 h-3.5" /> New entry
          </button>
        )}
      </div>

      {composing && (
        <div className="border border-line rounded-xl p-4 mb-4 flex flex-col gap-3">
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Title — warm, user-facing (e.g. “Thought Maps for your sessions”)"
            className="text-[14px] px-3 py-2 rounded-lg border border-line bg-paper outline-none focus:border-ink-mute"
          />
          <textarea
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            placeholder="What changed, in plain language — one or two sentences."
            rows={3}
            className="text-[13.5px] px-3 py-2 rounded-lg border border-line bg-paper outline-none focus:border-ink-mute resize-none"
          />
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] text-ink-mute">Links to</span>
            <select
              value={draft.view}
              onChange={(e) => setDraft((d) => ({ ...d, view: e.target.value as View }))}
              className="text-[13px] px-2 py-1.5 rounded-lg border border-line bg-paper outline-none"
            >
              {VIEWS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg px-3 py-2 text-[13px] border border-line text-ink-mute"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy || !draft.title.trim() || !draft.body.trim()}
              className="rounded-lg px-3 py-2 text-[13px] bg-ink text-white disabled:opacity-50"
            >
              {busy ? "…" : editingId ? "Save" : "Publish"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {entries === undefined ? (
          <div className="text-ink-mute text-[13px]">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="text-ink-mute text-[13px]">No entries yet.</div>
        ) : (
          entries.map((e) => (
            <div
              key={e._id}
              className="flex items-start justify-between gap-3 border border-line rounded-xl p-3"
            >
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium text-ink">{e.title}</div>
                <div className="text-[12.5px] text-ink-mute mt-0.5">{e.body}</div>
                <div className="text-[11px] text-ink-mute mt-1">
                  links to <span className="font-medium">{e.view}</span> ·{" "}
                  {new Date(e.publishedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(e._id, e.title, e.body, e.view as View)}
                  aria-label="Edit"
                  className="w-7 h-7 rounded-lg border border-line text-ink-mute hover:text-ink flex items-center justify-center transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void remove({ id: e._id })}
                  aria-label="Delete"
                  className="w-7 h-7 rounded-lg border border-line text-ink-mute hover:text-[#9B2C2C] flex items-center justify-center transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
