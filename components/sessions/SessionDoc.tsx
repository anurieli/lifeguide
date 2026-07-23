"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  GitBranch,
  ImagePlus,
  Loader2,
  MessageCircle,
  Mic,
  Pause,
  Play,
  Square,
  X,
} from "lucide-react";
import { useRecording } from "./RecordingProvider";
import { useBlobUpload } from "@/hooks/useBlobUpload";
import {
  currentDevice,
  formatElapsed,
  isBareUrl,
  urlRawType,
} from "@/components/thoughts/utils";
import { caretPosition, CaretPos } from "./caret";
import { ThoughtMapView } from "./ThoughtMapView";
import { CaptureItem, CaptureDoc } from "./CaptureItem";
import { shouldShowListening, LISTENING_WINDOW_MS } from "@/lib/sessionListening";

/**
 * The living entry: one continuous document. Captures render in the order they
 * were added (spoken passages, typed text, photos); a borderless editor trails
 * the content, so tapping anywhere on the page just starts typing (committed as
 * a text capture on blur). On desktop the mic + photo pair rides the text caret
 * (a horizontal row just right of where you're writing; with no caret it rests
 * below the last content); on the phone the controls float bottom-right. The
 * live take itself belongs to RecordingProvider, so it keeps recording if the
 * person navigates away. Leaving an entry with no content deletes it.
 */
type ReplyDoc = FunctionReturnType<typeof api.sessions.replies>[number];

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

// A dynamic-mode interviewer turn: visually distinct from the user's own material
// (indented, thin left border, small persona tag, quieter type) but calm — no
// bubble chrome, no avatar. History is history: this renders in quiet mode too,
// it's just that no new ones generate there (the backend handles that gate).
function ReplyBlock({ reply }: { reply: ReplyDoc }) {
  return (
    <div className="pl-3.5 border-l-2 border-gold/35">
      <div className="text-[10.5px] font-medium tracking-wide text-gold/80 uppercase mb-1">
        {capitalize(reply.persona || "coach")}
      </div>
      {reply.status === "pending" && (
        <p className="text-[13px] text-ink-mute animate-pulse">thinking…</p>
      )}
      {reply.status === "error" && (
        <p className="text-[12.5px] text-ink-mute">Didn&apos;t catch that one.</p>
      )}
      {reply.status === "done" && reply.text && (
        <p className="text-[14px] leading-relaxed text-ink-soft whitespace-pre-wrap">
          {reply.text}
        </p>
      )}
    </div>
  );
}

type MicTurn = "idle" | "recording" | "transcribing";

// Conversation mode makes the mic the primary control, with a visible
// turn-cycle: idle "Speak" (gold, labeled) -> recording (the existing
// discard/pause/stop pill, gold-accented with a subtle pulse on stop) ->
// transcribing (a disabled spinner badge) -> back to idle once the take lands
// as a real capture. Brain-dump mode's ambient controls are untouched; this
// only renders when the session is in "dynamic" mode.
function ConversationMicButton({
  turn,
  paused,
  confirmDiscard,
  onStart,
  onStop,
  onPauseResume,
  onDiscard,
  size,
  disabled,
}: {
  turn: MicTurn;
  paused: boolean;
  confirmDiscard: boolean;
  onStart: () => void;
  onStop: () => void;
  onPauseResume: () => void;
  onDiscard: () => void;
  size: "sm" | "lg";
  disabled?: boolean;
}) {
  const badgeDim = size === "lg" ? "w-14 h-14" : "w-9 h-9";
  const badgeIcon = size === "lg" ? "w-6 h-6" : "w-4 h-4";

  if (turn === "transcribing") {
    return (
      <div
        aria-label="Transcribing"
        className={`${badgeDim} rounded-full bg-gold/15 border-[1.5px] border-gold text-gold flex items-center justify-center`}
      >
        <Loader2 className={`${badgeIcon} animate-spin`} />
      </div>
    );
  }

  if (turn === "recording") {
    return (
      <div className="flex items-center gap-1 bg-card border border-gold rounded-full shadow-lg p-1">
        <button
          type="button"
          onClick={onDiscard}
          aria-label={confirmDiscard ? "Tap again to discard" : "Discard recording"}
          className={`h-10 rounded-full flex items-center justify-center transition ${
            confirmDiscard
              ? "px-3 text-[12px] font-medium text-red-500"
              : "w-10 text-ink-mute hover:text-red-500"
          }`}
        >
          {confirmDiscard ? "Sure?" : <X className="w-[18px] h-[18px]" />}
        </button>
        <button
          type="button"
          onClick={onPauseResume}
          aria-label={paused ? "Resume recording" : "Pause recording"}
          className="w-10 h-10 rounded-full text-ink-soft hover:text-ink flex items-center justify-center"
        >
          {paused ? (
            <Play className="w-[18px] h-[18px]" fill="currentColor" strokeWidth={0} />
          ) : (
            <Pause className="w-[18px] h-[18px]" fill="currentColor" strokeWidth={0} />
          )}
        </button>
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop and send"
          className="relative w-11 h-11 rounded-full bg-gold border-[1.5px] border-gold text-white flex items-center justify-center active:scale-95 transition"
        >
          {!paused && <span className="absolute inset-0 rounded-full bg-gold/50 animate-ping" />}
          <Square className="relative w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />
        </button>
      </div>
    );
  }

  // idle
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={disabled}
      aria-label="Speak"
      className={`${
        size === "lg" ? "h-14 px-5" : "h-9 px-3.5"
      } rounded-full bg-gold text-white shadow-md flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-95 transition`}
    >
      <Mic className={badgeIcon} />
      <span className={size === "lg" ? "text-[14px] font-medium" : "text-[12.5px] font-medium"}>
        Speak
      </span>
    </button>
  );
}

