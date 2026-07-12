"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  Braces,
  Check,
  Loader2,
  Mic,
  Network,
  Plus,
  Save,
  Square,
  Trash2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMusic } from "@/components/music/MusicProvider";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { useWhisperRecorder } from "@/lib/useWhisperRecorder";
import {
  BrainDumpEngine,
  BrainDumpGraph,
  DEFAULT_BRAIN_DUMP_ENGINE,
  emptyBrainDumpGraph,
} from "@/lib/brainDumpGraph";

type TranscriptEntry = {
  id: string;
  text: string;
  capturedAt: number;
  source: "speech" | "typed";
  status: "pending" | "processed" | "error";
};

type BrainDumpSession = {
  _id: Id<"brainDumpSessions">;
  title: string;
  transcript: TranscriptEntry[];
  graph: BrainDumpGraph;
  engine: BrainDumpEngine;
  aiCalls?: {
    id: string;
    kind: string;
    provider: BrainDumpEngine["provider"];
    model: string;
    status: "pending" | "success" | "error";
    inputPreview: string;
    outputPreview?: string;
    error?: string;
    startedAt: number;
    endedAt?: number;
  }[];
  createdAt: number;
  updatedAt: number;
};

type AiCall = NonNullable<BrainDumpSession["aiCalls"]>[number];

type QueueItem = {
  sessionId: Id<"brainDumpSessions">;
  text: string;
  source: "speech" | "typed";
};

const MAP_W = 1180;
const MAP_H = 760;
const PALETTE = ["#1E3A5F", "#4F7A4A", "#B8945A", "#5B4B7A", "#2F6E6A", "#3A5C86"];
const JUNK_UTTERANCES = new Set([
  "bye",
  "goodbye",
  "hello",
  "hi",
  "hey",
  "okay",
  "ok",
  "yeah",
  "yes",
  "no",
  "test",
  "testing",
  "thank",
  "thanks",
  "peace",
  "you",
]);

function clientLog(event: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  void fetch("/api/client-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, meta }),
  }).catch(() => {});
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueWordCount(text: string): number {
  return new Set(normalizeForCompare(text).split(/\s+/).filter(Boolean)).size;
}

function cleanTranscriptBlock(text: string): string {
  let cleaned = text
    .replace(/\s+/g, " ")
    .replace(/\b(um|uh|er|ah)\b[,\s]*/gi, "")
    .replace(/\b(you know)\s*\??/gi, "")
    .trim();
  cleaned = cleaned.replace(
    /\s*(and i'll see you next time\.?\s*)?((thank you( very much)?|thanks|bye|goodbye|peace|you bye)[.!?\s]*)+$/i,
    "",
  );
  const words = cleaned.split(/\s+/).filter(Boolean);
  const deduped: string[] = [];
  for (const word of words) {
    const prev = deduped[deduped.length - 1];
    if (prev && normalizeForCompare(prev) === normalizeForCompare(word)) continue;
    deduped.push(word);
  }
  return deduped.join(" ").replace(/\s+([,.!?])/g, "$1").trim();
}

function isSubstantialThought(text: string): boolean {
  const normalized = normalizeForCompare(text);
  if (!normalized) return false;
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.every((word) => JUNK_UTTERANCES.has(word))) return false;
  if (words.length < 4) {
    return words.length >= 2 && uniqueWordCount(normalized) >= 2 && normalized.length >= 14;
  }
  if (uniqueWordCount(normalized) < 3) return false;
  if (words.length <= 3 && JUNK_UTTERANCES.has(normalized)) return false;
  const repeated = words.length > 2 && uniqueWordCount(normalized) === 1;
  return !repeated;
}

function isNearDuplicate(text: string, existing: string[]): boolean {
  const normalized = normalizeForCompare(text);
  if (!normalized) return true;
  return existing.some((candidate) => {
    const other = normalizeForCompare(candidate);
    if (!other) return false;
    if (other === normalized) return true;
    if (normalized.length >= 20 && (other.includes(normalized) || normalized.includes(other))) {
      return true;
    }
    return false;
  });
}

function formatTime(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(ms);
}

