# Atmosphere

**Status:** built (v1) · **Element of:** spine (ambient surface, present across the app) · **Owns:** three `settings` fields (`musicEnabled`, `musicAutoplay`, `musicDefaultMood`) + six static audio assets in `/public/audio`

> Atmosphere is the app's ambient music system: six looping instrumental moods, always at the ready, controlled from a calm breathing orb. It gives the space a sound.

## 1. Purpose

The soul calls LifeGuide "a calm room he returns to." A room has an atmosphere. Atmosphere gives the space a literal one: a low, looping instrumental bed that supports the work the person came to do (reflect, think, focus, wind down) without ever demanding attention. It is the opposite of a notification: it asks for nothing, it is just there when wanted, and it tints itself to the kind of attention the moment needs. It exists so the act of opening LifeGuide can feel like stepping into a space, not opening an app.

## 2. User-facing behavior

A small orb sits in the side rail just above the account ("name") item by default. **It is draggable anywhere on screen** (the spot is remembered per-browser and re-clamped on resize so it can never strand off-screen); on mobile, where the rail becomes a bottom bar, the default lifts clear of that bar. At rest it shows a still dot on white; while music plays it fills with the current mood's color, runs a live soundwave, pulses a soft halo, and names the mood in small text beneath it, so the orb itself signals what is playing. On hover, a **play/pause affordance** fades in over the orb (a play glyph when paused, pause when playing).

The orb is both the drag handle and the quick play/pause control: a **tap** toggles play/pause, while a press that travels past a small threshold becomes a drag (so moving it never toggles). **Hovering** the widget opens the **Atmosphere** panel, which floats just above the orb and collapses again on mouse-leave, click-outside, or Esc. The orb stays put and on top of the panel so it is always a one-click play/pause, and the panel is clamped to the viewport (and height-capped, with the mood list scrolling) so it never spills past an edge or lands on the orb.

- A **now-playing** block: the current mood, the track name, a one-line description, a play/pause button, a **calm waveform** while playing (a slow, eased two-band reading of the live audio: low energy swells, high energy ripples, so it breathes rather than jitters and reads distinctly per mood), and a loop glyph (every track loops seamlessly). The orb's soundwave is the same signal, in miniature.
- A **mood meter**: the four moods as a color-coded list. Picking one crossfades to it (gapless) and tints the whole panel to that mood's color.
- An **AUTO** toggle: when on, Atmosphere matches the mood to the time of day and drifts as the day moves (a v1 stand-in for the Context Bus). Any manual mood pick turns AUTO off.
- A **volume** slider and a **Close** action.

The six moods: **Inspiration** (First Light, gold), **Creative Deep Thinking** (Wander, violet), **Super Focus** (Flow State, teal), **Calm Reset** (After Hours, blue), **Reflection** (Stillwater, indigo), and **Stillness** (Still Water, teal-green). The last two are neoclassical piano (Suno, contemplative). Only the original four are offered in the Settings default-mood picker; all six appear in the live meter.

Durable preferences live in **Settings → Atmosphere**: turn music off entirely, autoplay on open (**on by default**), and the default mood. Live choices (the chosen mood, the volume, AUTO) are remembered across reloads in the browser, with the **last chosen mood winning over the Convex default**; they are per-browser config, not cross-device "settings."

Coach path: not wired in v1. The hooks (`pickMood`, `togglePlay`, `setAuto`) are deliberately a small imperative surface so the Coach can "act from far away" (set the mood for a focus session it just scheduled) when act-from-far-away lands. See Open questions.

## 3. Functions / actions

| Action | Trigger | What it does | Manual / Coach | Data touched |
|---|---|---|---|---|
| Open / close panel | Hover widget / mouse-leave / click-outside / Esc | Opens the panel above the orb, or collapses it | Manual | none (local UI) |
| Play / pause | Tap the orb, or the panel play button | Starts the active mood (fades in) or pauses it | Manual (Coach-ready) | none (ephemeral) |
| Drag widget | Press + move the orb past a threshold | Repositions the whole widget; clamps on-screen; remembered | Manual | `localStorage` (`lifeguide.atmo.pos`) |
| Pick mood | Mood row | Gapless crossfade to that mood; tints the player; turns AUTO off; remembered | Manual (Coach-ready) | `localStorage` (`lifeguide.music.mood`) |
| Toggle AUTO | AUTO chip | Mood follows the clock and drifts every ~10 min | Manual | `localStorage` (`lifeguide.music.auto`) |
| Set volume | Volume slider | Sets and ramps playback volume | Manual | `localStorage` (`lifeguide.music.volume`) |
| Turn music on/off | Settings → Atmosphere → Music | Master switch; off hides the orb and silences audio | Manual | `settings.musicEnabled` |
| Toggle autoplay | Settings → Atmosphere → Autoplay | Start playing on app load (gesture permitting) | Manual | `settings.musicAutoplay` |
| Set default mood | Settings → Atmosphere → Default mood | The mood each new session starts in | Manual | `settings.musicDefaultMood` |
| Autoplay on load | App mount (enabled + autoplay, which is on by default) | Attempts to play; if the browser blocks it, starts on the first click/keypress anywhere | Automatic | reads `settings`, `localStorage` |

## 4. Dynamics and interactions with other elements

Atmosphere **owns** its three `settings` fields and the audio assets. It **draws** nothing from the streams in v1 and **publishes** nothing to the Mirror. It is an ambient surface, not a context source: a person's listening is not (yet) signal about who they are.

