import { buildToneWav } from "@/lib/demoWav";

// The client half of the demo thoughts (see convex/sessions.ts seedDemo): the
// voice takes and photos are painted here in the browser — nothing fetched,
// nothing bundled — then uploaded to storage like any real capture file.

export function demoVoiceBlob(seconds: number, baseFreq: number): Blob {
  const wav = buildToneWav(seconds, baseFreq);
  return new Blob([wav.slice().buffer], { type: "audio/wav" });
}

export function demoPhotoBlob(kind: "sunrise" | "notebook"): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext("2d")!;
  if (kind === "sunrise") {
    const g = ctx.createLinearGradient(0, 0, 0, 600);
    g.addColorStop(0, "#2a3344");
    g.addColorStop(0.55, "#b0765a");
    g.addColorStop(1, "#f0dfb8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = "#f4c96b";
    ctx.beginPath();
    ctx.arc(400, 430, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1f2735";
    ctx.fillRect(0, 470, 800, 130);
  } else {
    ctx.fillStyle = "#f7f4ec";
    ctx.fillRect(0, 0, 800, 600);
    ctx.strokeStyle = "#e2dccb";
    ctx.lineWidth = 1;
    for (let y = 72; y < 600; y += 44) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(760, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#3d4657";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    // A few pen scribbles, one per line.
    for (const [y, w] of [
      [116, 560],
      [160, 430],
      [204, 610],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(60, y - 8);
      for (let x = 60; x < 60 + w; x += 24) {
        ctx.quadraticCurveTo(x + 12, y - 20 + (x % 48 === 12 ? 10 : 0), x + 24, y - 8);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = "#c9a44a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(60, 232);
    ctx.lineTo(410, 236);
    ctx.stroke();
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not paint the demo photo"))),
      "image/png",
    ),
  );
}