function graphPositions(graph: BrainDumpGraph) {
  const map = new Map<string, { x: number; y: number }>();
  const center = { x: MAP_W / 2, y: MAP_H / 2 };
  graph.ideas.forEach((idea, index) => {
    if (index === 0) {
      map.set(idea.id, center);
      return;
    }
    const angle = index * 2.399963;
    const radius = 120 + Math.sqrt(index) * 82;
    const x = center.x + Math.cos(angle) * radius * 1.28;
    const y = center.y + Math.sin(angle) * radius * 0.82;
    map.set(idea.id, {
      x: Math.min(MAP_W - 150, Math.max(150, x)),
      y: Math.min(MAP_H - 92, Math.max(92, y)),
    });
  });
  return map;
}

function ProviderSegment({
  value,
  onChange,
}: {
  value: BrainDumpEngine["provider"];
  onChange: (provider: BrainDumpEngine["provider"]) => void;
}) {
  const providers: BrainDumpEngine["provider"][] = ["openrouter", "openai", "local"];
  return (
    <div className="inline-flex rounded-[10px] bg-paper-2 p-[3px]">
      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => onChange(provider)}
          className={`h-8 px-3 rounded-lg text-[12px] transition ${
            value === provider ? "bg-card text-ink shadow-sm" : "text-ink-mute hover:text-ink-soft"
          }`}
        >
          {provider}
        </button>
      ))}
    </div>
  );
}

