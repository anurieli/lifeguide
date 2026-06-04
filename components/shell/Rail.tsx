"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sun,
  Gem,
  LayoutGrid,
  Settings as SettingsIcon,
  User,
  LogOut,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";

export type View = "today" | "core" | "board" | "settings";

const ITEMS: { key: View; label: string; Icon: typeof Sun }[] = [
  { key: "today", label: "Today", Icon: Sun },
  { key: "core", label: "Core", Icon: Gem },
  { key: "board", label: "Board", Icon: LayoutGrid },
];

function MenuItem({
  Icon,
  label,
  onClick,
  danger,
}: {
  Icon: typeof Sun;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13.5px] text-left transition hover:bg-paper-2 ${
        danger ? "text-red-500" : "text-ink-soft"
      }`}
    >
      <Icon className="w-4 h-4" strokeWidth={2} />
      {label}
    </button>
  );
}

export function Rail({ view, onNav }: { view: View; onNav: (v: View) => void }) {
  const { signOut } = useAuthActions();
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  // Close the account menu on any click outside it (incl. the trigger toggling itself).
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

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

      <div ref={anchorRef} className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          title="Account"
          className={`w-9 h-9 rounded-full bg-gradient-to-br from-[#2A3344] to-[#4A5670] text-white font-semibold text-sm flex items-center justify-center transition ${
            menuOpen ? "ring-2 ring-accent/60" : "hover:opacity-90"
          }`}
        >
          A
        </button>

        {menuOpen && (
          <div className="absolute left-[48px] bottom-0 w-44 bg-card border border-line rounded-xl shadow-xl py-1.5 z-[60]">
            <div className="px-3 pt-1 pb-1.5 text-[11px] tracking-[0.14em] uppercase text-ink-mute">
              You
            </div>
            <MenuItem
              Icon={SettingsIcon}
              label="Settings"
              onClick={() => {
                onNav("settings");
                setMenuOpen(false);
              }}
            />
            <MenuItem
              Icon={User}
              label="Account"
              onClick={() => {
                onNav("settings");
                setMenuOpen(false);
              }}
            />
            <div className="h-px bg-line my-1" />
            <MenuItem
              Icon={LogOut}
              label="Sign out"
              danger
              onClick={() => void signOut()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
