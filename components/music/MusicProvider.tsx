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
// (last-chosen mood wins over the Convex default). Two <audio> elements give a
// gapless crossfade between moods. Autoplay is ON by default; browsers block
// audio until a gesture, so it attempts once and, if blocked, starts on the
// first interaction anywhere. See docs/product/features/atmosphere.md.
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

// linear volume ramp on rAF — used for fade-in and crossfade
function ramp(el: HTMLAudioElement, to: number, ms: number) {
  const from = el.volume;
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

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

  volumeRef.current = volume;
  moodRef.current = moodKey;

  const getActive = () => (activeKeyRef.current === "a" ? aRef.current : bRef.current);
  const getIdle = () => (activeKeyRef.current === "a" ? bRef.current : aRef.current);

  // Create the two audio elements once (browser-only; never during SSR).
  useEffect(() => {
    const a = new Audio();
    const b = new Audio();
    for (const el of [a, b]) {
      el.loop = true;
      el.preload = "auto";
      el.volume = 0;
    }
    a.src = TRACK_BY_KEY[moodRef.current].src;
    aRef.current = a;
    bRef.current = b;
    return () => {
      a.pause();
      b.pause();
      aRef.current = null;
      bRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore ephemeral prefs after mount (avoids hydration mismatch).
  useEffect(() => {
    const v = window.localStorage.getItem(VOL_KEY);
    if (v != null) {
      const parsed = parseFloat(v);
      if (!Number.isNaN(parsed)) setVolumeState(Math.max(0, Math.min(1, parsed)));
    }
    if (window.localStorage.getItem(AUTO_KEY) === "1") setAutoState(true);
  }, []);

  const startPlayback = useCallback(() => {
    const a = getActive();
    if (!a) return;
    a.volume = 0;
    a
      .play()
      .then(() => {
        setPlaying(true);
        ramp(a, volumeRef.current, 600);
      })
      .catch(() => setPlaying(false));
  }, []);

  // Core mood switch. `play` = the caller intends sound now (a manual pick); when
  // false we only swap the loaded track (AUTO/clock changes while paused stay silent).
  const doMood = useCallback(
    (key: MoodKey, play: boolean) => {
      const active = getActive();
      const idle = getIdle();
      if (!active || !idle) return;
      const src = TRACK_BY_KEY[key].src;

      if (key === moodRef.current) {
        if (play && !playing) startPlayback();
        return;
      }
      setMoodKey(key);

      if (!playing) {
        active.src = src; // preload into the live element for the next play
        if (play) startPlayback();
        return;
      }
      // Playing: gapless crossfade active -> idle.
      idle.src = src;
      idle.volume = 0;
      idle
        .play()
        .then(() => {
          ramp(idle, volumeRef.current, 650);
          ramp(active, 0, 650);
          window.setTimeout(() => active.pause(), 700);
          activeKeyRef.current = activeKeyRef.current === "a" ? "b" : "a";
          setPlaying(true);
        })
        .catch(() => {});
    },
    [playing, startPlayback],
  );

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
    if (enabled && (settings?.musicAutoplay ?? true)) {
      a?.play()
        .then(() => {
          setPlaying(true);
          ramp(a, volumeRef.current, 900);
        })
        .catch(() => {
          // blocked until a gesture — start on the first interaction anywhere
          const onGesture = () => {
            window.removeEventListener("pointerdown", onGesture);
            window.removeEventListener("keydown", onGesture);
            if (!interactedRef.current && enabled) startPlayback();
          };
          window.addEventListener("pointerdown", onGesture, { once: true });
          window.addEventListener("keydown", onGesture, { once: true });
        });
    }
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
      a.pause();
      setPlaying(false);
    } else {
      startPlayback();
    }
  }, [playing, startPlayback]);

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
      const a = getActive();
      if (a && playing) a.volume = vv;
    },
    [playing],
  );

  const value = useMemo<MusicCtx>(
    () => ({ enabled, moodKey, playing, volume, auto, togglePlay, pickMood, setVolume, setAuto }),
    [enabled, moodKey, playing, volume, auto, togglePlay, pickMood, setVolume, setAuto],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
