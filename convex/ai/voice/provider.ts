import { TASKS } from "../config";
import { OpenAIRealtimeAdapter } from "./openaiRealtime";

export interface MintedVoiceSession {
  clientSecret: string;
  model: string;
  expiresAt: number;
}

export interface VoiceProvider {
  mint(instructions: string): Promise<MintedVoiceSession>;
}

/** Returns the voice provider configured in TASKS.voice. */
export function getVoiceProvider(): VoiceProvider {
  const model = TASKS.voice.model;
  return new OpenAIRealtimeAdapter(model);
}
