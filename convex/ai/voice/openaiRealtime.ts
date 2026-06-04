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

    // GA Realtime API: ephemeral client secrets are minted at /v1/realtime/client_secrets
    // with a nested `session` config. (The old /v1/realtime/sessions + `OpenAI-Beta: realtime=v1`
    // beta endpoint now 404s "Invalid URL".) The returned `value` is the short-lived key the
    // browser uses as the Bearer for the WebRTC SDP exchange.
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: this.model,
          instructions,
          audio: {
            // Enable streaming transcription of the user's speech (otherwise the
            // `conversation.item.input_audio_transcription.*` events never fire and
            // only the coach's side shows up in the transcript).
            input: { transcription: { model: "gpt-realtime-whisper" } },
            output: { voice: "alloy" },
          },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "(unreadable)");
      throw new Error(
        `OpenAI Realtime session mint failed: ${response.status} ${response.statusText} — ${text}`,
      );
    }

    const json = await response.json();
    const clientSecret: string = json.value;
    if (!clientSecret) {
      throw new Error("OpenAI Realtime response missing client secret value");
    }

    const expiresAt: number = (json.expires_at ?? Date.now() / 1000 + 60) * 1000;

    return { clientSecret, model: this.model, expiresAt };
  }
}
