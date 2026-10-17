// Volunteer hours, estimated from each verified quest's rubric time score.
// Ontario high-school students need 40 hours of community involvement to graduate.

import type { Rubric, Tier } from "./points";

export const ONTARIO_HOURS_GOAL = 40;

/** Rubric time anchors (see src/lib/ai/quests.ts): 1 <10 min, 2 10-30, 3 30-60, 4 1-2 h, 5 >2 h. */
const MINUTES_BY_TIME: Record<number, number> = { 1: 10, 2: 20, 3: 45, 4: 90, 5: 150 };

export function estimatedMinutes(rubric: Rubric) {
  return MINUTES_BY_TIME[Math.min(5, Math.max(1, Math.round(rubric.time)))];
}

/** Learning (reading a brief + quiz) is shown but doesn't count toward community-involvement hours. */
export function countsTowardHours(tier: Tier) {
  return tier === "act" || tier === "lead";
}

export type HoursRow = { tier: Tier; rubric: Rubric };

export function summarizeHours(rows: HoursRow[]) {
  let counted = 0;
  let learning = 0;
  for (const r of rows) {
    const m = estimatedMinutes(r.rubric);
    if (countsTowardHours(r.tier)) counted += m;
    else learning += m;
  }
  const hours = Math.round((counted / 60) * 10) / 10;
  return {
    countedMinutes: counted,
    learningMinutes: learning,
    hours,
    goal: ONTARIO_HOURS_GOAL,
    progress: Math.min(1, hours / ONTARIO_HOURS_GOAL),
  };
}
