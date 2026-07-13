import { useEffect, useState } from "react";

// The phone/desktop cutoff shared with `currentDevice()` (Tailwind's `md`).
const MOBILE_MAX = 767;

/**
 * True on phone-width viewports. SSR-safe: renders `false` on the server and the
 * first client paint (so hydration agrees), then flips to the real value on mount
 * and tracks resizes / orientation changes.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}
