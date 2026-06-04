"use client";

import { useEffect, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Rail, View } from "./Rail";
import { Today } from "@/components/today/Today";
import { Core } from "@/components/core/Core";
import { Whiteboard } from "@/components/whiteboard/Whiteboard";
import { Settings } from "@/components/settings/Settings";
import { CoachDock } from "@/components/coach/CoachDock";

const VIEW_STORAGE_KEY = "lifeguide.activeView";
const VIEWS: View[] = ["today", "core", "board", "settings"];

export function AppShell({ surfaceId }: { surfaceId: Id<"surfaces"> }) {
  const [view, setView] = useState<View>("today");

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

  return (
    <div className="flex h-screen bg-paper overflow-hidden">
      <Rail view={view} onNav={setView} />
      <main className="flex-1 relative h-screen overflow-hidden">
        {/* Board stays mounted so canvas state (viewport, in-flight edits) survives nav. */}
        <div className={view === "board" ? "absolute inset-0" : "hidden"}>
          <Whiteboard surfaceId={surfaceId} />
        </div>
        {view === "today" && <Today onNavigate={setView} />}
        {view === "core" && <Core />}
        {view === "settings" && <Settings />}
      </main>
      <CoachDock view={view} surfaceId={surfaceId} />
    </div>
  );
}
