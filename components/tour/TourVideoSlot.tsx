"use client";

import { useState } from "react";
import { X } from "lucide-react";

// The optional short intro video slot on the tour's first step (ARI-19 DoD:
// "build the embed slot/UI; an actual video asset doesn't exist"). Renders
// nothing at all when no URL is configured — TOUR_STEPS' TOUR_VIDEO_URL is
// null until a real asset lands (see components/tour/steps.ts) — and renders
// a dismissible player once one is. Dismissal is local-only (component
// state): once the whole tour is completed or skipped it won't show again
// regardless, so there's nothing worth persisting to Convex for it.
export function TourVideoSlot({ url }: { url?: string | null }) {
  const [dismissed, setDismissed] = useState(false);
  if (!url || dismissed) return null;
  return (
    <div className="relative mt-3 rounded-xl overflow-hidden border border-line bg-black">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss video"
        className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- short, silent product-tour clip; no dialogue to caption */}
      <video src={url} controls playsInline className="w-full aspect-video" />
    </div>
  );
}
