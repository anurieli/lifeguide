// Shared helpers for the Thought Stream surface (composer + cards).

export function currentDevice(): "phone" | "desktop" {
  return window.innerWidth < 768 ? "phone" : "desktop";
}

export function deviceMeta(): string {
  return JSON.stringify({ device: currentDevice() });
}

const URL_RE = /^https?:\/\/\S+$/i;
const VIDEO_HOST_RE = /(^|\.)(?:youtube\.com|youtu\.be|vimeo\.com)$/i;

/** A single-line, whitespace-free string that is itself a full URL. */
export function isBareUrl(text: string): boolean {
  return URL_RE.test(text);
}

export function urlRawType(url: string): "video_link" | "link" {
  try {
    const host = new URL(url).hostname;
    return VIDEO_HOST_RE.test(host) ? "video_link" : "link";
  } catch {
    return "link";
  }
}

/** Best-effort parse of extraction.meta (a JSON string; shape varies by rawType). */
export function parseMeta(meta: string | undefined): Record<string, unknown> | null {
  if (!meta) return null;
  try {
    const parsed = JSON.parse(meta);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const sec = Math.round(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return "yesterday";
  if (day < 7) return `${day}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