export function SessionDoc({
  sessionId,
  onBack,
}: {
  sessionId: Id<"sessions">;
  onBack: () => void;
}) {
  const doc = useQuery(api.sessions.get, { sessionId });
  const replies = useQuery(api.sessions.replies, { sessionId }) ?? [];
  const createCapture = useMutation(api.captures.create);
  const reprocess = useMutation(api.captures.reprocess);
  const updateCaptureText = useMutation(api.captures.update);
  const setDoing = useMutation(api.sessions.setDoing);
  const setTitle = useMutation(api.sessions.setTitle);
  const setMode = useMutation(api.sessions.setMode);
  const refreshDigest = useMutation(api.sessions.refreshDigest);
  const deleteIfEmpty = useMutation(api.sessions.deleteIfEmpty);
  const touchOpened = useMutation(api.sessions.touchOpened);
  const uploadBlob = useBlobUpload();
  const rec = useRecording();
  // This entry is the one the live take is landing in.
  const isLive = rec.sessionId === sessionId;
  // Finished takes still saving into this entry: rendered on the page at once,
  // the upload running behind them.
  const pendingHere = rec.pendingTakes.filter((t) => t.sessionId === sessionId);
  const failedHere = rec.failedTakes.some((t) => t.sessionId === sessionId);
  // The conversation-mode mic's turn-cycle: idle -> recording -> transcribing
  // (a take stopped and is saving/uploading) -> back to idle once the real
  // capture lands.
  const micTurn: MicTurn = isLive && rec.recording ? "recording" : pendingHere.length > 0 ? "transcribing" : "idle";

  const [text, setText] = useState("");
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [doingDraft, setDoingDraft] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // The view switcher: same page, swapped content — "Thoughts" is the existing
  // dump/conversation feed, "Thought Map" hands the body to ThoughtMapView.
  const [view, setView] = useState<"thoughts" | "map">("thoughts");
  // Where the text caret sits inside the trailing editor (desktop: the capture
  // pair rides it). null = no caret; the pair rests below the last content.
  const [caret, setCaret] = useState<CaretPos | null>(null);
  // The "listening…" bridge reads a fresh Date.now() at render time (below), so its
  // correctness never depends on this state. This tick exists only as the mechanism
  // by which the bridge's own deadline timer (below) forces one re-render, clearing an
  // orphaned unanswered capture even when Convex sends nothing.
  const [, bumpListeningTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Every visit re-anchors the entry: stamp lastOpenedAt, and refresh the digest
  // so the name + living description cover whatever landed since last time
  // (the server skips when they already do).
  useEffect(() => {
    void touchOpened({ sessionId });
    void refreshDigest({ sessionId });
  }, [touchOpened, refreshDigest, sessionId]);

  // The discard confirmation is a two-tap guard; let it disarm on its own.
  useEffect(() => {
    if (!confirmDiscard) return;
    const t = window.setTimeout(() => setConfirmDiscard(false), 2500);
    return () => window.clearTimeout(t);
  }, [confirmDiscard]);

  // The "listening…" bridge auto-expires (ARI-135). When it hangs on a fresh but
  // still-unanswered capture, nothing else re-renders this component at the 30s
  // deadline: Convex only pushes on a real reply/capture change, which is exactly
  // what is missing for an orphaned turn. Schedule one re-render at that deadline so
  // shouldShowListening flips itself off. Only armed for the fresh-capture case;
  // an in-flight pending take, a quiet session, or an already-answered/already-expired
  // turn needs no timer.
  const listeningMode = doc?.session.mode ?? "quiet";
  // The actual latest capture row (max createdAt; a tie goes to the one later in the
  // array, i.e. the fresher insert), and whether any reply already targets it by
  // afterCaptureId. Coverage is per-capture, never inferred from reply timing: a
  // prior-turn or opener reply points at an earlier capture, so it leaves a fresh
  // current-turn capture uncovered (ARI-135).
  const listeningLatestCapture = doc?.captures.length
    ? doc.captures.reduce((latest, c) => (c.createdAt >= latest.createdAt ? c : latest))
    : null;
  const listeningLatestCaptureAt = listeningLatestCapture?.createdAt ?? 0;
  const listeningHasReplyForLatestCapture =
    listeningLatestCapture !== null &&
    replies.some((r) => r.afterCaptureId === listeningLatestCapture._id);
  useEffect(() => {
    if (listeningMode !== "dynamic") return;
    if (pendingHere.length > 0) return;
    if (listeningHasReplyForLatestCapture) return;
    if (listeningLatestCaptureAt === 0) return;
    // One re-render at the capture's deadline. Convex only pushes on a real
    // reply/capture change, which is exactly what is missing for an orphaned turn;
    // this timer flips shouldShowListening off at the 30s mark on its own. If the
    // capture is already past its deadline (remaining <= 0), no timer is needed:
    // render-time Date.now() below already hides it immediately, no stale-clock flash.
    const remaining = listeningLatestCaptureAt + LISTENING_WINDOW_MS - Date.now();
    if (remaining <= 0) return;
    const t = window.setTimeout(() => bumpListeningTick((n) => n + 1), remaining);
    return () => window.clearTimeout(t);
  }, [listeningMode, pendingHere.length, listeningHasReplyForLatestCapture, listeningLatestCaptureAt, sessionId]);

  // No husks: leaving an entry that never got content removes it. This runs on the
  // explicit back action, not effect cleanup — StrictMode's dev double-mount would
  // fire an unmount cleanup immediately and delete a just-opened empty entry.
  // The server re-checks emptiness, so this never races an in-flight append.
  const goBack = () => {
    const trimmed = text.trim();
    if (trimmed) {
      // A typed thought must never be lost: commit it instead of husk-checking.
      setText("");
      void append(textCaptureArgs(trimmed));
    } else if (!isLive && pendingHere.length === 0 && !failedHere) {
      // A live, saving, or save-failed take is still landing here; not a husk.
      void deleteIfEmpty({ sessionId });
    }
    // Leaving re-updates the name + description over whatever this sitting added
    // (no-ops on an entry that was just husk-deleted or is already covered).
    void refreshDigest({ sessionId });
    onBack();
  };

  const append = useCallback(
    async (
      args: Omit<Parameters<typeof createCapture>[0], "sessionId" | "sourceMeta"> & {
        sourceMeta?: Record<string, unknown>;
      },
    ) => {
      const { sourceMeta, ...rest } = args;
      await createCapture({
        ...rest,
        sessionId,
        sourceMeta: JSON.stringify({ device: currentDevice(), ...sourceMeta }),
      });
    },
    [createCapture, sessionId],
  );

  // A pasted bare URL becomes a link capture (ingest fetches and reads it),
  // exactly as the old Thought Stream composer treated it.
  const textCaptureArgs = (trimmed: string) =>
    isBareUrl(trimmed)
      ? ({ source: "paste", rawType: urlRawType(trimmed), rawUrl: trimmed } as const)
      : ({ source: "paste", rawType: "text", rawText: trimmed } as const);

  // Typing commits on blur: the page itself is the input, no send button.
  const commitText = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    if (editorRef.current) editorRef.current.style.height = "auto";
    void append(textCaptureArgs(trimmed)).catch(() =>
      // A thought must never be silently lost: put it back on the page.
      setText(trimmed),
    );
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const rawFileId = await uploadBlob(file, file.type);
      await append({
        source: "upload",
        rawType: file.type.startsWith("image/") ? "image" : "file",
        rawFileId,
      });
    } catch {
      // Swallow: the file picked is still on disk; the user can just try again.
    } finally {
      setUploading(false);
    }
  };

  const discardTake = () => {
    if (!confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    setConfirmDiscard(false);
    void rec.cancel();
  };

  const focusEditor = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) editorRef.current?.focus();
  };

  const trackCaret = () => {
    const ta = editorRef.current;
    if (ta) setCaret(caretPosition(ta));
  };

  if (doc === undefined) {
    return <p className="text-center text-[13px] text-ink-mute py-10">Loading…</p>;
  }
  if (doc === null) {
    return (
      <div className="text-center py-16">
        <p className="text-[14px] text-ink-mute">This entry is gone.</p>
        <button type="button" onClick={onBack} className="mt-3 text-[13px] text-gold">
          Back to thoughts
        </button>
      </div>
    );
  }

  const { session, captures } = doc;
  const started = new Date(session.startedAt);
  const mode = session.mode ?? "quiet";

  // The user's own material interleaved with the interviewer's replies, in the
  // order they actually happened. History is history: replies still render in
  // quiet mode (the backend just stops generating new ones there).
  const thread: Array<
    { kind: "capture"; at: number; capture: CaptureDoc } | { kind: "reply"; at: number; reply: ReplyDoc }
  > = [
    ...captures.map((c) => ({ kind: "capture" as const, at: c.createdAt, capture: c })),
    ...replies.map((r) => ({ kind: "reply" as const, at: r.createdAt, reply: r })),
  ].sort((a, b) => a.at - b.at);

  // No dead air (dynamic mode only): the instant a take is saved or a text
  // capture commits, show a client-side "listening…" line at the thread bottom,
  // bridging the gap before the real pending reply row ("thinking…") shows up.
  // The full rule (in-flight take always bridges; a reply that targets the latest
  // capture by afterCaptureId takes over whatever its status; otherwise a fresh
  // unanswered capture bridges only within LISTENING_WINDOW_MS so an orphaned old
  // capture never hangs the placeholder; never while actively speaking) lives in the
  // pure, tested lib/sessionListening.ts. Reading Date.now() at render time keeps
  // the predicate off any stale clock; the deadline timer above only forces the
  // re-render that lets an expired bridge clear itself without a Convex update.
  const showListening = shouldShowListening({
    mode,
    isRecording: isLive && rec.recording,
    pendingTakeCount: pendingHere.length,
    latestCaptureAt: listeningLatestCaptureAt,
    hasReplyForLatestCapture: listeningHasReplyForLatestCapture,
    now: Date.now(),
  });

  // The live-take pill — discard · pause/resume · save — shared by the desktop
  // caret row and the phone's floating corner.
  const takePill = (
    <div className="flex items-center gap-1 bg-card border border-line-2 rounded-full shadow-lg p-1">
      <button
        type="button"
        onClick={discardTake}
        aria-label={confirmDiscard ? "Tap again to discard" : "Discard recording"}
        className={`h-10 rounded-full flex items-center justify-center transition ${
          confirmDiscard
            ? "px-3 text-[12px] font-medium text-red-500"
            : "w-10 text-ink-mute hover:text-red-500"
        }`}
      >
        {confirmDiscard ? "Sure?" : <X className="w-[18px] h-[18px]" />}
      </button>
      <button
        type="button"
        onClick={() => (rec.paused ? rec.resume() : rec.pause())}
        aria-label={rec.paused ? "Resume recording" : "Pause recording"}
        className="w-10 h-10 rounded-full text-ink-soft hover:text-ink flex items-center justify-center"
      >
        {rec.paused ? (
          <Play className="w-[18px] h-[18px]" fill="currentColor" strokeWidth={0} />
        ) : (
          <Pause className="w-[18px] h-[18px]" fill="currentColor" strokeWidth={0} />
        )}
      </button>
      <button
        type="button"
        onClick={() => void rec.finish()}
        aria-label="Save recording"
        className="w-11 h-11 rounded-full bg-gold/15 border-[1.5px] border-gold text-gold flex items-center justify-center active:scale-95 transition"
      >
        <Square className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-line md:px-8">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="text-ink-mute hover:text-ink"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          {/* The name is yours: typing here locks it against the AI (titleEditedAt);
              left blank, the digest keeps naming the entry. */}
          <input
            value={titleDraft ?? session.title ?? ""}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              if (titleDraft !== null) {
                void setTitle({ sessionId, title: titleDraft });
                setTitleDraft(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder={started.toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
            })}
            aria-label="Name this thought"
            className="w-full bg-transparent text-[14px] text-ink font-medium outline-none placeholder:text-ink-mute"
          />
          <div className="text-[11.5px] text-ink-mute">
            {started.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
          {/* The living description: re-synthesized as content lands and on every
              open/leave. This line is what an agent traversing entries pulls. */}
          {session.summary && (
            <div className="text-[11.5px] text-ink-mute italic truncate">
              {session.summary}
            </div>
          )}
        </div>
        <input
          value={doingDraft ?? session.doing ?? ""}
          onChange={(e) => setDoingDraft(e.target.value)}
          onBlur={() => {
            if (doingDraft !== null) void setDoing({ sessionId, doing: doingDraft });
          }}
          placeholder="What were you doing?"
          className="w-40 bg-transparent text-right text-[12px] text-ink-soft placeholder:text-ink-mute outline-none"
        />
      </div>

      {/* Plain-words mode toggle + the Thoughts/Thought Map view switcher: a slim
          strip of its own so both stay comfortably tappable on the phone
          without crowding the title row. Same api.sessions.setMode call
          underneath — only the label changed, the stored "quiet"/"dynamic"
          values didn't. */}
      <div className="flex items-center justify-between gap-2 px-5 py-2 border-b border-line/70 md:px-8">
        <button
          type="button"
          onClick={() => void setMode({ sessionId, mode: mode === "quiet" ? "dynamic" : "quiet" })}
          aria-label={mode === "quiet" ? "Turn on Have a conversation" : "Turn off Have a conversation"}
          title={
            mode === "quiet"
              ? "Brain dump — silent. Tap to have a conversation."
              : "Conversation — the interviewer engages. Tap to go back to a brain dump."
          }
          className={`flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[12px] font-medium transition min-w-[44px] justify-center ${
            mode === "dynamic"
              ? "bg-gold/10 border-gold text-gold"
              : "bg-paper-2 border-line-2 text-ink-mute hover:text-ink"
          }`}
        >
          {mode === "dynamic" ? (
            <MessageCircle className="w-3.5 h-3.5" />
          ) : (
            <Mic className="w-3.5 h-3.5" />
          )}
          {mode === "dynamic" ? "Conversation" : "Brain dump"}
        </button>
        <div className="flex items-center gap-0.5 bg-paper-2 border border-line-2 rounded-full p-0.5">
          <button
            type="button"
            onClick={() => setView("thoughts")}
            aria-pressed={view === "thoughts"}
            className={`h-8 px-3 rounded-full text-[11.5px] font-medium transition ${
              view === "thoughts" ? "bg-card text-ink shadow-sm" : "text-ink-mute hover:text-ink"
            }`}
          >
            Thoughts
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            aria-pressed={view === "map"}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-medium transition ${
              view === "map" ? "bg-card text-ink shadow-sm" : "text-ink-mute hover:text-ink"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Thought Map
          </button>
        </div>
      </div>

      {/* The page: content in order, then the trailing editor. Clicking empty
          space anywhere lands the caret, like a notes document. Only rendered
          in the "Thoughts" view — the map view swaps this whole body out. */}
      {view === "thoughts" && (
      <div
        className="flex-1 overflow-y-auto px-5 py-5 pb-36 md:px-8 cursor-text"
        onClick={focusEditor}
      >
        <div className="max-w-[680px] mx-auto flex flex-col gap-5" onClick={focusEditor}>
          {captures.length === 0 && !isLive && !text && pendingHere.length === 0 && (
            <p className="text-[13.5px] text-ink-mute py-2 pointer-events-none select-none">
              Speak, or tap anywhere and write.
            </p>
          )}
          {/* The brain-dump box: every piece added to this entry (free text, a
              recording, a photo) is its own itemized, expandable card inside one
              visually contained box — not a flat blob of running text. Replies
              from the interviewer (dynamic mode) stay interleaved chronologically
              in their existing quieter style, just nested in the same box. A
              text/quote card is click-to-edit in place (ARI-123's idiom, now
              living inside CaptureItem itself); other raw types stay read-only. */}
          {(thread.length > 0 ||
            pendingHere.length > 0 ||
            failedHere ||
            showListening ||
            (isLive && rec.recording)) && (
            <div className="rounded-2xl border border-line-2 bg-paper-2/40 p-3.5 flex flex-col gap-2.5">
              {thread.map((item) =>
                item.kind === "reply" ? (
                  <ReplyBlock key={item.reply._id} reply={item.reply} />
                ) : (
                  <CaptureItem
                    key={item.capture._id}
                    capture={item.capture}
                    onRetry={(captureId) => void reprocess({ captureId })}
                    onSave={(captureId, rawText) =>
                      void updateCaptureText({ captureId, rawText })
                    }
                  />
                ),
              )}
              {/* Takes saving right now: on the page the instant recording stops,
                  upload + transcription running behind them. The real capture row
                  replaces this the moment the server has it. */}
              {pendingHere.map((t) => (
                <div
                  key={t.startedAt}
                  className="flex items-center gap-2.5 px-0.5 pointer-events-none select-none"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
                  <span className="text-[14px] tabular-nums text-ink-soft">
                    {formatElapsed(t.durationMs)}
                  </span>
                  <span className="text-[12.5px] text-ink-mute">Processing…</span>
                </div>
              ))}
              {failedHere && !isLive && (
                <p className="text-[13px] text-ink-mute px-0.5">
                  That take didn&apos;t save; it&apos;s still here.{" "}
                  <button
                    type="button"
                    onClick={() => void rec.retryFailed()}
                    className="text-gold"
                  >
                    Try again
                  </button>
                </p>
              )}
              {/* No dead air (conversation mode): a placeholder in the interviewer's
                  own voice/position, standing in until the real pending reply row
                  replaces it. */}
              {showListening && (
                <div className="pl-3.5 border-l-2 border-gold/35">
                  <div className="text-[10.5px] font-medium tracking-wide text-gold/80 uppercase mb-1">
                    {capitalize(session.interviewer || "coach")}
                  </div>
                  <p className="text-[13px] text-ink-mute animate-pulse">listening…</p>
                </div>
              )}
              {/* A live take renders in-flow, part of the document as it happens. */}
              {isLive && rec.recording && (
                <div className="flex items-center gap-2.5 px-0.5 pointer-events-none select-none">
                  <span
                    className={`w-2.5 h-2.5 rounded-full bg-gold ${rec.paused ? "" : "animate-pulse"}`}
                  />
                  <span className="text-[14px] tabular-nums text-ink-soft">
                    {formatElapsed(rec.elapsedMs)}
                  </span>
                  <span className="text-[12.5px] text-ink-mute">
                    {rec.paused ? "Paused" : "Listening…"}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="relative">
            <textarea
              ref={editorRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
                trackCaret();
              }}
              onFocus={trackCaret}
              onSelect={trackCaret}
              onBlur={() => {
                setCaret(null);
                commitText();
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  commitText();
                }
              }}
              rows={2}
              aria-label="Write in this entry"
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink outline-none overflow-hidden"
            />
            {/* Desktop: mic + photo ride the caret — a horizontal pair just right
                of where the person is writing, one click from the thought. With no
                caret the pair rests here in flow, below the last content. mousedown
                is swallowed so tapping a button doesn't blur the editor and move
                the row out from under the click. */}
            <div
              className="hidden md:flex items-center gap-2"
              style={
                caret
                  ? {
                      position: "absolute",
                      left: Math.max(
                        0,
                        Math.min(
                          caret.left + 12,
                          (editorRef.current?.clientWidth ?? 680) - 96,
                        ),
                      ),
                      top: caret.top + caret.lineHeight / 2 - 18,
                    }
                  : undefined
              }
              onMouseDown={(e) => e.preventDefault()}
            >
              {mode === "dynamic" ? (
                micTurn === "recording" ? (
                  <ConversationMicButton
                    turn={micTurn}
                    paused={rec.paused}
                    confirmDiscard={confirmDiscard}
                    onStart={() => void rec.start(sessionId)}
                    onStop={() => void rec.finish()}
                    onPauseResume={() => (rec.paused ? rec.resume() : rec.pause())}
                    onDiscard={discardTake}
                    size="sm"
                  />
                ) : (
                  <>
                    <ConversationMicButton
                      turn={micTurn}
                      paused={rec.paused}
                      confirmDiscard={confirmDiscard}
                      onStart={() => void rec.start(sessionId)}
                      onStop={() => void rec.finish()}
                      onPauseResume={() => (rec.paused ? rec.resume() : rec.pause())}
                      onDiscard={discardTake}
                      size="sm"
                      disabled={!rec.supported}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      aria-label="Add a photo"
                      className="w-9 h-9 rounded-full bg-card border border-line-2 shadow-sm text-ink-mute hover:text-gold flex items-center justify-center disabled:opacity-40"
                    >
                      <ImagePlus className="w-4 h-4" />
                    </button>
                    {rec.error && !rec.recording && (
                      <span className="text-[11px] text-ink-mute whitespace-nowrap">
                        Mic unavailable — just write.
                      </span>
                    )}
                  </>
                )
              ) : isLive && rec.recording ? (
                takePill
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void rec.start(sessionId)}
                    disabled={!rec.supported}
                    aria-label="Record"
                    className="w-9 h-9 rounded-full bg-accent text-white shadow-md flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    aria-label="Add a photo"
                    className="w-9 h-9 rounded-full bg-card border border-line-2 shadow-sm text-ink-mute hover:text-gold flex items-center justify-center disabled:opacity-40"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  {rec.error && !rec.recording && (
                    <span className="text-[11px] text-ink-mute whitespace-nowrap">
                      Mic unavailable — just write.
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Phone: the controls float bottom-right (there's no caret to ride on a
          touch keyboard flow). Idle: photo + mic. Live: the shared slim pill.
          The composer/recording controls never float over the map view. */}
      {view === "thoughts" && (
      <div className="absolute bottom-5 right-5 flex flex-col items-end gap-2.5 md:hidden">
        {rec.error && !rec.recording && (
          <span className="text-[11px] text-ink-mute bg-card border border-line rounded-full px-2.5 py-1">
            Mic unavailable. Tap the page and type.
          </span>
        )}
        {!(mode === "dynamic" && micTurn === "recording") && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Add a photo"
            className="w-11 h-11 rounded-full bg-card border border-line-2 shadow-md text-ink-mute hover:text-gold flex items-center justify-center disabled:opacity-40"
          >
            <ImagePlus className="w-[18px] h-[18px]" />
          </button>
        )}
        {mode === "dynamic" ? (
          <ConversationMicButton
            turn={micTurn}
            paused={rec.paused}
            confirmDiscard={confirmDiscard}
            onStart={() => void rec.start(sessionId)}
            onStop={() => void rec.finish()}
            onPauseResume={() => (rec.paused ? rec.resume() : rec.pause())}
            onDiscard={discardTake}
            size="lg"
            disabled={!rec.supported}
          />
        ) : isLive && rec.recording ? (
          takePill
        ) : (
          <button
            type="button"
            onClick={() => void rec.start(sessionId)}
            disabled={!rec.supported}
            aria-label="Record"
            className="w-14 h-14 rounded-full bg-accent text-white shadow-lg flex items-center justify-center disabled:opacity-50 active:scale-95 transition"
          >
            <Mic className="w-6 h-6" />
          </button>
        )}
      </div>
      )}

      {/* The thought map: a VIEW of this same page (not an overlay), swapped
          in for the captures feed + composer above. Desktop shows the graph,
          phone the collapsible outline; ThoughtMapView owns that split. */}
      {view === "map" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto md:overflow-hidden px-5 py-4 md:px-8">
          <div className="max-w-[900px] w-full mx-auto flex-1 min-h-0 flex flex-col">
            <ThoughtMapView sessionId={sessionId} />
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onFile(e)}
      />
    </div>
  );
}
