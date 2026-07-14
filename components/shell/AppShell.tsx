"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Rail, View } from "./Rail";
import { ShellNavProvider } from "./PageHeader";
import { Today } from "@/components/today/Today";
import { Goals } from "@/components/goals/Goals";
import { Core } from "@/components/core/Core";
import { Whiteboard } from "@/components/whiteboard/Whiteboard";
import { MobileBoard } from "@/components/whiteboard/MobileBoard";
import { Settings } from "@/components/settings/Settings";
import { CoachDock } from "@/components/coach/CoachDock";
import { SpeakSurface } from "@/components/voice/SpeakSurface";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { MusicProvider } from "@/components/music/MusicProvider";
import { AtmospherePlayer } from "@/components/music/AtmospherePlayer";
import { Sessions } from "@/components/sessions/Sessions";
import { RecordingProvider, useRecording } from "@/components/sessions/RecordingProvider";
import { currentDevice, formatElapsed } from "@/components/thoughts/utils";
import { useIsMobile } from "@/hooks/useIsMobile";

const VIEW_STORAGE_KEY = "lifeguide.activeView";
const VIEWS: View[] = ["today", "core", "board", "goals", "sessions", "settings"];

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
  const isMobile = useIsMobile();

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

  // The entry currently on screen, when it holds nothing at all — no captures,
  // no take saving into it. The ➕ inside it must not spawn a second empty note.
  // Convex dedupes this subscription with SessionDoc's own identical one.
  const activeDoc = useQuery(
    api.sessions.get,
    view === "sessions" && activeSessionId ? { sessionId: activeSessionId } : "skip",
  );
  const emptyActiveEntry =
    view === "sessions" &&
    activeSessionId !== null &&
    activeDoc != null &&
    activeDoc.captures.length === 0 &&
    !rec.pendingTakes.some((t) => t.sessionId === activeSessionId) &&
    !rec.failedTakes.some((t) => t.sessionId === activeSessionId)
      ? activeSessionId
      : null;

  // The pen/➕ flow: every tap starts a FRESH entry and lands inside its empty
  // document — except from inside an entry that is still empty, which it reuses
  // (a twin empty note would be indistinguishable). On the phone it's already
  // recording; on desktop the mic waits one click away (keyboard-first, and
  // auto-arming the mic would throw a permission prompt in the person's face).
  // Appending to an old entry goes through the list. The take itself lives in
  // RecordingProvider, so it keeps running wherever the person navigates next.
  const startSession = async () => {
    clientLog("session.start", { view });
    const device = currentDevice();
    if (emptyActiveEntry) {
      if (device === "phone") void rec.start(emptyActiveEntry);
      return;
    }
    const created = createSession({ device });
    // Mic first: on the phone the take starts while the entry is still being
    // created server-side, so the first words never wait on the round-trip.
    if (device === "phone") void rec.start(created);
    try {
      const id = await created;
      setActiveSessionId(id);
      setView("sessions");
    } catch {
      if (device === "phone") void rec.cancel();
    }
  };

  // ➕ + swipe-up: quick record. The mic arms the instant the gesture commits —
  // on any device, since the swipe is an explicit ask to record — while the
  // entry is created and its document loaded in the background. Inside an empty
  // note the take just lands there; no new note.
  const quickRecord = () => {
    clientLog("session.quickrecord", { view });
    if (emptyActiveEntry) {
      void rec.start(emptyActiveEntry);
      return;
    }
    const created = createSession({ device: currentDevice() });
    void rec.start(created);
    created
      .then((id) => {
        setActiveSessionId(id);
        setView("sessions");
      })
      .catch(() => void rec.cancel());
  };

  const jumpToRecording = () => {
    if (!rec.sessionId) return;
    setActiveSessionId(rec.sessionId);
    setView("sessions");
  };

  const viewingLiveEntry = view === "sessions" && activeSessionId === rec.sessionId;

  // One nav for the rail, the bottom bar, and every page heading's account menu.
  const nav = (v: View) => {
    // The Sessions tab always shows the list, even from inside an entry.
    if (v === "sessions") setActiveSessionId(null);
    setView(v);
  };

  return (
    <div className="flex h-[100dvh] bg-paper overflow-hidden">
      <Rail
        view={view}
        onNav={nav}
        onRecord={() => void startSession()}
        onQuickRecord={quickRecord}
      />
      {/* Leave room for the fixed bottom bar on mobile (plus the phone's safe-area
          inset, so a home-indicator PWA doesn't clip content); full height on desktop. */}
      {/* ShellNavProvider feeds every page heading's baked-in account menu (see
          PageHeader.tsx) — on mobile the avatar lives inside each heading row,
          not floating over it. */}
      <main className="flex-1 relative h-[calc(100dvh-64px-env(safe-area-inset-bottom))] md:h-screen overflow-hidden">
        <ShellNavProvider onNav={nav}>
          {/* On a phone the board is a plain vertical list (no pan/zoom canvas). On
              desktop the spatial board stays mounted so canvas state (viewport,
              in-flight edits) survives nav; `active` tells it when it's on screen. */}
          {isMobile ? (
            view === "board" && <MobileBoard surfaceId={surfaceId} />
          ) : (
            <div className={view === "board" ? "absolute inset-0" : "hidden"}>
              <Whiteboard surfaceId={surfaceId} active={view === "board"} />
            </div>
          )}
          {view === "today" && <Today onNavigate={setView} />}
          {view === "core" && <Core />}
          {view === "goals" && <Goals onNavigate={setView} />}
          {view === "sessions" && (
            <Sessions
              activeSessionId={activeSessionId}
              onOpenSession={setActiveSessionId}
              onNew={() => void startSession()}
              onQuickRecord={quickRecord}
            />
          )}
          {view === "settings" && <Settings />}
        </ShellNavProvider>
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
      {/* The open thought document is pure capture: the Coach window and its
          floating buttons step aside there (Ariel, 2026-07-13, second pass). */}
      <CoachDock
        view={view}
        surfaceId={surfaceId}
        open={coachOpen}
        onToggle={() => setCoachOpen((o) => !o)}
        onSpeak={openSpeak}
        stepAside={view === "sessions" && activeSessionId !== null}
      />
      <FeedbackWidget view={view} coachOpen={coachOpen} />
      {/* Atmosphere: ambient music, desktop only. The phone stays capture-first. */}
      <div className="hidden md:block">
        <AtmospherePlayer />
      </div>
      {/* The Listener: always-available voice. Opens full-screen over everything. */}
      {speakOpen && <SpeakSurface onClose={() => setSpeakOpen(false)} />}
    </div>
  );
}
