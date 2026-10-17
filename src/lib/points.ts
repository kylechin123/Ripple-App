// Ripple points engine. Pure functions only: the server is the only caller,
// and every input comes from the database, never from the client.

export type Tier = "learn" | "act" | "lead";
export type TaskType = "quiz" | "report" | "cleanup" | "design" | "tutor" | "code" | "event";
export type Rubric = { time: number; effort: number; impact: number };

export const TIER_WEIGHT: Record<Tier, number> = { learn: 1, act: 2, lead: 3 };

type Range = [number, number];
export const RUBRIC_RANGES: Record<TaskType, { time: Range; effort: Range; impact: Range }> = {
  quiz: { time: [1, 2], effort: [1, 2], impact: [1, 2] },
  report: { time: [1, 2], effort: [1, 3], impact: [2, 3] },
  cleanup: { time: [2, 4], effort: [2, 4], impact: [2, 4] },
  design: { time: [2, 4], effort: [2, 4], impact: [1, 3] },
  tutor: { time: [3, 5], effort: [3, 4], impact: [3, 5] },
  code: { time: [3, 5], effort: [3, 5], impact: [2, 5] },
  event: { time: [3, 5], effort: [3, 5], impact: [3, 5] },
};

export const ACT_TASK_TYPES: TaskType[] = ["report", "cleanup", "design", "tutor", "code"];

export const STRETCH_CAP = 0.5; // multiplier never exceeds 1 + STRETCH_CAP
export const CONFIDENCE_COMPLETIONS = 5; // verified completions before stretch is fully trusted
export const REPEAT_DECAY = 0.8;
export const REPEAT_FLOOR = 0.4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Clamp an AI-proposed rubric into the allowed range for its task type. */
export function clampRubric(taskType: TaskType, rubric: Rubric): Rubric {
  const r = RUBRIC_RANGES[taskType];
  const fix = (v: number, [lo, hi]: Range) => clamp(Math.round(Number.isFinite(v) ? v : lo), lo, hi);
  return { time: fix(rubric.time, r.time), effort: fix(rubric.effort, r.effort), impact: fix(rubric.impact, r.impact) };
}

export function rubricSum(r: Rubric) {
  return r.time + r.effort + r.impact;
}

/** Difficulty is derived from the rubric (1–5), so it can never disagree with base points. */
export function difficultyOf(r: Rubric) {
  return clamp(Math.ceil(rubricSum(r) / 3), 1, 5);
}

export function basePoints(tier: Tier, r: Rubric) {
  return TIER_WEIGHT[tier] * 10 * rubricSum(r);
}

export function stretchMultiplier(difficulty: number, stretchLevel: number, verifiedCount: number) {
  const confidence = Math.min(1, Math.max(0, verifiedCount) / CONFIDENCE_COMPLETIONS);
  const gap = clamp((difficulty - stretchLevel) / 2, 0, 1);
  return 1 + STRETCH_CAP * gap * confidence;
}

/** n = verified completions of the same task type in the last 7 days. */
export function repeatMultiplier(n: number) {
  return Math.max(REPEAT_FLOOR, REPEAT_DECAY ** Math.max(0, n));
}

/** Level only moves up, and only after a verified completion. */
export function nextStretchLevel(level: number, difficulty: number) {
  return Math.max(level, level + 0.2 * (difficulty - level));
}

export type Award = {
  base: number;
  stretch: number;
  repeat: number;
  xp: number;
  coins: number;
  newLevel: number;
};

export function computeAward(input: {
  tier: Tier;
  rubric: Rubric;
  stretchLevel: number;
  verifiedCount: number;
  sameTypeRecent: number;
}): Award {
  const base = basePoints(input.tier, input.rubric);
  const difficulty = difficultyOf(input.rubric);
  const stretch = stretchMultiplier(difficulty, input.stretchLevel, input.verifiedCount);
  const repeat = repeatMultiplier(input.sameTypeRecent);
  const xp = Math.round(base * stretch * repeat);
  return {
    base,
    stretch: Math.round(stretch * 100) / 100,
    repeat: Math.round(repeat * 100) / 100,
    xp,
    coins: Math.floor(xp / 10),
    newLevel: nextStretchLevel(input.stretchLevel, difficulty),
  };
}
