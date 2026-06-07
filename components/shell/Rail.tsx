"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sun,
  Gem,
  LayoutGrid,
  BrainCircuit,
  Mic,
  Settings as SettingsIcon,
  User,
  LogOut,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";

export type View = "today" | "core" | "board" | "dump" | "settings";

const ITEMS: { key: View; label: string; Icon: typeof Sun }[] = [
  { key: "today", label: "Today", Icon: Sun },
  { key: "core", label: "Core", Icon: Gem },
  { key: "board", label: "Board", Icon: LayoutGrid },
  { key: "dump", label: "Dump", Icon: BrainCircuit },
];

// One nav target. Vertical pill on the desktop rail; an evenly-spread tab on the
// mobile bottom bar (where it flexes to fill the row).
function NavButton({
  Icon,
  label,
  active,
  onClick,
}: {
  Icon: typeof Sun;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 md:flex-none flex-col items-center justify-center gap-1 rounded-2xl text-[10.5px] transition h-[52px] md:w-[60px] md:h-[58px] ${
        active
          ? "bg-accent text-white"
          : "text-ink-mute hover:bg-paper-2 hover:text-ink-soft"
      }`}
    >
      <Icon className="w-[21px] h-[21px]" strokeWidth={2} />
      {label}
    </button>
  );
}

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

export function Rail({
  view,
  onNav,
  onSpeak,
}: {
  view: View;
  onNav: (v: View) => void;
  onSpeak: () => void;
}) {
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
    <div className="fixed bottom-0 inset-x-0 h-[64px] flex-row items-center px-2 border-t border-line z-50 md:static md:inset-auto md:w-[84px] md:h-screen md:flex-col md:items-center md:py-[18px] md:px-0 md:border-t-0 md:border-r md:flex-shrink-0 bg-card flex">
      <div className="hidden md:block font-extrabold text-xl text-ink mb-7">L</div>
      <div className="flex flex-1 flex-row md:flex-col gap-1 md:gap-1.5 items-center justify-around md:justify-start">
        {ITEMS.map(({ key, label, Icon }) => (
          <NavButton
            key={key}
            Icon={Icon}
            label={label}
            active={view === key}
            onClick={() => onNav(key)}
          />
        ))}
        {/* Talk lives in the bottom bar on mobile — the Listener is one tap from anywhere.
            On desktop the talk button is the floating dock's primary action, so this is hidden. */}
        <div className="md:hidden flex-1 flex">
          <NavButton Icon={Mic} label="Talk" active={false} onClick={onSpeak} />
        </div>
      </div>

      <div ref={anchorRef} className="relative flex items-center">
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
          <div className="absolute right-0 bottom-[120%] md:left-[48px] md:right-auto md:bottom-0 w-44 bg-card border border-line rounded-xl shadow-xl py-1.5 z-[60]">
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
