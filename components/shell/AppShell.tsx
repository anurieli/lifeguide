"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Rail, View } from "./Rail";
import { Today } from "@/components/today/Today";
import { Core } from "@/components/core/Core";
import { Whiteboard } from "@/components/whiteboard/Whiteboard";
import { Settings } from "@/components/settings/Settings";
import { CoachDock } from "@/components/coach/CoachDock";
import { SpeakSurface } from "@/components/voice/SpeakSurface";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { MusicProvider } from "@/components/music/MusicProvider";
import { AtmospherePlayer } from "@/components/music/AtmospherePlayer";
import { Sessions } from "@/components/sessions/Sessions";
import { RecordingProvider, useRecording } from "@/components/sessions/RecordingProvider";
import { currentDevice, formatElapsed } from "@/components/thoughts/utils";

const VIEW_STORAGE_KEY = "lifeguide.activeView";
const VIEWS: View[] = ["today", "core", "board", "sessions", "settings"];

function clientLog(event: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  void fetch("/api/client-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, meta }),
  }).catch(() => {});
}

export function AppShell({ surfaceId }: { surfaceId: Id<"surfaces"> }) {
  return (
    <MusicProvider>
      <RecordingProvider>
        <Shell surfaceId={surfaceId} />
      </RecordingProvider>
    </MusicProvider>
  );
}

function Shell({ surfaceId }: { surfaceId: Id<"surfaces"> }) {
  const [view, setView] = useState<View>("today");
  // Coach text dock open state (desktop secondary). The Listener voice call is the
  // primary way in — it opens as a full-screen surface.
  const [coachOpen, setCoachOpen] = useState(false);
  const [speakOpen, setSpeakOpen] = useState(false);
  // The open entry in the Sessions view.
  const [activeSessionId, setActiveSessionId] = useState<Id<"sessions"> | null>(null);
  const createSession = useMutation(api.sessions.create);
  const rec = useRecording();

  // Restore the last-viewed tab after mount. Done in an effect (not a lazy
  // useState initializer) so server and first client render agree — reading
  // localStorage during render would cause a hydration mismatch.
  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    // "dump" was the retired flat-stream tab; its home is the Thoughts surface now.
    if (saved === "dump") setView("sessions");
    else if (saved && VIEWS.includes(saved as View)) setView(saved as View);
  }, []);

  // Remember the active tab so a refresh returns here instead of Today.
  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  const openSpeak = () => {
    clientLog("talk.open", { view });
    setSpeakOpen(true);
  };

  // The pen/➕ flow: every tap starts a FRESH entry and lands inside its empty
  // document. On the phone it's already recording; on desktop the mic waits one
  // click away (keyboard-first, and auto-arming the mic would throw a permission
  // prompt in the person's face). Appending to an old entry goes through the list.
  // The take itself lives in RecordingProvider, so it keeps running wherever
  // the person navigates next.
  const startSession = async () => {
    clientLog("session.start", { view });
    const device = currentDevice();
    const id = await createSession({ device });
    setActiveSessionId(id);
    setView("sessions");
    if (device === "phone") void rec.start(id);
  };

  const jumpToRecording = () => {
    if (!rec.sessionId) return;
    setActiveSessionId(rec.sessionId);
    setView("sessions");
  };

  const viewingLiveEntry = view === "sessions" && activeSessionId === rec.sessionId;

  return (
    <div className="flex h-[100dvh] bg-paper overflow-hidden">
      <Rail
        view={view}
        onNav={(v) => {
          // The Sessions tab always shows the list, even from inside an entry.
          if (v === "sessions") setActiveSessionId(null);
          setView(v);
        }}
        onRecord={() => void startSession()}
      />
      {/* Leave room for the fixed bottom bar on mobile; full height on desktop. */}
      <main className="flex-1 relative h-[calc(100dvh-64px)] md:h-screen overflow-hidden">
        {/* Board stays mounted so canvas state (viewport, in-flight edits) survives nav;
            `active` tells it when it's the surface on screen (each access re-centers). */}
        <div className={view === "board" ? "absolute inset-0" : "hidden"}>
          <Whiteboard surfaceId={surfaceId} active={view === "board"} />
        </div>
        {view === "today" && <Today onNavigate={setView} />}
        {view === "core" && <Core />}
        {view === "sessions" && (
          <Sessions
            activeSessionId={activeSessionId}
            onOpenSession={setActiveSessionId}
            onNew={() => void startSession()}
          />
        )}
        {view === "settings" && <Settings />}
      </main>
      {/* A take recording in the background: one quiet pill that leads back to it. */}
      {rec.sessionId && !viewingLiveEntry && (
        <button
          type="button"
          onClick={jumpToRecording}
          aria-label="Back to the live recording"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 bg-card border border-line rounded-full shadow-lg px-3.5 py-2"
        >
          <span
            className={`w-2 h-2 rounded-full bg-gold ${rec.paused ? "" : "animate-pulse"}`}
          />
          <span className="text-[12.5px] tabular-nums text-ink-soft">
            {formatElapsed(rec.elapsedMs)}
          </span>
          <span className="text-[11.5px] text-ink-mute">
            {rec.paused ? "Paused" : "Recording"}
          </span>
        </button>
      )}
      <CoachDock
        view={view}
        surfaceId={surfaceId}
        open={coachOpen}
        onToggle={() => setCoachOpen((o) => !o)}
        onSpeak={openSpeak}
      />
      <FeedbackWidget view={view} />
      {/* Atmosphere: ambient music, desktop only. The phone stays capture-first. */}
      <div className="hidden md:block">
        <AtmospherePlayer />
      </div>
      {/* The Listener: always-available voice. Opens full-screen over everything. */}
      {speakOpen && <SpeakSurface onClose={() => setSpeakOpen(false)} />}
    </div>
  );
}
