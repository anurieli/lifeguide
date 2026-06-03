"use client";

import { Sun, Gem, LayoutGrid, Compass, Settings as SettingsIcon } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";

export type View = "today" | "core" | "board" | "guide" | "settings";

const ITEMS: { key: View; label: string; Icon: typeof Sun }[] = [
  { key: "today", label: "Today", Icon: Sun },
  { key: "core", label: "Core", Icon: Gem },
  { key: "board", label: "Board", Icon: LayoutGrid },
  { key: "guide", label: "Guide", Icon: Compass },
  { key: "settings", label: "Settings", Icon: SettingsIcon },
];

export function Rail({ view, onNav }: { view: View; onNav: (v: View) => void }) {
  const { signOut } = useAuthActions();
  return (
    <div className="w-[84px] h-screen bg-card border-r border-line flex flex-col items-center py-[18px] z-50 flex-shrink-0">
      <div className="font-extrabold text-xl text-ink mb-7">L</div>
      <div className="flex flex-col gap-1.5 flex-1">
        {ITEMS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onNav(key)}
            className={`w-[60px] h-[58px] rounded-2xl flex flex-col items-center justify-center gap-1 text-[10.5px] transition ${
              view === key
                ? "bg-accent text-white"
                : "text-ink-mute hover:bg-paper-2 hover:text-ink-soft"
            }`}
          >
            <Icon className="w-[21px] h-[21px]" strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>
      <button
        onClick={() => void signOut()}
        title="Sign out"
        className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2A3344] to-[#4A5670] text-white font-semibold text-sm flex items-center justify-center hover:opacity-90 transition"
      >
        A
      </button>
    </div>
  );
}
