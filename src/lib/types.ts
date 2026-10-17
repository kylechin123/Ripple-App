import type { Rubric, TaskType, Tier } from "./points";

export type Permissions = { location: boolean; calendar: boolean; screentime: boolean; health: boolean };

export type Profile = {
  id: string;
  username: string;
  age_band: "minor" | "adult";
  ward: number | null;
  interests: string[];
  skills: string[];
  dislikes: string[];
  weekly_minutes: number;
  permissions: Permissions;
  onboarded: boolean;
  stretch_level: number;
  verified_count: number;
  xp: number;
  coins: number;
  squad_id: string | null;
  invited_by: string | null;
  rerolls_today: number;
  rerolls_date: string;
  category_weights: Record<string, number>;
};

export type Issue = {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  source_url: string | null;
  ward: number | null;
  lat: number | null;
  lng: number | null;
  seeded_from: "open_data" | "hand";
};

export type QuestStatus = "offered" | "accepted" | "skipped" | "completed";

export type Quest = {
  id: string;
  user_id: string;
  issue_id: string;
  set_id: string;
  tier: Tier;
  title: string;
  brief_md: string;
  task: string;
  task_type: TaskType;
  verification: "quiz" | "photo" | "photo_gps" | "squad";
  rubric: Rubric;
  difficulty: number;
  base_points: number;
  match_reason: string | null;
  status: QuestStatus;
  target_lat: number | null;
  target_lng: number | null;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
};

/** Quiz question as sent to the browser: never includes the answer. */
export type PublicQuizQuestion = { id: string; position: number; question: string; options: string[] };

export type AwardResult = {
  approved: true;
  xp: number;
  coins: number;
  base: number;
  stretch: number;
  repeat: number;
};

export type RejectResult = { approved: false; reason: string; retriesLeft?: number };
