"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Camera, Check, Loader2, Merge, Mic, PenLine, Pin, Trash2 } from "lucide-react";
import { formatRelativeTime } from "@/components/thoughts/utils";
import { useRecording } from "./RecordingProvider";
import { useBlobUpload } from "@/hooks/useBlobUpload";
import { usePressSwipeUp } from "@/hooks/usePressSwipeUp";
import { demoPhotoBlob, demoVoiceBlob } from "./demoMedia";

type Row = FunctionReturnType<typeof api.sessions.list>[number];

// Swipe geometry: past THRESH the gesture commits; the row parks at OPEN to
// expose the delete confirm. Pinning is reversible, so it fires immediately.
const THRESH = 72;
const OPEN = 88;

function SessionRow({
  s,
  selectMode,
  selected,
  onToggleSelect,
  onOpen,
}: {
  s: Row;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
}) {
  const setPinned = useMutation(api.sessions.setPinned);
  const remove = useMutation(api.sessions.remove);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Swiped-right resting state: the row parks open with Delete exposed; tapping
  // Delete confirms, tapping the row (or swiping back) closes it.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmHover, setConfirmHover] = useState(false); // desktop two-click confirm
  const touchRef = useRef<{ x: number; y: number; horizontal: boolean } | null>(null);
  // Browsers fire a click after touchend; a swipe must not double as a tap.
  const suppressClickRef = useRef(false);

  const togglePin = () => void setPinned({ sessionId: s._id, pinned: !s.pinnedAt });
  const doDelete = () => void remove({ sessionId: s._id });

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, horizontal: false };
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const start = touchRef.current;
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x + (deleteOpen ? OPEN : 0);
    const dy = t.clientY - start.y;
    if (!start.horizontal) {
      if (Math.abs(t.clientX - start.x) < 10 || Math.abs(t.clientX - start.x) < Math.abs(dy))
        return;
      start.horizontal = true;
    }
    setDragX(Math.max(-OPEN * 1.25, Math.min(OPEN * 1.25, dx)));
  };
  const onTouchEnd = () => {
    const wasHorizontal = touchRef.current?.horizontal ?? false;
    touchRef.current = null;
    setDragging(false);
    if (!wasHorizontal) return;
    suppressClickRef.current = true;
    if (dragX > THRESH) {
      setDeleteOpen(true);
      setDragX(OPEN);
    } else if (dragX < -THRESH) {
      togglePin();
      setDeleteOpen(false);
      setDragX(0);
    } else {
      setDeleteOpen(false);
      setDragX(0);
    }
  };

  const onRowClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (deleteOpen) {
      setDeleteOpen(false);
      setDragX(0);
      return;
    }
    if (selectMode) onToggleSelect();
    else onOpen();
  };

  return (
    <div
      // overflow-hidden: a swiped row slides out of its own bounds, never the page's.
      className="relative group overflow-hidden rounded-2xl"
      onMouseLeave={() => setConfirmHover(false)}
    >
      {/* Underlays, exposed by the swipe: delete on the left, pin on the right. */}
      <div
        className={`absolute inset-y-0 left-0 w-[88px] rounded-2xl bg-red-500/10 flex items-center justify-center ${
          dragX > 0 ? "" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={doDelete}
          className="flex flex-col items-center gap-0.5 text-[11px] text-red-500"
        >
          <Trash2 className="w-5 h-5" />
          Delete
        </button>
      </div>
      <div
        className={`absolute inset-y-0 right-0 w-[88px] rounded-2xl bg-gold/10 flex items-center justify-center text-gold ${
          dragX < 0 ? "" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="flex flex-col items-center gap-0.5 text-[11px]">
          <Pin className="w-5 h-5" fill={s.pinnedAt ? "currentColor" : "none"} />
          {s.pinnedAt ? "Unpin" : "Pin"}
        </span>
      </div>

      <button
        type="button"
        onClick={onRowClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 0.18s ease-out",
          touchAction: "pan-y",
        }}
        className={`relative w-full text-left bg-card border rounded-2xl px-4 py-3.5 transition-colors ${
          selected ? "border-gold ring-1 ring-gold" : "border-line hover:border-gold"
        }`}
      >
        <div className="flex items-center gap-2 text-[11.5px] text-ink-mute mb-1">
          {selectMode && (
            <span
              className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center ${
                selected ? "bg-gold border-gold text-white" : "border-line-2"
              }`}
            >
              {selected && <Check className="w-3 h-3" strokeWidth={3} />}
            </span>
          )}
          {s.pinnedAt && <Pin className="w-3 h-3 text-gold" fill="currentColor" />}
          <span>{formatRelativeTime(s.startedAt)}</span>
          {s.counts.voice > 0 && (
            <span className="flex items-center gap-0.5">
              <Mic className="w-3 h-3" /> {s.counts.voice}
            </span>
          )}
          {s.counts.photo > 0 && (
            <span className="flex items-center gap-0.5">
              <Camera className="w-3 h-3" /> {s.counts.photo}
            </span>
          )}
          {s.doing && <span className="truncate">· {s.doing}</span>}
        </div>
        <div className="text-[15px] text-ink font-medium leading-snug">
          {s.title ?? s.preview}
        </div>
        {s.summary && (
          <div className="text-[13px] text-ink-soft leading-relaxed mt-0.5">{s.summary}</div>
        )}
      </button>

      {/* Desktop management (no swipe there): hover actions, delete needs a second click. */}
      {!selectMode && (
        <div className="absolute top-2.5 right-3 hidden md:group-hover:flex items-center gap-1.5">
          <button
            type="button"
            onClick={togglePin}
            aria-label={s.pinnedAt ? "Unpin" : "Pin"}
            className="w-7 h-7 rounded-full bg-paper-2 text-ink-mute hover:text-gold flex items-center justify-center"
          >
            <Pin className="w-3.5 h-3.5" fill={s.pinnedAt ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            onClick={() => (confirmHover ? doDelete() : setConfirmHover(true))}
            aria-label="Delete"
            className={`h-7 rounded-full flex items-center justify-center transition-all ${
              confirmHover
                ? "px-2.5 bg-red-500 text-white text-[11px] font-medium"
                : "w-7 bg-paper-2 text-ink-mute hover:text-red-500"
            }`}
          >
            {confirmHover ? "Sure?" : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}

/** Entries list: pinned first, then newest; AI title + subtext (or fallback). */
export function SessionsList({
  onOpen,
  onNew,
  onQuickRecord,
}: {
  onOpen: (id: Id<"sessions">) => void;
  onNew: () => void;
  onQuickRecord: () => void;
}) {
  const rows = useQuery(api.sessions.list, {});
  const deleteIfEmpty = useMutation(api.sessions.deleteIfEmpty);
  const mergeSessions = useMutation(api.sessions.merge);
  const seedDemo = useMutation(api.sessions.seedDemo);
  const uploadBlob = useBlobUpload();
  const rec = useRecording();
  const penSwipe = usePressSwipeUp(onQuickRecord);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<Id<"sessions">>>(new Set());
  const [merging, setMerging] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Paint the demo media in the browser, upload it, then let the server build
  // two fully packed entries (voice + photos + text). Real rows; swipe to remove.
  const addDemo = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const voiceFileIds = [
        await uploadBlob(demoVoiceBlob(24, 196), "audio/wav"),
        await uploadBlob(demoVoiceBlob(31, 165), "audio/wav"),
      ];
      const photoFileIds = [
        await uploadBlob(await demoPhotoBlob("sunrise"), "image/png"),
        await uploadBlob(await demoPhotoBlob("notebook"), "image/png"),
      ];
      await seedDemo({ voiceFileIds, photoFileIds });
    } finally {
      setSeeding(false);
    }
  };

  // Husk sweep: an empty entry can survive if the person left it without the back
  // action (e.g. switched rail tabs mid-take). The server re-checks emptiness
  // before deleting, so this never removes an entry with content. Exempt: the
  // entry a live take is recording into, and any entry a finished take is still
  // saving into (or failed to save into) — their content is still in the air.
  useEffect(() => {
    if (!rows) return;
    const inTheAir = new Set<Id<"sessions"> | null>([rec.sessionId]);
    for (const t of rec.pendingTakes) inTheAir.add(t.sessionId);
    for (const t of rec.failedTakes) inTheAir.add(t.sessionId);
    for (const s of rows) {
      if (inTheAir.has(s._id)) continue;
      if (s.counts.voice + s.counts.text + s.counts.photo === 0) {
        void deleteIfEmpty({ sessionId: s._id });
      }
    }
  }, [rows, deleteIfEmpty, rec.sessionId, rec.pendingTakes, rec.failedTakes]);

  const toggleSelected = (id: Id<"sessions">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelect = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const doMerge = async () => {
    if (selectedIds.size < 2 || merging) return;
    setMerging(true);
    try {
      const mergedId = await mergeSessions({ sessionIds: [...selectedIds] });
      exitSelect();
      onOpen(mergedId);
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[680px] mx-auto px-5 py-6 md:px-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[19px] font-semibold text-ink">Thoughts</h1>
          <div className="flex items-center gap-3">
            {rows && rows.length > 1 && (
              <button
                type="button"
                onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
                className="text-[13px] text-ink-mute hover:text-ink"
              >
                {selectMode ? "Cancel" : "Select"}
              </button>
            )}
            {/* The scribbler pen: a fresh entry from right here.
                Press + swipe up and it's already recording. */}
            <button
              type="button"
              onClick={onNew}
              {...penSwipe}
              aria-label="Think out loud"
              title="Think out loud"
              className="w-9 h-9 rounded-full bg-accent text-white shadow-md flex items-center justify-center hover:opacity-90 active:scale-95 transition"
            >
              <PenLine className="w-[17px] h-[17px]" strokeWidth={2.25} />
            </button>
          </div>
        </div>
        {rows === undefined ? (
          <p className="text-center text-[13px] text-ink-mute py-10">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[15px] text-ink-soft mb-1">No thoughts yet.</p>
            <p className="text-[13px] text-ink-mute">
              Tap the pen and think out loud. Everything lands here, kept forever.
            </p>
            <button
              type="button"
              onClick={() => void addDemo()}
              disabled={seeding}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-line-2 text-[13px] text-ink-soft hover:border-gold hover:text-gold transition disabled:opacity-60"
            >
              {seeding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {seeding ? "Setting up…" : "Show me two example thoughts"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2.5">
              {rows.map((s) => (
                <SessionRow
                  key={s._id}
                  s={s}
                  selectMode={selectMode}
                  selected={selectedIds.has(s._id)}
                  onToggleSelect={() => toggleSelected(s._id)}
                  onOpen={() => onOpen(s._id)}
                />
              ))}
            </div>
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => void addDemo()}
                disabled={seeding}
                className="text-[11.5px] text-ink-mute hover:text-gold transition disabled:opacity-60"
              >
                {seeding ? "Adding demo thoughts…" : "Add demo thoughts"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Merge action: selected sessions become one entry, elements interleaved
          by when each was added. */}
      {selectMode && selectedIds.size >= 2 && (
        <div className="fixed bottom-[80px] md:bottom-8 left-1/2 -translate-x-1/2 z-40">
          <button
            type="button"
            onClick={() => void doMerge()}
            disabled={merging}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-white text-[13.5px] font-medium shadow-lg disabled:opacity-60"
          >
            {merging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Merge className="w-4 h-4" />}
            Merge {selectedIds.size} into one
          </button>
        </div>
      )}
    </div>
  );
}
