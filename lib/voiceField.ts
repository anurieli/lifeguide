// The modular "field bundle" that every VoiceField mount carries. It does two jobs:
//   1. describes the field to the PERSON (eyebrow / question / descriptor / placeholder)
//   2. describes the field to the AI (question + descriptor + intent) so the shaping pass
//      and Prompt Mode are about THIS field, not generic.
// Kept deliberately minimal for v1 (see docs/product/features/voice-field.md §9).
export type FieldMeta = {
  /** Stable key — where the answer is saved (e.g. "today.one-move", "s1q0"). Also used for telemetry. */
  id: string;
  /** The question this field asks. Drives both the label and the AI's understanding of the field. */
  question: string;
  /** Optional one-line helper under the question. Also given to the AI as extra framing. */
  descriptor?: string;
  /** Optional placeholder for the idle text input. */
  placeholder?: string;
  /** One short phrase telling the AI what a good answer to this field IS. The single most
   *  important lever for shaping + prompts. e.g. "extract a single concrete action for today". */
  intent: string;
};
