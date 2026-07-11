// Canonical mood list, shared by the DB schema (CHECK constraint values),
// Zod validation, and the UI. Keep in sync with the memories_mood_check
// constraint in DATABASE.md.

export const MOODS = [
  "joyful",
  "nostalgic",
  "melancholy",
  "energetic",
  "calm",
  "romantic",
  "gritty",
  "dreamy",
] as const;

export type Mood = (typeof MOODS)[number];

export const MOOD_LABEL: Record<Mood, string> = {
  joyful: "Joyful",
  nostalgic: "Nostalgic",
  melancholy: "Melancholy",
  energetic: "Energetic",
  calm: "Calm",
  romantic: "Romantic",
  gritty: "Gritty",
  dreamy: "Dreamy",
};

// Full literal class strings so Tailwind's scanner keeps them (no dynamic
// `mood-${x}` interpolation, which would get purged).
export const MOOD_TEXT: Record<Mood, string> = {
  joyful: "text-mood-joyful",
  nostalgic: "text-mood-nostalgic",
  melancholy: "text-mood-melancholy",
  energetic: "text-mood-energetic",
  calm: "text-mood-calm",
  romantic: "text-mood-romantic",
  gritty: "text-mood-gritty",
  dreamy: "text-mood-dreamy",
};

export const MOOD_BORDER: Record<Mood, string> = {
  joyful: "border-mood-joyful",
  nostalgic: "border-mood-nostalgic",
  melancholy: "border-mood-melancholy",
  energetic: "border-mood-energetic",
  calm: "border-mood-calm",
  romantic: "border-mood-romantic",
  gritty: "border-mood-gritty",
  dreamy: "border-mood-dreamy",
};

export const MOOD_BG: Record<Mood, string> = {
  joyful: "bg-mood-joyful",
  nostalgic: "bg-mood-nostalgic",
  melancholy: "bg-mood-melancholy",
  energetic: "bg-mood-energetic",
  calm: "bg-mood-calm",
  romantic: "bg-mood-romantic",
  gritty: "bg-mood-gritty",
  dreamy: "bg-mood-dreamy",
};
