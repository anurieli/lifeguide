"use client";

import { useEffect, useState } from "react";
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
import { ThoughtStream } from "@/components/thoughts/ThoughtStream";
import { Sessions } from "@/components/sessions/Sessions";
import { RecordTake } from "@/components/sessions/RecordTake";

const VIEW_STORAGE_KEY = "lifeguide.activeView";
const VIEWS: View[] = ["today", "core", "board", "dump", "sessions", "settings"];

function clientLog(event: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  void fetch("/api/client-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, meta }),
  }).catch(() => {});
}

export function AppShell({ surfaceId }: { surfaceId: Id<"surfaces"> }) {
  const [view, setView] = useState<View>("today");
  // Coach text dock open state (desktop secondary). The Listener voice call is the
  // primary way in — it opens as a full-screen surface.
  const [coachOpen, setCoachOpen] = useState(false);
  const [speakOpen, setSpeakOpen] = useState(false);
  // The one-tap take overlay (mobile ● button) and the open entry in the Sessions view.
  const [recordOpen, setRecordOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<Id<"sessions"> | null>(null);

  // Restore the last-viewed tab after mount. Done in an effect (not a lazy
  // useState initializer) so server and first client render agree — reading
  // localStorage during render would cause a hydration mismatch.
  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved && VIEWS.includes(saved as View)) setView(saved as View);
  }, []);

  // Remember the active tab so a refresh returns here instead of Today.
  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  const openSpeak = () => {
    clientLog("talk.open", { view });
    setSpeakOpen(true);
  };

  return (
    <MusicProvider>
      <div className="flex h-[100dvh] bg-paper overflow-hidden">
        <Rail
          view={view}
          onNav={setView}
          onSpeak={openSpeak}
          onRecord={() => setRecordOpen(true)}
        />
        {/* Leave room for the fixed bottom bar on mobile; full height on desktop. */}
        <main className="flex-1 relative h-[calc(100dvh-64px)] md:h-screen overflow-hidden">
          {/* Board stays mounted so canvas state (viewport, in-flight edits) survives nav. */}
          <div className={view === "board" ? "absolute inset-0" : "hidden"}>
            <Whiteboard surfaceId={surfaceId} />
          </div>
          {view === "today" && <Today onNavigate={setView} />}
          {view === "core" && <Core />}
          {view === "dump" && <ThoughtStream />}
          {view === "sessions" && (
            <Sessions activeSessionId={activeSessionId} onOpenSession={setActiveSessionId} />
          )}
          {view === "settings" && <Settings />}
        </main>
        <CoachDock
          view={view}
          surfaceId={surfaceId}
          open={coachOpen}
          onToggle={() => setCoachOpen((o) => !o)}
          onSpeak={openSpeak}
        />
        <FeedbackWidget view={view} />
        {/* Atmosphere: ambient music, always at the ready across the app. */}
        <AtmospherePlayer />
        {/* The Listener: always-available voice. Opens full-screen over everything. */}
        {speakOpen && <SpeakSurface onClose={() => setSpeakOpen(false)} />}
        {/* The one-tap take: silent capture into a new session, then its document view. */}
        {recordOpen && (
          <RecordTake
            onClose={() => setRecordOpen(false)}
            onDone={(sessionId) => {
              setRecordOpen(false);
              setActiveSessionId(sessionId);
              setView("sessions");
            }}
          />
        )}
      </div>
    </MusicProvider>
  );
}
