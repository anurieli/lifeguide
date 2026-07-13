import { describe, it, expect } from "vitest";
import { buildToneWav, DEMO_WAV_SAMPLE_RATE } from "../lib/demoWav";

describe("buildToneWav", () => {
  it("emits a well-formed mono 16-bit PCM WAV of the requested length", () => {
    const seconds = 3;
    const wav = buildToneWav(seconds);
    const ascii = (o: number, n: number) =>
      String.fromCharCode(...wav.slice(o, o + n));
    expect(ascii(0, 4)).toBe("RIFF");
    expect(ascii(8, 4)).toBe("WAVE");
    expect(ascii(36, 4)).toBe("data");
    const view = new DataView(wav.buffer, wav.byteOffset);
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(DEMO_WAV_SAMPLE_RATE);
    const dataBytes = seconds * DEMO_WAV_SAMPLE_RATE * 2;
    expect(view.getUint32(40, true)).toBe(dataBytes);
    expect(wav.length).toBe(44 + dataBytes);
  });

  it("fades in and out: silent at the edges, audible in the middle", () => {
    const wav = buildToneWav(5);
    const view = new DataView(wav.buffer, wav.byteOffset);
    const sample = (i: number) => view.getInt16(44 + i * 2, true);
    expect(Math.abs(sample(0))).toBeLessThan(200);
    expect(Math.abs(sample(5 * DEMO_WAV_SAMPLE_RATE - 1))).toBeLessThan(200);
    let peak = 0;
    const mid = Math.floor(2.5 * DEMO_WAV_SAMPLE_RATE);
    for (let i = mid; i < mid + 400; i++) peak = Math.max(peak, Math.abs(sample(i)));
    expect(peak).toBeGreaterThan(1500);
  });
});
