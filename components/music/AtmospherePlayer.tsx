"use client";

import { useEffect, useRef, useState } from "react";
import { useMusic } from "./MusicProvider";
import { TRACKS, TRACK_BY_KEY, MoodKey } from "./tracks";

// The visible Atmosphere control: a calm breathing orb bottom-left that scales
// open (from its own origin) into a panel. Markup-only; motion lives in
// globals.css (.atmo-*). The whole panel tints to the current mood via --mood.

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 4l13 8-13 8z" />
    </svg>
  );
}

// A REAL waveform: reads the live audio off the AnalyserNode each frame and
// draws the time-domain signal as a linear wave. Idle/paused shows a flat line.
// `variant` picks size + color (white inside the mood-colored orb; the mood
// color in the panel, read from the inherited --mood CSS var).
function AtmoWave({ variant }: { variant: "orb" | "panel" }) {
  const m = useMusic();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mRef = useRef(m);
  mRef.current = m;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;
    const W = canvas.width;
    const H = canvas.height;
    const points = variant === "orb" ? 28 : 150;
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const mm = mRef.current;
      const an = mm.getActiveAnalyser();
      c.clearRect(0, 0, W, H);
      const color =
        variant === "orb"
          ? "#ffffff"
          : getComputedStyle(canvas).getPropertyValue("--mood").trim() || "#8A8F9C";
      c.lineWidth = variant === "orb" ? 1.6 : 2;
      c.lineJoin = "round";
      c.lineCap = "round";
      c.strokeStyle = color;

      if (!an || !mm.playing) {
        c.globalAlpha = 0.35;
        c.beginPath();
        c.moveTo(0, H / 2);
        c.lineTo(W, H / 2);
        c.stroke();
        c.globalAlpha = 1;
        return;
      }

      const N = an.fftSize;
      const buf = new Uint8Array(N);
      an.getByteTimeDomainData(buf);
      c.globalAlpha = 1;
      c.beginPath();
      for (let i = 0; i < points; i++) {
        const idx = Math.floor((i * N) / points);
        const v = (buf[idx] - 128) / 128; // -1..1
        const x = (i / (points - 1)) * W;
        const y = H / 2 + v * (H / 2) * 0.92;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [variant]);

  return variant === "orb" ? (
    <canvas ref={canvasRef} className="atmo-orb-wave" width={26} height={16} aria-hidden />
  ) : (
    <canvas ref={canvasRef} className="atmo-wave" width={240} height={24} aria-hidden />
  );
}

export function AtmospherePlayer() {
  const m = useMusic();
  const [open, setOpen] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const volBarRef = useRef<HTMLDivElement | null>(null);
  const swapTimer = useRef<number | null>(null);

  // brief blur-mask whenever the mood text changes
  useEffect(() => {
    setSwapping(true);
    if (swapTimer.current) window.clearTimeout(swapTimer.current);
    swapTimer.current = window.setTimeout(() => setSwapping(false), 360);
    return () => {
      if (swapTimer.current) window.clearTimeout(swapTimer.current);
    };
  }, [m.moodKey]);

  // close on Escape when open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!m.enabled) return null;

  const cur = TRACK_BY_KEY[m.moodKey];

  const onVol = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = volBarRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    m.setVolume((e.clientX - r.left) / r.width);
  };

  return (
    <div className="atmo-root" style={{ ["--mood" as string]: cur.color } as React.CSSProperties}>
      {/* collapsed orb: mood-colored when playing, with a live soundwave and the
          mood name beneath. Clicking opens the controls. */}
      <div className={`atmo-orb-wrap ${open ? "expanded" : ""}`}>
        <button
          type="button"
          className={`atmo-orb ${m.playing ? "playing" : ""}`}
          onClick={() => setOpen(true)}
          aria-label={`Atmosphere — ${cur.mood}${m.playing ? ", playing" : ", paused"}`}
          aria-expanded={open}
        >
          {m.playing ? <AtmoWave variant="orb" /> : <span className="dot" />}
        </button>
        <span className="atmo-orb-label">{cur.mood}</span>
      </div>

      {/* panel */}
      <div className={`atmo-panel ${open ? "open" : ""}`} role="dialog" aria-label="Atmosphere">
        <div className="atmo-head">
          <div className="name">
            <span className="pin" />
            ATMOSPHERE
          </div>
          <button
            type="button"
            className={`atmo-auto ${m.auto ? "on" : ""}`}
            onClick={() => m.setAuto(!m.auto)}
            aria-pressed={m.auto}
            title="Match the mood to the time of day"
          >
            <span className="tick" /> AUTO
          </button>
        </div>

        <div className={`atmo-now ${m.playing ? "playing" : ""} ${swapping ? "swapping" : ""}`}>
          <div className="swap">
            <div className="mood">{cur.mood}</div>
            <div className="track">{cur.title}</div>
            <div className="desc">{cur.desc} · loops seamlessly</div>
          </div>
          <div className="atmo-controls">
            <button
              type="button"
              className="atmo-play"
              onClick={m.togglePlay}
              aria-label={m.playing ? "Pause" : "Play"}
            >
              <PlayIcon playing={m.playing} />
            </button>
            <AtmoWave variant="panel" />
            <span className="atmo-loop" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M17 2l4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 22l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </span>
          </div>
        </div>

        <div className="atmo-meter">
          <div className="cap">Mood</div>
          {TRACKS.map((t) => (
            <button
              type="button"
              key={t.key}
              className={`atmo-mood-row ${m.moodKey === t.key ? "sel" : ""}`}
              style={{ ["--rc" as string]: t.color } as React.CSSProperties}
              onClick={() => m.pickMood(t.key as MoodKey)}
            >
              <span className="swatch" />
              <span className="mtxt">
                <span className="mt">{t.mood}</span>
                <span className="md">
                  {t.desc} · {t.title}
                </span>
              </span>
              <svg className="chk" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <path d="M5 13l4 4L19 7" />
              </svg>
            </button>
          ))}
        </div>

        <div className="atmo-foot">
          <svg className="vol-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M11 5L6 9H2v6h4l5 4z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          </svg>
          <div className="atmo-vol" ref={volBarRef} onClick={onVol} role="slider" aria-label="Volume" aria-valuenow={Math.round(m.volume * 100)} aria-valuemin={0} aria-valuemax={100} tabIndex={0}>
            <div className="fill" style={{ width: `${m.volume * 100}%` }} />
            <div className="knob" style={{ left: `${m.volume * 100}%` }} />
          </div>
          <button type="button" className="atmo-close" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
