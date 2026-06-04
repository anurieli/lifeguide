"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useMemo,
} from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MoodKey, TRACK_BY_KEY, DEFAULT_MOOD, moodForHour } from "./tracks";

// ---------------------------------------------------------------------------
// MusicProvider — the Atmosphere engine.
//
// Durable preferences (enabled, autoplay, default mood) live in Convex settings.
// Live playback is kept in React state, with the chosen mood, volume, and AUTO
// each mirrored to localStorage so the controls are remembered across reloads
// (last-chosen mood wins over the Convex default). Autoplay is ON by default.
//
// Audio runs through the Web Audio API so the visualizer is REAL: each of the
// two <audio> elements is wired src -> gain -> destination (gain does the
// volume + gapless crossfade) and src -> analyser (a tap the waveform reads via
// getByteTimeDomainData). Built lazily on first play and resumed on a user
// gesture, per the autoplay policy. See docs/product/features/atmosphere.md.
// ---------------------------------------------------------------------------

type MusicCtx = {
  enabled: boolean;
  moodKey: MoodKey;
  playing: boolean;
  volume: number;
  auto: boolean;
  togglePlay: () => void;
  pickMood: (k: MoodKey) => void;
  setVolume: (v: number) => void;
  setAuto: (on: boolean) => void;
  getActiveAnalyser: () => AnalyserNode | null;
};

const Ctx = createContext<MusicCtx | null>(null);

export function useMusic() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMusic must be used within MusicProvider");
  return c;
}

const VOL_KEY = "lifeguide.music.volume";
const AUTO_KEY = "lifeguide.music.auto";
const MOOD_KEY = "lifeguide.music.mood"; // last mood the user chose — remembered across sessions
const DEFAULT_VOLUME = 0.62;

