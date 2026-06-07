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

// A calm, passive waveform: reads the live frequency spectrum off the
// AnalyserNode and renders it as a slow, undulating wave rather than the raw
// (jittery) time-domain signal. Two bands — low and high energy — drive two
// sines that EASE toward their target each frame, so the wave breathes instead
// of flickering, and looks distinct per mood (bassy moods swell slowly; brighter
// moods carry finer ripples). Idle/paused settles to a flat line.
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
    let raf = 0;

    // Persisted across frames: eased band amplitudes + a slowly advancing phase.
    let loAmp = 0;
    let hiAmp = 0;
    let bodyAmp = 0;
    let phase = 0;
    const EASE = variant === "orb" ? 0.22 : 0.12;
    const SPEED = variant === "orb" ? 0.038 : 0.02;
    const STEP = variant === "orb" ? 2 : 3; // px between sampled points
    const lf = variant === "orb" ? 2.4 : 1.6; // low-band wavelength (cycles across width)
    const hf = variant === "orb" ? 4.0 : 3.4; // high-band wavelength
    const gain = variant === "orb" ? 2.9 : 2.0;
    const freqBuf = new Uint8Array(512);
    const timeBuf = new Uint8Array(512);

    const band = (buf: Uint8Array, from: number, to: number) => {
      let sum = 0;
      for (let i = from; i < to; i++) sum += buf[i];
      return sum / ((to - from) * 255); // 0..1
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const mm = mRef.current;
      const an = mm.getActiveAnalyser();
      c.clearRect(0, 0, W, H);
      const color =
        variant === "orb"
          ? "#ffffff"
          : getComputedStyle(canvas).getPropertyValue("--mood").trim() || "#8A8F9C";
      c.lineWidth = variant === "orb" ? 1.4 : 1.8;
      c.lineJoin = "round";
      c.lineCap = "round";
      c.strokeStyle = color;

      // Target band energies (0 when idle/paused, so the wave eases down to flat).
      let loTarget = 0;
      let hiTarget = 0;
      let bodyTarget = 0;
      if (an && mm.playing) {
        const bins = an.frequencyBinCount;
        const freq = freqBuf.length === bins ? freqBuf : new Uint8Array(bins);
        const time = timeBuf.length === bins ? timeBuf : new Uint8Array(bins);
        an.getByteFrequencyData(freq);
        an.getByteTimeDomainData(time);
        loTarget = Math.min(1, band(freq, 0, Math.floor(bins * 0.14)) * gain); // bass swell
        hiTarget = Math.min(1, band(freq, Math.floor(bins * 0.14), Math.floor(bins * 0.68)) * gain); // mids/air ripple
        let sum = 0;
        for (let i = 0; i < bins; i++) {
          const centered = (time[i] - 128) / 128;
          sum += centered * centered;
        }
        bodyTarget = Math.min(1, Math.sqrt(sum / bins) * gain * 2.2);
      }
      loAmp += (loTarget - loAmp) * EASE;
      hiAmp += (hiTarget - hiAmp) * EASE;
      bodyAmp += (bodyTarget - bodyAmp) * EASE;
      phase += SPEED * (1 + bodyAmp * 1.4);

      // A gentle resting baseline so a paused wave isn't a dead-flat line.
      const rest = 0.05;
      const mid = H / 2;
      const maxA = (H / 2) * 0.86;

      c.globalAlpha = an && mm.playing ? 1 : 0.4;
      c.beginPath();
      for (let x = 0; x <= W; x += STEP) {
        const t = x / W;
        // Taper the ends so the wave fades in/out at the edges — softer, more passive.
        const taper = Math.sin(Math.PI * t);
        const lo = Math.sin(t * Math.PI * 2 * lf + phase) * (loAmp + bodyAmp * 0.55 + rest);
        const hi = Math.sin(t * Math.PI * 2 * hf + phase * 1.7) * (hiAmp + bodyAmp * 0.35) * 0.72;
        const y = mid - (lo + hi) * maxA * taper;
        if (x === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
      c.globalAlpha = 1;
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

// Where the orb sits, anchored from the bottom-left of the viewport. Default is
// tucked into the side rail just above the account ("name") item; the user can
// drag it anywhere and the spot is remembered.
const POS_KEY = "lifeguide.atmo.pos";
type Pos = { left: number; bottom: number };
const ORB_W = 40;
const ORB_WRAP_H = 62; // orb + gap + label, roughly
const DRAG_THRESHOLD = 4; // px of movement before a press becomes a drag (vs a tap)

function defaultPos(): Pos {
  const mobile = window.innerWidth < 768;
  // Desktop: centered in the 84px rail, lifted above the bottom avatar.
  // Mobile: clear of the 64px bottom bar.
  return mobile ? { left: 14, bottom: 96 } : { left: 22, bottom: 70 };
}

function clampPos(p: Pos): Pos {
  const maxLeft = Math.max(0, window.innerWidth - ORB_W);
  const maxBottom = Math.max(0, window.innerHeight - ORB_WRAP_H);
  return {
    left: Math.min(Math.max(0, p.left), maxLeft),
    bottom: Math.min(Math.max(0, p.bottom), maxBottom),
  };
}

export function AtmospherePlayer() {
  const m = useMusic();
  const [open, setOpen] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [dragging, setDragging] = useState(false);
  const volBarRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const swapTimer = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const dragStart = useRef<{ x: number; y: number; left: number; bottom: number } | null>(null);
  const movedRef = useRef(false);
  // Inline correction so the panel hugs the orb but never spills past a viewport
  // edge. It always sits just ABOVE the orb (never over it) and caps its height
  // to the room available, so a tall mood list scrolls instead of overlapping.
  const PANEL_GAP = ORB_WRAP_H + 8; // panel bottom = just above the orb-wrap
  const [panelFix, setPanelFix] = useState<{ left: number; bottom: number; maxH: number }>({
    left: 0,
    bottom: PANEL_GAP,
    maxH: 9999,
  });

  // Restore the saved position (or fall back to the default) after mount, so the
  // server and first client render agree. Re-clamp on resize so it can't strand
  // off-screen.
  useEffect(() => {
    const saved = window.localStorage.getItem(POS_KEY);
    let next: Pos | null = null;
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (typeof p?.left === "number" && typeof p?.bottom === "number") next = p;
      } catch {
        /* ignore bad json */
      }
    }
    setPos(clampPos(next ?? defaultPos()));
    const onResize = () => setPos((p) => (p ? clampPos(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // brief blur-mask whenever the mood text changes
  useEffect(() => {
    setSwapping(true);
    if (swapTimer.current) window.clearTimeout(swapTimer.current);
    swapTimer.current = window.setTimeout(() => setSwapping(false), 360);
    return () => {
      if (swapTimer.current) window.clearTimeout(swapTimer.current);
    };
  }, [m.moodKey]);

  // close on Escape, and collapse when you click anywhere outside the player so
  // the open panel never lingers and distracts from the orb.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // Keep the panel hugging the orb but fully on-screen. It always floats just
  // ABOVE the orb (never over it); we only clamp its left into the viewport and
  // cap its height to the space above, so a tall list scrolls rather than
  // growing down onto the orb.
  useEffect(() => {
    if (!pos) return;
    const panel = panelRef.current;
    if (!panel) return;
    const margin = 10;
    const W = panel.offsetWidth || 312;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const targetLeft = Math.min(Math.max(margin, pos.left), vw - W - margin);
    const maxH = Math.max(160, vh - (pos.bottom + PANEL_GAP) - margin);
    setPanelFix({ left: targetLeft - pos.left, bottom: PANEL_GAP, maxH });
  }, [pos, open, m.moodKey, PANEL_GAP]);

  if (!m.enabled) return null;

  const cur = TRACK_BY_KEY[m.moodKey];

  const onVol = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = volBarRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    m.setVolume((e.clientX - r.left) / r.width);
  };

  // The orb is both a drag handle AND the play/pause control. A press that
  // doesn't move past the threshold is a tap (toggles play); anything more is a
  // drag (repositions, and is remembered). Pointer capture keeps the move/up
  // events flowing even if the cursor outruns the small orb.
  const onOrbPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, left: pos.left, bottom: pos.bottom };
    movedRef.current = false;
  };

  const onOrbPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = dragStart.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!movedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      movedRef.current = true;
      draggingRef.current = true;
      setDragging(true);
      setOpen(false); // dragging shouldn't drag the open panel around
    }
    if (movedRef.current) {
      setPos(clampPos({ left: s.left + dx, bottom: s.bottom - dy }));
    }
  };

  const onOrbPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = dragStart.current;
    dragStart.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (movedRef.current) {
      // was a drag: persist where it landed
      setPos((p) => {
        if (p) window.localStorage.setItem(POS_KEY, JSON.stringify(p));
        return p;
      });
      draggingRef.current = false;
      setDragging(false);
    } else if (s) {
      // was a tap: toggle play
      m.togglePlay();
    }
  };

  return (
    <div
      ref={rootRef}
      className={`atmo-root ${dragging ? "dragging" : ""}`}
      style={
        {
          ["--mood" as string]: cur.color,
          ...(pos ? { left: `${pos.left}px`, bottom: `${pos.bottom}px`, top: "auto", right: "auto" } : null),
        } as React.CSSProperties
      }
      onMouseEnter={() => !draggingRef.current && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
    >
      {/* collapsed orb: mood-colored when playing, with a live soundwave and the
          mood name beneath. Hovering the player opens the controls; a tap on the
          orb toggles play/pause; dragging it repositions the whole widget. */}
      <div className={`atmo-orb-wrap ${open ? "expanded" : ""}`}>
        <button
          type="button"
          className={`atmo-orb ${m.playing ? "playing" : ""}`}
          onPointerDown={onOrbPointerDown}
          onPointerMove={onOrbPointerMove}
          onPointerUp={onOrbPointerUp}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              m.togglePlay();
            }
          }}
          aria-label={`${m.playing ? "Pause" : "Play"} atmosphere — ${cur.mood}. Drag to move.`}
          aria-pressed={m.playing}
        >
          {m.playing ? <AtmoWave variant="orb" /> : <span className="dot" />}
          {/* on hover, a clear play/pause affordance over the orb */}
          <span className="atmo-orb-hint" aria-hidden>
            <PlayIcon playing={m.playing} />
          </span>
        </button>
        <span className="atmo-orb-label">{cur.mood}</span>
      </div>

      {/* panel */}
      <div
        ref={panelRef}
        className={`atmo-panel ${open ? "open" : ""}`}
        style={{ left: panelFix.left, bottom: panelFix.bottom, maxHeight: panelFix.maxH }}
        role="dialog"
        aria-label="Atmosphere"
      >
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
