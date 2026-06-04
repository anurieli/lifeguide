export type ExperienceId = "text-interview" | "voice-interview";
export type Transport = "text" | "voice";

export type Experience = {
  id: ExperienceId;
  label: string;
  transport: Transport;
  description: string;
};

export const EXPERIENCES: Experience[] = [
  {
    id: "text-interview",
    label: "Type it out",
    transport: "text",
    description: "A calm, one-question-at-a-time written interview.",
  },
  {
    id: "voice-interview",
    label: "Talk it through",
    transport: "voice",
    description: "Speak with the Coach. Continue on your phone if you want to move around.",
  },
];

export const getExperience = (id: string): Experience | undefined =>
  EXPERIENCES.find((e) => e.id === id);