function ThoughtMap({ graph }: { graph: BrainDumpGraph }) {
  const positions = useMemo(() => graphPositions(graph), [graph]);

  return (
    <div
      className="relative h-full min-h-[480px] overflow-hidden border-l border-line bg-[#fbfaf6]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(30,58,95,0.14) 1px, transparent 0)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full border border-line bg-card/90 px-3 py-1.5 text-[12px] text-ink-soft shadow-sm backdrop-blur">
        <Network className="h-4 w-4 text-blue" />
        <span>{graph.ideas.length} ideas</span>
        <span className="h-3 w-px bg-line" />
        <span>{graph.relations.length} links</span>
      </div>

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <marker id="brain-dump-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#8A8F9C" opacity="0.72" />
          </marker>
        </defs>
        {graph.relations.map((relation) => {
          const from = positions.get(relation.from);
          const to = positions.get(relation.to);
          if (!from || !to) return null;
          const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
          return (
            <g key={relation.id}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#8A8F9C"
                strokeWidth={1.4 + relation.strength * 1.4}
                strokeOpacity={0.38 + relation.strength * 0.32}
                markerEnd="url(#brain-dump-arrow)"
              />
              <text
                x={mid.x}
                y={mid.y - 8}
                textAnchor="middle"
                className="fill-ink-mute text-[13px]"
                paintOrder="stroke"
                stroke="#fbfaf6"
                strokeWidth="5"
              >
                {relation.label}
              </text>
            </g>
          );
        })}
      </svg>

      {graph.ideas.length === 0 && (
        <div className="absolute inset-0 grid place-items-center text-[14px] text-ink-mute">
          No ideas yet
        </div>
      )}

      {graph.ideas.map((idea, index) => {
        const pos = positions.get(idea.id) ?? { x: MAP_W / 2, y: MAP_H / 2 };
        const color = PALETTE[index % PALETTE.length];
        return (
          <div
            key={idea.id}
            className="absolute rounded-lg border bg-card px-3 py-2 shadow-sm"
            style={{
              left: `${(pos.x / MAP_W) * 100}%`,
              top: `${(pos.y / MAP_H) * 100}%`,
              transform: "translate(-50%, -50%)",
              borderColor: color,
              width: "fit-content",
              minWidth: 132,
              maxWidth: 226,
            }}
          >
            <div className="mb-1 flex items-center gap-2">
              <span
                className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
                style={{ background: color }}
              >
                {idea.id}
              </span>
              <div className="min-w-0 break-words text-[13px] font-semibold leading-snug text-ink">
                {idea.title}
              </div>
            </div>
            <div className="break-words text-[12px] leading-snug text-ink-soft">{idea.summary}</div>
            {idea.details.length > 0 && (
              <ul className="mt-2 space-y-1 text-[11px] leading-snug text-ink-mute">
                {idea.details.slice(0, 3).map((detail) => (
                  <li key={detail} className="flex gap-1.5">
                    <span className="mt-[0.45em] h-1 w-1 flex-shrink-0 rounded-full bg-current" />
                    <span className="break-words">{detail}</span>
                  </li>
                ))}
              </ul>
            )}
            {idea.mentions > 1 && (
              <div className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-ink-mute">
                {idea.mentions} mentions
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IdeaCards({
  graph,
  onDeleteIdea,
}: {
  graph: BrainDumpGraph;
  onDeleteIdea: (ideaId: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-col border-t border-line bg-paper px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
          Ideas
        </div>
        <div className="text-[12px] text-ink-mute">{graph.ideas.length}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto pr-1">
        {graph.ideas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-card px-3 py-4 text-center text-[13px] text-ink-mute">
            Main ideas will appear here as you speak.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {graph.ideas.map((idea, index) => {
              const color = PALETTE[index % PALETTE.length];
              return (
                <article key={idea.id} className="rounded-lg border border-line bg-card px-3 py-3 shadow-sm">
                  <div className="mb-2 flex items-start gap-2">
                    <span
                      className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
                      style={{ background: color }}
                    >
                      {idea.id}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-[14px] font-semibold leading-snug text-ink">
                        {idea.title}
                      </h3>
                      <p className="mt-1 break-words text-[13px] leading-relaxed text-ink-soft">
                        {idea.summary}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteIdea(idea.id)}
                      title="Delete idea"
                      className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-ink-mute transition hover:bg-paper-2 hover:text-gold"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {idea.details.length > 0 && (
                    <ul className="ml-9 space-y-1.5 text-[12.5px] leading-relaxed text-ink-soft">
                      {idea.details.map((detail) => (
                        <li key={detail} className="flex gap-2">
                          <span className="mt-[0.65em] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />
                          <span className="break-words">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DebugAccordion({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-line bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">
          {label}
        </span>
        <span className="text-[18px] leading-none text-ink-mute">{open ? "-" : "+"}</span>
      </button>
      {open && <div className="max-h-[300px] overflow-auto px-4 pb-4">{children}</div>}
    </div>
  );
}

function ModelCallsPanel({ calls }: { calls: AiCall[] }) {
  return (
    <div className="flex flex-col gap-2">
      {calls.length === 0 && <div className="text-[12px] text-ink-mute">No model calls yet.</div>}
      {calls
        .slice()
        .reverse()
        .map((call) => (
          <div key={call.id} className="rounded-lg border border-line bg-paper px-3 py-2">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-mono text-[11px] text-ink-soft">
                {call.model} · {call.provider}
              </span>
              <span
                className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${
                  call.status === "pending"
                    ? "bg-gold/10 text-gold"
                    : call.status === "success"
                      ? "bg-green/10 text-green"
                      : "bg-[#b95c3f]/10 text-[#b95c3f]"
                }`}
              >
                {call.status}
              </span>
            </div>
            <div className="text-[11px] text-ink-mute">
              {formatTime(call.startedAt)}
              {call.endedAt ? ` · ${Math.max(0, call.endedAt - call.startedAt)}ms` : ""}
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] text-ink-mute">payload</summary>
              <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded bg-card px-2 py-1.5 text-[11px] leading-relaxed text-ink-soft">
                {call.inputPreview}
              </pre>
            </details>
            {(call.outputPreview || call.error) && (
              <details className="mt-1">
                <summary className="cursor-pointer text-[11px] text-ink-mute">
                  {call.error ? "error" : "response"}
                </summary>
                <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded bg-card px-2 py-1.5 text-[11px] leading-relaxed text-ink-soft">
                  {call.error ?? call.outputPreview}
                </pre>
              </details>
            )}
          </div>
        ))}
    </div>
  );
}

export function BrainDumpLab() {
  const sessions = useQuery(api.brainDumps.list, {}) as BrainDumpSession[] | undefined;
  const createSession = useMutation(api.brainDumps.create);
  const updateEngine = useMutation(api.brainDumps.updateEngine);
  const deleteTranscriptEntry = useMutation(api.brainDumps.deleteTranscriptEntry);
  const deleteIdea = useMutation(api.brainDumps.deleteIdea);
  const processSentence = useAction(api.brainDumps.processSentence);
  const [activeId, setActiveId] = useState<Id<"brainDumpSessions"> | null>(null);
  const active = useQuery(
    api.brainDumps.get,
    activeId ? { sessionId: activeId } : "skip",
  ) as BrainDumpSession | null | undefined;

  const music = useMusic();
  const speech = useSpeechRecognition();
  const whisper = useWhisperRecorder();
  const canRecord = speech.supported || whisper.supported;
  const [recordingWanted, setRecordingWanted] = useState(false);
  const isRecording = recordingWanted || speech.listening || whisper.recording;

  const [debugOpen, setDebugOpen] = useState<"engine" | "calls" | "json" | null>(null);
  const [engineDraft, setEngineDraft] = useState<BrainDumpEngine>(DEFAULT_BRAIN_DUMP_ENGINE);
  const [savingEngine, setSavingEngine] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creatingRef = useRef(false);
  const activeIdRef = useRef<Id<"brainDumpSessions"> | null>(null);
  const processedOffsetRef = useRef(0);
  const liveCommittedRef = useRef("");
  const loggedWhisperTextRef = useRef("");
  const queuedTextRef = useRef<string[]>([]);
  const pausedMusicForRecordingRef = useRef(false);
  const pauseTimerRef = useRef<number | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const processingRef = useRef(false);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (sessions === undefined || activeId || creatingRef.current) return;
    if (sessions.length > 0) {
      setActiveId(sessions[0]._id);
      return;
    }
    creatingRef.current = true;
    void createSession({})
      .then((id) => setActiveId(id))
      .finally(() => {
        creatingRef.current = false;
      });
  }, [sessions, activeId, createSession]);

  useEffect(() => {
    if (!active?.engine) return;
    setEngineDraft(active.engine);
  }, [active?._id, active?.engine]);

  useEffect(() => {
    if (!whisper.activeDeviceLabel) return;
    clientLog("dump.mic.activeDevice", { label: whisper.activeDeviceLabel });
  }, [whisper.activeDeviceLabel]);

  useEffect(() => {
    const text = whisper.text.trim();
    if (!text || text === loggedWhisperTextRef.current) return;
    loggedWhisperTextRef.current = text;
    clientLog("dump.whisper.text", {
      words: wordCount(text),
      preview: text.slice(-240),
    });
  }, [whisper.text]);

  const drainQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    setError(null);

    try {
      while (queueRef.current.length > 0) {
        const item = queueRef.current.shift();
        setQueueSize(queueRef.current.length);
        if (!item) continue;
        await processSentence({
          sessionId: item.sessionId,
          text: item.text,
          source: item.source,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the graph.");
    } finally {
      processingRef.current = false;
      setProcessing(false);
      setQueueSize(queueRef.current.length);
    }
  }, [processSentence]);

  const enqueueSentence = useCallback(
    (text: string, source: "speech" | "typed") => {
      const sessionId = activeIdRef.current;
      const cleaned = cleanTranscriptBlock(text);
      if (!sessionId || !isSubstantialThought(cleaned)) {
        clientLog("dump.thought.skipped", { reason: "not_substantial", preview: cleaned.slice(0, 160) });
        return;
      }
      const existing = [...(active?.transcript ?? []).map((entry) => entry.text), ...queuedTextRef.current];
      if (isNearDuplicate(cleaned, existing)) {
        clientLog("dump.thought.skipped", { reason: "duplicate", preview: cleaned.slice(0, 160) });
        return;
      }
      queuedTextRef.current = [...queuedTextRef.current.slice(-24), cleaned];
      queueRef.current.push({ sessionId, text: cleaned, source });
      setQueueSize(queueRef.current.length);
      void drainQueue();
    },
    [active?.transcript, drainQueue],
  );

  const flushCommittedText = useCallback(
    (text: string, force: boolean) => {
      if (!force) return;
      const cleaned = cleanTranscriptBlock(text);
      processedOffsetRef.current = text.length;
      enqueueSentence(cleaned, "speech");
    },
    [enqueueSentence],
  );

  const speechLiveText = `${speech.finalText}${speech.interim ? ` ${speech.interim}` : ""}`.trim();
  const committedLiveText = speech.finalText.trim() || whisper.text.trim();
  const visibleLiveText = speechLiveText || whisper.text;

  useEffect(() => {
    if (!isRecording) return;
    liveCommittedRef.current = committedLiveText;
  }, [committedLiveText, isRecording]);

  useEffect(() => {
    if (!recordingWanted) return;
    const micError = whisper.error || speech.error;
    if (!micError) return;
    clientLog("dump.record.error", { micError });
    setRecordingWanted(false);
    try {
      speech.stop();
    } catch {
      // Already stopped.
    }
    if (whisper.recording) void whisper.stop().catch(() => {});
    if (pausedMusicForRecordingRef.current) {
      pausedMusicForRecordingRef.current = false;
      music.togglePlay();
    }
    setError(
      micError === "not-allowed" || micError === "service-not-allowed"
        ? "Microphone permission is blocked. Allow mic access in the browser and try again."
        : `Microphone stopped: ${micError}`,
    );
  }, [music, recordingWanted, speech, speech.error, whisper, whisper.error]);

  const startRecording = useCallback(async () => {
    clientLog("dump.record.click", {
      active: !!activeIdRef.current,
      canRecord,
      speechSupported: speech.supported,
      whisperSupported: whisper.supported,
    });
    if (!activeIdRef.current) {
      setError("Brain dump session is still opening.");
      return;
    }
    if (!canRecord) {
      setError("This browser is not exposing a microphone recorder.");
      return;
    }
    setError(null);
    if (music.playing) {
      pausedMusicForRecordingRef.current = true;
      music.togglePlay();
    } else {
      pausedMusicForRecordingRef.current = false;
    }
    setRecordingWanted(true);
    processedOffsetRef.current = 0;
    liveCommittedRef.current = "";
    loggedWhisperTextRef.current = "";
    speech.reset();
    whisper.reset();
    let whisperStarted = false;
    if (whisper.supported) {
      whisperStarted = await whisper.start();
      clientLog("dump.whisper.start", { ok: whisperStarted });
      if (!whisperStarted) {
        setRecordingWanted(false);
        if (pausedMusicForRecordingRef.current) {
          pausedMusicForRecordingRef.current = false;
          music.togglePlay();
        }
        setError("Microphone permission is blocked. Allow mic access in the browser and try again.");
        return;
      }
    }
    if (speech.supported) speech.start();
    clientLog("dump.record.started", {
      speechSupported: speech.supported,
      whisperSupported: whisper.supported,
      whisperStarted,
      pausedMusic: pausedMusicForRecordingRef.current,
    });
  }, [canRecord, music, speech, whisper]);

  const stopRecording = useCallback(async () => {
    clientLog("dump.record.stop");
    setRecordingWanted(false);
    if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
    const local = speech.supported ? speech.stop() : "";
    let remote = "";
    if (whisper.recording) {
      try {
        remote = await whisper.stop();
      } catch {
        remote = "";
      }
    }
    const finalText = remote.trim() || local.trim();
    clientLog("dump.record.final", {
      words: wordCount(finalText),
      source: remote.trim() ? "whisper" : "speech",
    });
    if (!finalText.trim()) setError("I did not catch any words. Check microphone permission and try again.");
    liveCommittedRef.current = finalText;
    flushCommittedText(finalText, true);
    if (pausedMusicForRecordingRef.current) {
      pausedMusicForRecordingRef.current = false;
      music.togglePlay();
    }
  }, [flushCommittedText, music, speech, whisper]);

  const createNewSession = useCallback(async () => {
    const id = await createSession({});
    setActiveId(id);
    processedOffsetRef.current = 0;
    liveCommittedRef.current = "";
    queuedTextRef.current = [];
  }, [createSession]);

  const saveEngine = useCallback(async () => {
    if (!activeId) return;
    setSavingEngine(true);
    try {
      await updateEngine({ sessionId: activeId, engine: engineDraft });
    } finally {
      setSavingEngine(false);
    }
  }, [activeId, engineDraft, updateEngine]);

  const removeTranscriptEntry = useCallback(
    async (entryId: string) => {
      if (!activeId) return;
      await deleteTranscriptEntry({ sessionId: activeId, entryId });
    },
    [activeId, deleteTranscriptEntry],
  );

  const removeIdea = useCallback(
    async (ideaId: string) => {
      if (!activeId) return;
      await deleteIdea({ sessionId: activeId, ideaId });
    },
    [activeId, deleteIdea],
  );

  const graph = active?.graph ?? emptyBrainDumpGraph();
  const transcript = active?.transcript ?? [];
  const aiCalls = active?.aiCalls ?? [];
  const pendingLabel =
    queueSize > 0 ? `${queueSize} queued` : processing ? "processing" : isRecording ? "listening" : "idle";

  return (
    <div className="flex h-full flex-col bg-paper">
      <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-line bg-card px-4 py-3 md:px-5">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ink-mute">
            <Braces className="h-3.5 w-3.5" />
            Experimental
          </div>
          <div className="truncate text-[20px] font-semibold tracking-tight text-ink">
            {active?.title ?? "Brain dump"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void createNewSession()}
            title="New brain dump"
            className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-card text-ink-soft transition hover:bg-paper-2"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[340px_minmax(0,1fr)_360px]">
        <aside className="flex min-h-0 flex-col border-r border-line bg-paper">
          <div className="border-b border-line px-4 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(sessions ?? []).map((session) => (
                <button
                  key={session._id}
                  type="button"
                  onClick={() => {
                    setActiveId(session._id);
                    processedOffsetRef.current = 0;
                    liveCommittedRef.current = "";
                  }}
                  className={`max-w-[190px] flex-shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                    activeId === session._id
                      ? "border-accent bg-card text-ink shadow-sm"
                      : "border-line bg-paper-2 text-ink-soft hover:bg-card"
                  }`}
                >
                  <div className="truncate text-[13px] font-medium">{session.title}</div>
                  <div className="mt-0.5 text-[11px] text-ink-mute">{formatTime(session.updatedAt)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
                  Recording
                </div>
                <div className="mt-0.5 text-[12px] text-ink-mute">{pendingLabel}</div>
              </div>
              <button
                type="button"
                onPointerDown={() => clientLog("dump.record.pointerdown", { isRecording })}
                onClick={() => (isRecording ? void stopRecording() : void startRecording())}
                disabled={!activeId || !canRecord}
                title={isRecording ? "Stop" : "Record"}
                className={`grid h-11 w-11 place-items-center rounded-full border transition disabled:opacity-40 ${
                  isRecording
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-line bg-card text-ink-soft hover:bg-paper-2"
                }`}
              >
                {isRecording ? (
                  <Square className="h-4 w-4" fill="currentColor" strokeWidth={0} />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>
            </div>
            {!canRecord && (
              <div className="border-b border-line px-4 pb-3 text-[12px] leading-relaxed text-gold">
                Browser mic recording is unavailable here.
              </div>
            )}
            {whisper.supported && (
              <div className="border-b border-line px-4 py-2">
                <div className="flex items-center gap-2">
                  <select
                    value={whisper.deviceId}
                    onFocus={() => void whisper.refreshDevices()}
                    onChange={(event) => whisper.setDeviceId(event.target.value)}
                    disabled={isRecording}
                    title="Microphone input"
                    className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-1.5 text-[12px] text-ink-soft outline-none transition focus:border-accent disabled:opacity-60"
                  >
                    <option value="default">Default microphone</option>
                    {whisper.devices.map((device, index) => (
                      <option key={device.deviceId || index} value={device.deviceId}>
                        {device.label || `Microphone ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
                {whisper.activeDeviceLabel && (
                  <div className="mt-1 truncate text-[11px] text-ink-mute">
                    {whisper.activeDeviceLabel}
                  </div>
                )}
              </div>
            )}

            <div className="border-b border-line px-4 py-3">
              <div className="rounded-lg border border-line bg-card px-3 py-3">
                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-ink-mute">
                  <span>Mic input</span>
                  <span>{Math.round(whisper.level * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-gold transition-[width] duration-100"
                    style={{ width: `${Math.min(100, Math.round(whisper.level * 100))}%` }}
                  />
                </div>
                {isRecording && (
                  <div className="mt-3 border-t border-line pt-2">
                    <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-gold">
                      <span className="h-2 w-2 rounded-full bg-gold" />
                      Live
                    </div>
                    <div className="line-clamp-4 break-words text-[13px] leading-relaxed text-ink-soft">
                      {visibleLiveText || "Listening"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="border-t border-line bg-card px-4 py-2 text-[12px] leading-relaxed text-gold">
                {error}
              </div>
            )}

            <IdeaCards graph={graph} onDeleteIdea={(ideaId) => void removeIdea(ideaId)} />
          </div>
        </aside>

        <section className="relative min-h-0">
          <ThoughtMap graph={graph} />
        </section>

        <aside className="flex min-h-0 flex-col border-l border-line bg-paper">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
                Transcript
              </div>
              <div className="mt-0.5 text-[12px] text-ink-mute">{transcript.length}</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
            <div className="flex flex-col gap-2.5">
              {transcript.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-line bg-card px-3 py-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-ink-mute">
                      {entry.source}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {entry.status === "pending" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
                      ) : entry.status === "processed" ? (
                        <Check className="h-3.5 w-3.5 text-green" />
                      ) : (
                        <span className="text-[11px] text-gold">fallback</span>
                      )}
                      <button
                        type="button"
                        onClick={() => void removeTranscriptEntry(entry.id)}
                        title="Delete transcript"
                        className="grid h-7 w-7 place-items-center rounded-lg text-ink-mute transition hover:bg-paper-2 hover:text-gold"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="break-words text-[13.5px] leading-relaxed text-ink-soft">
                    {entry.text}
                  </div>
                </div>
              ))}
              {isRecording && (
                <div className="rounded-lg border border-dashed border-gold/70 bg-card/70 px-3 py-2">
                  <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-gold">
                    <span className="h-2 w-2 rounded-full bg-gold" />
                    Live
                  </div>
                  <div className="break-words text-[13.5px] leading-relaxed text-ink-soft">
                    {visibleLiveText || "Listening"}
                  </div>
                </div>
              )}
              {!isRecording && transcript.length === 0 && (
                <div className="py-8 text-center text-[13px] text-ink-mute">No transcript yet</div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0">
            <DebugAccordion
              label="Engine"
              open={debugOpen === "engine"}
              onToggle={() => setDebugOpen((open) => (open === "engine" ? null : "engine"))}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <ProviderSegment
                    value={engineDraft.provider}
                    onChange={(provider) => setEngineDraft((draft) => ({ ...draft, provider }))}
                  />
                  <button
                    type="button"
                    onClick={() => void saveEngine()}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-[13px] text-white transition hover:opacity-90"
                  >
                    {savingEngine ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                  </button>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] text-ink-mute">Model</span>
                  <input
                    value={engineDraft.model}
                    onChange={(event) =>
                      setEngineDraft((draft) => ({ ...draft, model: event.target.value }))
                    }
                    className="h-10 rounded-lg border border-line bg-paper px-3 font-mono text-[13px] text-ink outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] text-ink-mute">Temperature</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={engineDraft.temperature}
                    onChange={(event) =>
                      setEngineDraft((draft) => ({
                        ...draft,
                        temperature: Number(event.target.value),
                      }))
                    }
                    className="accent-[#1E3A5F]"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] text-ink-mute">System prompt</span>
                  <textarea
                    value={engineDraft.systemPrompt}
                    onChange={(event) =>
                      setEngineDraft((draft) => ({ ...draft, systemPrompt: event.target.value }))
                    }
                    rows={7}
                    className="resize-none rounded-lg border border-line bg-paper px-3 py-2 font-mono text-[12px] leading-relaxed text-ink outline-none focus:border-accent"
                  />
                </label>
              </div>
            </DebugAccordion>

            <DebugAccordion
              label="Model calls"
              open={debugOpen === "calls"}
              onToggle={() => setDebugOpen((open) => (open === "calls" ? null : "calls"))}
            >
              <ModelCallsPanel calls={aiCalls} />
            </DebugAccordion>

            <DebugAccordion
              label="Raw JSON"
              open={debugOpen === "json"}
              onToggle={() => setDebugOpen((open) => (open === "json" ? null : "json"))}
            >
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[#10141c] px-3 py-2 text-[11px] leading-relaxed text-white/80">
                {JSON.stringify(graph, null, 2)}
              </pre>
            </DebugAccordion>
          </div>
        </aside>
      </div>
    </div>
  );
}