export function MusicProvider({ children }: { children: ReactNode }) {
  const settings = useQuery(api.settings.get, {});

  // undefined (loading) / null (no row yet) / true => on; only explicit false hides
  const enabled = settings?.musicEnabled !== false;

  const [moodKey, setMoodKey] = useState<MoodKey>(DEFAULT_MOOD);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [auto, setAutoState] = useState(false);

  const aRef = useRef<HTMLAudioElement | null>(null);
  const bRef = useRef<HTMLAudioElement | null>(null);
  const activeKeyRef = useRef<"a" | "b">("a");
  const volumeRef = useRef(volume);
  const moodRef = useRef(moodKey);
  const settingsInitedRef = useRef(false);
  const interactedRef = useRef(false); // user pressed play or picked a mood

  // Web Audio graph (lazy). gain: volume + crossfade; analyser: the real waveform tap.
  const ctxRef = useRef<AudioContext | null>(null);
  const gainARef = useRef<GainNode | null>(null);
  const gainBRef = useRef<GainNode | null>(null);
  const analyserARef = useRef<AnalyserNode | null>(null);
  const analyserBRef = useRef<AnalyserNode | null>(null);
  const graphRef = useRef(false); // graph built
  const waRef = useRef(true); // Web Audio available (false => element.volume fallback)
  const attemptPlayRef = useRef<(() => void) | null>(null);

  volumeRef.current = volume;
  moodRef.current = moodKey;

  const getActive = () => (activeKeyRef.current === "a" ? aRef.current : bRef.current);
  const getIdle = () => (activeKeyRef.current === "a" ? bRef.current : aRef.current);
  const getActiveGain = () => (activeKeyRef.current === "a" ? gainARef.current : gainBRef.current);
  const getIdleGain = () => (activeKeyRef.current === "a" ? gainBRef.current : gainARef.current);
  const getActiveAnalyser = useCallback(
    () => (activeKeyRef.current === "a" ? analyserARef.current : analyserBRef.current),
    [],
  );

  // Create the two audio elements once (browser-only; never during SSR).
  useEffect(() => {
    const a = new Audio();
    const b = new Audio();
    for (const el of [a, b]) {
      el.loop = true;
      el.preload = "auto";
    }
    a.src = TRACK_BY_KEY[moodRef.current].src;
    aRef.current = a;
    bRef.current = b;
    return () => {
      a.pause();
      b.pause();
      aRef.current = null;
      bRef.current = null;
      try {
        ctxRef.current?.close();
      } catch {
        /* ignore */
      }
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build the Web Audio graph once, on first play (so it's inside a gesture).
  const ensureGraph = useCallback(() => {
    if (graphRef.current || !waRef.current) return;
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;
    const AC =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) {
      waRef.current = false;
      return;
    }
    try {
      const ctx = new AC();
      const build = (el: HTMLAudioElement) => {
        const src = ctx.createMediaElementSource(el);
        const gain = ctx.createGain();
        gain.gain.value = 0;
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        an.smoothingTimeConstant = 0.82;
        src.connect(gain).connect(ctx.destination); // audio path
        src.connect(an); // analysis tap (no onward connection needed)
        return { gain, an };
      };
      const A = build(a);
      const B = build(b);
      gainARef.current = A.gain;
      analyserARef.current = A.an;
      gainBRef.current = B.gain;
      analyserBRef.current = B.an;
      ctxRef.current = ctx;
      graphRef.current = true;
    } catch {
      waRef.current = false; // fall back to element.volume
    }
  }, []);

  const rampGain = (g: GainNode | null, to: number, ms: number) => {
    const ctx = ctxRef.current;
    if (!ctx || !g) return;
    const now = ctx.currentTime;
    try {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(to, now + ms / 1000);
    } catch {
      g.gain.value = to;
    }
  };

  // element.volume ramp — only used when Web Audio is unavailable
  const rampEl = (el: HTMLAudioElement, to: number, ms: number) => {
    const from = el.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const useWA = () => waRef.current && graphRef.current;

  const armGesture = useCallback(() => {
    const onGesture = () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      attemptPlayRef.current?.();
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
  }, []);

  // Start (or resume) the active element with a fade-in. Gesture-gated.
  const attemptPlay = useCallback(() => {
    const a = getActive();
    if (!a) return;
    ensureGraph();
    const ctx = ctxRef.current;
    const start = () => {
      if (useWA()) {
        const g = getActiveGain();
        if (g) g.gain.value = 0;
      } else {
        a.volume = 0;
      }
      a.play()
        .then(() => {
          if (waRef.current && ctx && ctx.state !== "running") {
            setPlaying(false);
            armGesture();
            return;
          }
          setPlaying(true);
          if (useWA()) rampGain(getActiveGain(), volumeRef.current, 600);
          else rampEl(a, volumeRef.current, 600);
        })
        .catch(() => {
          setPlaying(false);
          armGesture();
        });
    };
    if (waRef.current && ctx && ctx.state === "suspended") ctx.resume().then(start, start);
    else start();
  }, [ensureGraph, armGesture]);
  attemptPlayRef.current = attemptPlay;

  // Core mood switch. `play` = the caller intends sound now (a manual pick); when
  // false we only swap the loaded track (AUTO/clock changes while paused stay silent).
  const doMood = useCallback(
    (key: MoodKey, play: boolean) => {
      const active = getActive();
      const idle = getIdle();
      if (!active || !idle) return;
      const src = TRACK_BY_KEY[key].src;

      if (key === moodRef.current) {
        if (play && !playing) attemptPlay();
        return;
      }
      setMoodKey(key);

      if (!playing) {
        active.src = src; // preload into the live element for the next play
        if (play) attemptPlay();
        return;
      }
      // Playing: gapless crossfade active -> idle.
      ensureGraph();
      idle.src = src;
      if (useWA()) {
        const ig = getIdleGain();
        if (ig) ig.gain.value = 0;
      } else {
        idle.volume = 0;
      }
      idle
        .play()
        .then(() => {
          if (useWA()) {
            rampGain(getIdleGain(), volumeRef.current, 650);
            rampGain(getActiveGain(), 0, 650);
          } else {
            rampEl(idle, volumeRef.current, 650);
            rampEl(active, 0, 650);
          }
          window.setTimeout(() => active.pause(), 700);
          activeKeyRef.current = activeKeyRef.current === "a" ? "b" : "a";
          setPlaying(true);
        })
        .catch(() => {});
    },
    [playing, attemptPlay, ensureGraph],
  );

  // Restore ephemeral prefs after mount (avoids hydration mismatch).
  useEffect(() => {
    const v = window.localStorage.getItem(VOL_KEY);
    if (v != null) {
      const parsed = parseFloat(v);
      if (!Number.isNaN(parsed)) setVolumeState(Math.max(0, Math.min(1, parsed)));
    }
    if (window.localStorage.getItem(AUTO_KEY) === "1") setAutoState(true);
  }, []);

  // Autoplay once settings resolve (gesture-gated). Runs a single time.
  useEffect(() => {
    if (settings === undefined || settingsInitedRef.current) return;
    settingsInitedRef.current = true;
    if (interactedRef.current) return;

    const autoOn = window.localStorage.getItem(AUTO_KEY) === "1";
    const savedMood = window.localStorage.getItem(MOOD_KEY) as MoodKey | null;
    // Priority: AUTO (clock) > last chosen mood (config) > Convex default > built-in default.
    const initial: MoodKey = autoOn
      ? moodForHour(new Date().getHours())
      : savedMood && TRACK_BY_KEY[savedMood]
        ? savedMood
        : ((settings?.musicDefaultMood as MoodKey) ?? DEFAULT_MOOD);
    setMoodKey(initial);
    const a = getActive();
    if (a) a.src = TRACK_BY_KEY[initial].src;

    // Autoplay is ON by default (undefined => true); only an explicit false disables it.
    if (enabled && (settings?.musicAutoplay ?? true)) attemptPlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // When AUTO is on, re-evaluate the clock periodically and drift the mood.
  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(
      () => doMood(moodForHour(new Date().getHours()), false),
      10 * 60 * 1000,
    );
    return () => window.clearInterval(id);
  }, [auto, doMood]);

  // Master switch off -> silence immediately.
  useEffect(() => {
    if (!enabled && playing) {
      aRef.current?.pause();
      bRef.current?.pause();
      setPlaying(false);
    }
  }, [enabled, playing]);

  const togglePlay = useCallback(() => {
    interactedRef.current = true;
    const a = getActive();
    if (!a) return;
    if (playing) {
      // brief fade-out, then pause
      if (useWA()) rampGain(getActiveGain(), 0, 250);
      else rampEl(a, 0, 250);
      window.setTimeout(() => a.pause(), 260);
      setPlaying(false);
    } else {
      attemptPlay();
    }
  }, [playing, attemptPlay]);

  const pickMood = useCallback(
    (key: MoodKey) => {
      interactedRef.current = true;
      window.localStorage.setItem(MOOD_KEY, key); // remember the choice as config
      if (auto) {
        setAutoState(false);
        window.localStorage.setItem(AUTO_KEY, "0");
      }
      doMood(key, true);
    },
    [auto, doMood],
  );

  const setAuto = useCallback(
    (on: boolean) => {
      interactedRef.current = true;
      setAutoState(on);
      window.localStorage.setItem(AUTO_KEY, on ? "1" : "0");
      if (on) doMood(moodForHour(new Date().getHours()), false);
    },
    [doMood],
  );

  const setVolume = useCallback(
    (v: number) => {
      const vv = Math.max(0, Math.min(1, v));
      setVolumeState(vv);
      window.localStorage.setItem(VOL_KEY, String(vv));
      if (playing) {
        if (useWA()) rampGain(getActiveGain(), vv, 120);
        else {
          const a = getActive();
          if (a) a.volume = vv;
        }
      }
    },
    [playing],
  );

  const value = useMemo<MusicCtx>(
    () => ({
      enabled,
      moodKey,
      playing,
      volume,
      auto,
      togglePlay,
      pickMood,
      setVolume,
      setAuto,
      getActiveAnalyser,
    }),
    [
      enabled,
      moodKey,
      playing,
      volume,
      auto,
      togglePlay,
      pickMood,
      setVolume,
      setAuto,
      getActiveAnalyser,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
