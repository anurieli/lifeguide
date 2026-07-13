"use client";

import { createContext, useContext, ReactNode } from "react";
import { AccountMenu, View } from "./Rail";

// The shell's navigation, reachable from any surface without threading setView
// through every component between AppShell and a page heading.
const ShellNavContext = createContext<(v: View) => void>(() => {});

export function ShellNavProvider({
  onNav,
  children,
}: {
  onNav: (v: View) => void;
  children: ReactNode;
}) {
  return <ShellNavContext.Provider value={onNav}>{children}</ShellNavContext.Provider>;
}

/** The heading row every surface shares. The page's own title block goes on the
    left, its actions on the right — and on mobile the account avatar is baked
    into the far right of the row itself, one instance per heading, so every
    button has a fixed place (the old fixed-corner overlay floated over
    per-page actions like the Thoughts "Select"). On desktop the avatar lives
    at the foot of the rail, so it's hidden here. */
export function PageHeader({
  children,
  actions,
  align = "items-center",
  className = "",
}: {
  /** The title block: eyebrow / heading / anything the page puts top-left. */
  children: ReactNode;
  /** The page's own buttons, kept left of the avatar. */
  actions?: ReactNode;
  align?: "items-center" | "items-start" | "items-end";
  className?: string;
}) {
  const onNav = useContext(ShellNavContext);
  return (
    <div className={`flex ${align} justify-between gap-3 ${className}`}>
      <div className="min-w-0">{children}</div>
      <div className="flex items-center gap-3 shrink-0">
        {actions}
        <div className="md:hidden">
          <AccountMenu onNav={onNav} placement="corner" />
        </div>
      </div>
    </div>
  );
}
