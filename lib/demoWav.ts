// A tiny, dependency-free WAV synthesizer for the demo thoughts: a soft two-note
// hum with a breathing envelope, believable as a voice-note placeholder in the
// inline player. 8kHz mono 16-bit keeps a half-minute take under ~500KB.

export const DEMO_WAV_SAMPLE_RATE = 8000;

export function buildToneWav(seconds: number, baseFreq = 196): Uint8Array {
  const n = Math.floor(seconds * DEMO_WAV_SAMPLE_RATE);
  const data = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / DEMO_WAV_SAMPLE_RATE;
    // Fade in over 1.5s, out over the last 2s, with a slow amplitude breath.
    const env =
      Math.max(0, Math.min(1, t / 1.5, (seconds - t) / 2)) *
      (0.55 + 0.45 * Math.sin((2 * Math.PI * t) / 7));
    const s =
      0.5 * Math.sin(2 * Math.PI * baseFreq * t) +
      0.3 * Math.sin(2 * Math.PI * baseFreq * 1.5 * t);
    data[i] = Math.round(Math.max(-1, Math.min(1, s * env * 0.4)) * 32767);
  }
  const bytes = new Uint8Array(44 + data.length * 2);
  const view = new DataView(bytes.buffer);
  const writeStr = (o: number, str: string) => {
    for (let i = 0; i < str.length; i++) bytes[o + i] = str.charCodeAt(i);
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + data.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, DEMO_WAV_SAMPLE_RATE, true);
  view.setUint32(28, DEMO_WAV_SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, data.length * 2, true);
  bytes.set(new Uint8Array(data.buffer), 44);
  return bytes;
}
