import type { VoiceProvider, MintedVoiceSession } from "./provider";

export class OpenAIRealtimeAdapter implements VoiceProvider {
  private model: string;

  constructor(model: string) {
    this.model = model;
  }

  async mint(instructions: string): Promise<MintedVoiceSession> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error(
        "No OpenAI API key found. Set OPENAI_API_KEY in the Convex environment.",
      );
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1",
      },
      body: JSON.stringify({
        model: this.model,
        voice: "alloy",
        instructions,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "(unreadable)");
      throw new Error(
        `OpenAI Realtime session mint failed: ${response.status} ${response.statusText} — ${text}`,
      );
    }

    const json = await response.json();
    const clientSecret: string = json.client_secret?.value;
    if (!clientSecret) {
      throw new Error("OpenAI Realtime response missing client_secret.value");
    }

    const expiresAt: number =
      (json.client_secret?.expires_at ?? Date.now() / 1000 + 60) * 1000;

    return { clientSecret, model: this.model, expiresAt };
  }
}
