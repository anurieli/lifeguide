"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Rail, View } from "./Rail";
import { Today } from "@/components/today/Today";
import { Whiteboard } from "@/components/whiteboard/Whiteboard";
import { Guide } from "@/components/guide/Guide";
import { Settings } from "@/components/settings/Settings";
import { CoachDock } from "@/components/coach/CoachDock";

export function AppShell({ surfaceId }: { surfaceId: Id<"surfaces"> }) {
  const [view, setView] = useState<View>("today");

  return (
    <div className="flex h-screen bg-paper overflow-hidden">
      <Rail view={view} onNav={setView} />
      <main className="flex-1 relative h-screen overflow-hidden">
        {/* Board stays mounted so canvas state (viewport, in-flight edits) survives nav. */}
        <div className={view === "board" ? "absolute inset-0" : "hidden"}>
          <Whiteboard surfaceId={surfaceId} />
        </div>
        {view === "today" && <Today onNavigate={setView} />}
        {view === "guide" && <Guide />}
        {view === "settings" && <Settings />}
      </main>
      <CoachDock view={view} surfaceId={surfaceId} />
    </div>
  );
}
