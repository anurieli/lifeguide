"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sun,
  Gem,
  LayoutGrid,
  NotebookPen,
  PenLine,
  Plus,
  Settings as SettingsIcon,
  User,
  LogOut,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";

export type View = "today" | "core" | "board" | "sessions" | "settings";

// Thoughts and Sessions merged into one surface (ADR 0010). The tab is labeled
// Thoughts — the entries underneath are still sessions — with the booklet icon
// (a session is a booklet).
const ITEMS: { key: View; label: string; Icon: typeof Sun }[] = [
  { key: "today", label: "Today", Icon: Sun },
  { key: "core", label: "Core", Icon: Gem },
  { key: "board", label: "Board", Icon: LayoutGrid },
  { key: "sessions", label: "Thoughts", Icon: NotebookPen },
];

const item = (key: View) => ITEMS.find((i) => i.key === key)!;

// A desktop rail pill. Active is the solid accent block; the rail has room for it.
function RailButton({
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
      className={`flex flex-col items-center justify-center gap-1 rounded-2xl text-[10.5px] transition w-[60px] h-[58px] ${
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

// A phone bar tab. Active is a light tint only: on the bar, the ➕ is the one
// dark element; a solid accent tab would read as a slab across the row.
function BarTab({
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
      className={`flex flex-col items-center justify-center gap-1 rounded-2xl text-[10.5px] h-[52px] mx-1 transition ${
        active ? "bg-accent/10 text-accent" : "text-ink-mute"
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

// The avatar + its popup. Self-contained so the mobile bar and the desktop rail
// can each mount their own without sharing anchor refs across breakpoints.
function AccountMenu({
  onNav,
  opensUpward,
}: {
  onNav: (v: View) => void;
  opensUpward: boolean;
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
        <div
          className={`absolute w-44 bg-card border border-line rounded-xl shadow-xl py-1.5 z-[60] ${
            opensUpward ? "right-0 bottom-[120%]" : "left-[48px] bottom-0"
          }`}
        >
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
  );
}

export function Rail({
  view,
  onNav,
  onRecord,
}: {
  view: View;
  onNav: (v: View) => void;
  onRecord: () => void;
}) {
  return (
    <>
      {/* Phone: a five-slot bottom bar, evenly spread so the ➕ sits dead center:
          Today · Board · ➕ · Thoughts · account. Core is desktop-only. */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-[calc(64px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] grid grid-cols-5 items-center px-1 border-t border-line bg-card z-50">
        {(["today", "board"] as const).map((key) => {
          const { label, Icon } = item(key);
          return (
            <BarTab
              key={key}
              Icon={Icon}
              label={label}
              active={view === key}
              onClick={() => onNav(key)}
            />
          );
        })}
        {/* One tap, a fresh entry: the phone's main action, raised above the bar. */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onRecord}
            aria-label="Think out loud"
            className="-translate-y-4 w-16 h-16 rounded-full bg-accent text-white shadow-lg flex items-center justify-center active:scale-95 transition"
          >
            <Plus className="w-8 h-8" strokeWidth={2.25} />
          </button>
        </div>
        <BarTab
          Icon={item("sessions").Icon}
          label={item("sessions").label}
          active={view === "sessions"}
          onClick={() => onNav("sessions")}
        />
        <div className="flex justify-center">
          <AccountMenu onNav={onNav} opensUpward />
        </div>
      </div>

      {/* Desktop: the vertical left rail. The scribbler pen is the same main
          action as the phone's ➕: one click, a fresh entry, ready to type or
          speak into. Hover says what it's for. */}
      <div className="hidden md:flex w-[84px] h-screen flex-col items-center py-[18px] border-r border-line bg-card flex-shrink-0">
        <div className="font-extrabold text-xl text-ink mb-7">L</div>
        <div className="flex flex-1 flex-col gap-1.5 items-center">
          {ITEMS.map(({ key, label, Icon }) => (
            <RailButton
              key={key}
              Icon={Icon}
              label={label}
              active={view === key}
              onClick={() => onNav(key)}
            />
          ))}
          <button
            type="button"
            onClick={onRecord}
            aria-label="Think out loud"
            title="Think out loud"
            className="mt-2 w-12 h-12 rounded-full bg-accent text-white shadow-md flex items-center justify-center hover:opacity-90 active:scale-95 transition"
          >
            <PenLine className="w-[22px] h-[22px]" strokeWidth={2.25} />
          </button>
        </div>
        <AccountMenu onNav={onNav} opensUpward={false} />
      </div>
    </>
  );
}
