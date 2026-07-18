"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { View } from "@/components/shell/Rail";
import { TOUR_STEPS, TOUR_VIDEO_URL } from "./steps";
import { TourCoachmark } from "./TourCoachmark";
import { useTourTarget } from "./useTourTarget";

// The guided product tour (ARI-19). Mounted once in AppShell's Shell, next to
// CoachDock/FeedbackWidget — it needs the same `view`/`onNav` the rail uses so
// it can drive the shell to each step's page before measuring that step's
// target. It never controls the Coach chat panel: the "Coach" step anchors on
// the always-present talk button instead, so the tour doesn't fight whatever
// the person is doing with their own chat.
//
// Fires once per user: only after onboarding (`settings.onboardedAt`) is set,
// and only while neither `tourCompletedAt` nor `tourSkippedAt` is stamped.
// Step index is mirrored into Convex on every advance so a reload mid-tour
// resumes at the same stop; the "Restart tour" control in Settings clears
// both stamps to fire it again. See docs/product/features/product-tour.md.
export function Tour({ view, onNav }: { view: View; onNav: (v: View) => void }) {
  const settings = useQuery(api.settings.get, {});
  const tour = useQuery(api.tour.get, {});
  const advance = useMutation(api.tour.advance);
  const complete = useMutation(api.tour.complete);
  const skip = useMutation(api.tour.skip);

  // Owned locally once running: instant Back/Next with no round-trip, Convex
  // writes ride along as a side effect (resume-progress persistence, not the
  // interaction's source of truth).
  const [localStep, setLocalStep] = useState<number | null>(null);

  const shouldRun =
    settings != null && tour != null && !!settings.onboardedAt && !tour.completedAt && !tour.skippedAt;

  useEffect(() => {
    if (shouldRun && localStep === null) {
      setLocalStep(Math.min(Math.max(tour!.step, 0), TOUR_STEPS.length - 1));
    }
    if (!shouldRun && localStep !== null) {
      setLocalStep(null);
    }
    // Only re-derive when eligibility flips, not on every tour/settings poll —
    // localStep is the interaction's own state once running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRun]);

  const step = localStep !== null ? TOUR_STEPS[localStep] : null;

  // Bring the shell to the step's page. Runs as an effect (not during render)
  // since it calls the parent's setState.
  useEffect(() => {
    if (step && step.view !== view) onNav(step.view);
  }, [step, view, onNav]);

  const rect = useTourTarget(step?.target ?? null);

  if (step === null || localStep === null) return null;

  const goTo = (next: number) => {
    if (next < 0) return;
    if (next >= TOUR_STEPS.length) {
      void complete({});
      setLocalStep(null);
      return;
    }
    setLocalStep(next);
    void advance({ step: next });
  };

  return (
    <TourCoachmark
      step={step}
      index={localStep}
      total={TOUR_STEPS.length}
      rect={rect}
      videoUrl={TOUR_VIDEO_URL}
      onNext={() => goTo(localStep + 1)}
      onBack={() => goTo(localStep - 1)}
      onSkip={() => {
        void skip({});
        setLocalStep(null);
      }}
    />
  );
}
