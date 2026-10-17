import { describe, expect, it } from "vitest";
import {
  RUBRIC_RANGES,
  clampRubric,
  computeAward,
  nextStretchLevel,
  repeatMultiplier,
  rubricSum,
  stretchMultiplier,
  type Rubric,
  type TaskType,
  type Tier,
} from "./points";

const allRubrics: Rubric[] = [];
for (let t = 1; t <= 5; t++)
  for (let e = 1; e <= 5; e++) for (let i = 1; i <= 5; i++) allRubrics.push({ time: t, effort: e, impact: i });

// XP depends on the rubric only through its sum, so one representative per sum (3..15) covers all 125 rubrics.
const xpBySum: Rubric[] = [];
for (const r of allRubrics) if (!xpBySum[rubricSum(r) - 3]) xpBySum[rubricSum(r) - 3] = r;

describe("points engine", () => {
  it("xp depends on the rubric only through its sum", () => {
    const s = { tier: "act" as const, stretchLevel: 1.5, verifiedCount: 3, sameTypeRecent: 1 };
    for (const r of allRubrics)
      expect(computeAward({ ...s, rubric: r }).xp).toBe(computeAward({ ...s, rubric: xpBySum[rubricSum(r) - 3] }).xp);
  });

  it("a harder rubric always yields strictly more XP for the same user state", () => {
    const tiers: Tier[] = ["learn", "act", "lead"];
    const states = [];
    for (const stretchLevel of [1, 1.7, 2.5, 3.3, 5])
      for (const verifiedCount of [0, 2, 5, 40])
        for (const sameTypeRecent of [0, 1, 3, 10]) states.push({ stretchLevel, verifiedCount, sameTypeRecent });

    for (const tier of tiers)
      for (const s of states)
        for (let i = 1; i < xpBySum.length; i++) {
          const hard = computeAward({ tier, rubric: xpBySum[i], ...s }).xp;
          const easy = computeAward({ tier, rubric: xpBySum[i - 1], ...s }).xp;
          expect(hard).toBeGreaterThan(easy);
        }
  });

  it("new users with no verified history get exactly 1.0x", () => {
    for (let d = 1; d <= 5; d++) expect(stretchMultiplier(d, 1, 0)).toBe(1);
  });

  it("stretch is capped at 1.5x", () => {
    for (let d = 1; d <= 5; d++)
      for (const lvl of [0, 1, 2, 3])
        for (const n of [0, 5, 100]) expect(stretchMultiplier(d, lvl, n)).toBeLessThanOrEqual(1.5);
    expect(stretchMultiplier(5, 1, 100)).toBe(1.5);
  });

  it("easy quests below your level give no stretch bonus", () => {
    expect(stretchMultiplier(1, 3, 50)).toBe(1);
  });

  it("stretch level never decreases", () => {
    for (const lvl of [1, 2.2, 4]) for (let d = 1; d <= 5; d++) expect(nextStretchLevel(lvl, d)).toBeGreaterThanOrEqual(lvl);
  });

  it("repeat decay starts at 1 and floors at 0.4", () => {
    expect(repeatMultiplier(0)).toBe(1);
    expect(repeatMultiplier(1)).toBeCloseTo(0.8);
    expect(repeatMultiplier(5)).toBe(0.4);
    expect(repeatMultiplier(50)).toBe(0.4);
  });

  it("clamps AI rubrics into each task type's range", () => {
    for (const [type, range] of Object.entries(RUBRIC_RANGES) as [TaskType, (typeof RUBRIC_RANGES)[TaskType]][]) {
      const hi = clampRubric(type, { time: 99, effort: 99, impact: 99 });
      const lo = clampRubric(type, { time: -3, effort: 0, impact: NaN });
      expect(hi).toEqual({ time: range.time[1], effort: range.effort[1], impact: range.impact[1] });
      expect(lo).toEqual({ time: range.time[0], effort: range.effort[0], impact: range.impact[0] });
    }
  });

  it("coins are xp / 10 rounded down", () => {
    const a = computeAward({ tier: "act", rubric: { time: 3, effort: 3, impact: 3 }, stretchLevel: 1, verifiedCount: 0, sameTypeRecent: 0 });
    expect(a.xp).toBe(180);
    expect(a.coins).toBe(18);
  });
});
