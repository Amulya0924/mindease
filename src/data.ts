import { BreathingPattern, CrisisResource } from "./types";

export const BREATHING_PRESETS: BreathingPattern[] = [
  {
    name: "Box Breathing",
    inhale: 4,
    hold1: 4,
    exhale: 4,
    hold2: 4,
    description: "Clears the mind, stabilizes the nervous system. Used by medical professionals and first responders."
  },
  {
    name: "4-7-8 Relaxing Breath",
    inhale: 4,
    hold1: 7,
    exhale: 8,
    hold2: 0,
    description: "Natural tranquilizer for the nervous system. Promotes calm and deep sleep."
  },
  {
    name: "Equal Breathing (Sama Vritti)",
    inhale: 5,
    hold1: 0,
    exhale: 5,
    hold2: 0,
    description: "Focuses awareness, balances energy levels, and enhances mindfulness."
  },
  {
    name: "Coherent Breathing (4-0-6-0)",
    inhale: 4,
    hold1: 0,
    exhale: 6,
    hold2: 0,
    description: "Excellent for anxiety. Extended exhales signal safe, resting state to your body."
  }
];

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    id: "telemanas",
    name: "Tele-MANAS (Govt of India)",
    phone: "14416 or 1800-891-4416",
    description: "Union Health Ministry's 24/7 mental health helpline providing free, confidential counseling and psychological support in major Indian regional languages.",
    tags: ["24/7", "Free", "Govt of India", "Multilingual"]
  },
  {
    id: "kiranhelpline",
    name: "KIRAN Mental Health Helpline",
    phone: "1800-599-0019",
    description: "Free and stable 24/7 rehabilitation helpline launched by the Ministry of Social Justice and Empowerment for early screening, mental health first-aid, and distress management.",
    tags: ["24/7", "Govt of India", "Free Support"]
  },
  {
    id: "vandrevala",
    name: "Vandrevala Foundation Helpline",
    phone: "+91-9999 666 555",
    description: "Free, confidential 24/7 support line staffed by fully trained professional psychologists to assist individuals facing mental distress, suicidal thoughts, or relationship pressures.",
    tags: ["24/7", "Free", "Psychologists", "Confidential"]
  },
  {
    id: "sneha_india",
    name: "SNEHA India Foundation",
    phone: "+91-44-2464 0050",
    description: "A voluntary organisation offering compassionate, non-judgmental support for anyone experiencing loneliness, deep sorrow, or thoughts of self-harm in India.",
    tags: ["Confidential", "Voluntary", "Emotional Support"]
  }
];

export const MOOD_DETAILS = {
  awesome: { emoji: "🌸", label: "Joyful", color: "text-emerald-500 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/35" },
  good: { emoji: "☀️", label: "Calm / Content", color: "text-sky-500 bg-sky-50 border-sky-200 dark:bg-sky-950/20 dark:border-sky-900/35" },
  okay: { emoji: "🍃", label: "Balanced", color: "text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-800" },
  down: { emoji: "🌧️", label: "Tired / Sad", color: "text-indigo-500 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/35" },
  anxious: { emoji: "🌊", label: "Overwhelmed", color: "text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/35" },
};
export type MoodKey = keyof typeof MOOD_DETAILS;