It is mounted inside `AppShell` (wrapping the whole shell in `MusicProvider`), so it is present on every surface (Today, Core, Board, Guide, Settings) and survives navigation between them. It coexists with the **Coach dock** (right side on desktop) and the rail (left on desktop, a bottom bar on mobile); the orb is positioned to clear both, lifting above the bottom bar at the mobile breakpoint. It is intentionally decoupled from the Context Bus so it can be enabled, disabled, or removed without touching the spine.

The intended future tie: when **AUTO** graduates from a clock heuristic to real context, `moodForHour` is the single function that gets replaced by a read of the active session, the surface in view, and the person's energy. That is the one designed seam into the Context Bus.

## 5. States

- **Disabled** (`musicEnabled === false`): no orb, no audio. Nothing renders.
- **Idle** (enabled, paused): white orb with a still mood-colored dot, the mood name beneath, panel available, active track preloaded but silent.
- **Playing**: orb fills with the mood color, the soundwave and halo animate, the mood name shows beneath, volume at the set level.
- **Crossfading**: two tracks overlap for ~650ms while one ramps up and the other down; the now-playing text blurs briefly to mask the swap.
- **AUTO**: mood is clock-derived and re-evaluated on an interval; a manual pick exits this state.
- **Autoplay-pending**: enabled + autoplay but the browser blocked sound; armed to start on the first user gesture.

## 6. Edge cases

- **Autoplay policy.** Browsers refuse audio before a user gesture. Autoplay attempts once and, if rejected, attaches a one-time `pointerdown`/`keydown` listener that starts playback on the first interaction. It never retries in a loop and never throws.
- **SSR.** `new Audio()` is browser-only; the two elements are created in a mount effect, never during render. Volume/AUTO are restored in an effect (not a render-time `localStorage` read) to avoid hydration mismatch.
- **No settings row yet.** New users may have no `settings` row (it is created on first mutation). Absent/`null`/`undefined` all read as enabled-on, autoplay-on, default mood `inspiration` (overridden by the last chosen mood in `localStorage`, if any).
- **Master switch off mid-play.** Flipping Music off immediately pauses both audio elements and hides the orb.
- **Missing/blocked asset.** If a track fails to load or play, the promise rejects and is swallowed; the UI returns to paused rather than hanging.
- **Reduced motion.** `prefers-reduced-motion` stops the orb halo pulse; crossfades and tints (opacity/color) remain. The waveform is an audio-reactive readout (a live representation of the signal, not decorative motion), so it keeps tracking the music.
- **Rapid mood switches.** Crossfade uses two fixed elements and swaps the active pointer; a new pick simply retargets the next crossfade. (Volume ramps are rAF loops, not interruptible mid-flight; harmless overlap settles to the latest target.)

## 7. AI involvement

None at runtime in v1. The four tracks were generated once with Suno (an authoring-time tool, not a runtime dependency) and ship as static MP3s. No model is in the loop when the app plays them. The only place AI is intended to enter later is AUTO, where the Coach's context would choose the mood instead of the clock. See [`../../architecture/ai-layer.md`](../../architecture/ai-layer.md).

## 8. Data touched

**Owned (durable):** `settings.musicEnabled?`, `settings.musicAutoplay?`, `settings.musicDefaultMood?` (see [`../../architecture/data-model.md`](../../architecture/data-model.md)). Written via `settings.update` from the Settings surface.

**Owned (assets):** `/public/audio/{inspiration,deep-thinking,focus,calm-reset}.mp3`.

**Per-browser config (not in any table):** current `moodKey`, `playing`, `volume`, `auto`, plus the orb's dragged position. Held in `MusicProvider` / `AtmospherePlayer` React state; the chosen `moodKey`, `volume`, `auto`, and the orb position are mirrored to `localStorage` (`lifeguide.music.mood`, `lifeguide.music.volume`, `lifeguide.music.auto`, `lifeguide.atmo.pos`) so the controls and placement are remembered across reloads. `playing` is not persisted.

**Drawn:** none.

Code: `components/music/MusicProvider.tsx` (engine + context + Web Audio graph), `components/music/AtmospherePlayer.tsx` (orb + panel + `AtmoWave` canvas visualizer), `components/music/tracks.ts` (the six moods + `moodForHour`), styles in `app/globals.css` (`.atmo-*`).

**Audio engine.** Playback runs through the Web Audio API: each of the two `<audio>` elements is wired `MediaElementSource -> GainNode -> destination` (the gain does volume and the gapless crossfade) plus `MediaElementSource -> AnalyserNode` as a tap. The `AtmoWave` canvas reads `analyser.getByteFrequencyData` each animation frame, splits it into a low and a high band, and eases two sines toward those energies (a slow, passive wave that breathes rather than jitters and differs per mood), so the visualizer reflects the real signal without the staticky look of a raw oscilloscope. The graph is built lazily on first play and the `AudioContext` is resumed on a user gesture (autoplay policy). If `AudioContext` is unavailable, playback falls back to `element.volume` and the wave shows a flat idle line.

## 9. Open questions

- **Licensing.** The v1 tracks were generated on a free Suno account (non-commercial). Shipping to real users needs commercial rights (Suno Pro) or replacement audio. Blocking for public launch, not for dev.
- **Coach control.** The imperative hooks are Coach-ready, but no Coach tool calls them yet. When act-from-far-away lands, add `set_atmosphere(mood)` so a scheduled focus block can bring up Super Focus on its own.
- **AUTO as real context.** Replace `moodForHour` with a Context Bus read (active session, surface, energy). Decide whether listening becomes weak signal to the Mirror or stays private and ambient.
- **More moods / per-pillar themes.** Whether the meter grows beyond four, and whether moods ever map to pillars.
- **Cross-device continuity.** Volume/AUTO are per-browser today. Decide if they should follow the user (promote to `settings`) once multi-device is real.
