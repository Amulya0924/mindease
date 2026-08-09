export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface MoodEntry {
  id: string;
  mood: "awesome" | "good" | "okay" | "down" | "anxious";
  note: string;
  timestamp: string;
}

export interface JournalEntry {
  id: string;
  content: string;
  timestamp: string;
  analysis?: string;
  isAnalyzing?: boolean;
}

export interface CrisisResource {
  id: string;
  name: string;
  phone: string;
  description: string;
  tags: string[];
}

export interface BreathingPattern {
  name: string;
  inhale: number; // in seconds
  hold1: number;
  exhale: number;
  hold2: number;
  description: string;
}
