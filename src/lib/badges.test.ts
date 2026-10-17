import { describe, expect, it } from "vitest";
import { computeBadges, weekIndex, weeklyStreak, type Activity } from "./badges";
import { estimatedMinutes, summarizeHours } from "./hours";

const now = new Date("2026-10-17T15:00:00Z"); // a Saturday
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const act = (d: number, extra: Partial<Activity> = {}): Activity => ({ created_at: daysAgo(d), task_type: "cleanup", tier: "act", category: "environment", ...extra });

describe("weekly streak", () => {
  it("counts consecutive weeks including this one", () => {
    expect(weeklyStreak([act(0), act(7), act(14)], now)).toEqual({ weeks: 3, activeThisWeek: true });
  });
  it("stays alive this week if last week was active", () => {
    expect(weeklyStreak([act(7), act(14)], now)).toEqual({ weeks: 2, activeThisWeek: false });
  });
  it("breaks on a missed week", () => {
    expect(weeklyStreak([act(0), act(21)], now).weeks).toBe(1);
    expect(weeklyStreak([act(14), act(21)], now).weeks).toBe(0);
  });
  it("weeks start on Monday", () => {
    expect(weekIndex(new Date("2026-10-12T00:30:00Z"))).toBe(weekIndex(new Date("2026-10-18T23:00:00Z")));
    expect(weekIndex(new Date("2026-10-19T00:30:00Z"))).toBe(weekIndex(new Date("2026-10-12T00:30:00Z")) + 1);
  });
});

describe("badges", () => {
  it("nothing earned for a brand-new user", () => {
    const { badges } = computeBadges({ activity: [], xp: 0, inSquad: false, redemptions: 0, now });
    expect(badges.every((b) => !b.earned)).toBe(true);
  });
  it("earns badges from activity and clamps progress", () => {
    const activity = [
      act(0),
      act(1),
      act(8),
      act(15, { category: "food", task_type: "design" }),
      act(2, { tier: "learn", task_type: "quiz", category: "newcomers" }),
      act(3, { tier: "lead", task_type: "event" }),
    ];
    const { badges, streak } = computeBadges({ activity, xp: 1500, inSquad: true, redemptions: 2, now });
    const get = (id: string) => badges.find((b) => b.id === id)!;
    expect(streak.weeks).toBe(3);
    for (const id of ["first-ripple", "hands-on", "cleanup-crew", "squad-leader", "explorer", "on-fire", "big-splash", "team-player", "local-lover"]) expect(get(id).earned).toBe(true);
    expect(get("quiz-whiz").earned).toBe(false);
    expect(get("quiz-whiz").progress).toBe(1);
    expect(get("big-splash").progress).toBe(1000);
  });
});

describe("volunteer hours", () => {
  it("maps rubric time to minutes", () => {
    expect([1, 2, 3, 4, 5].map((t) => estimatedMinutes({ time: t, effort: 1, impact: 1 }))).toEqual([10, 20, 45, 90, 150]);
  });
  it("counts Act and Lead but not Learn", () => {
    const s = summarizeHours([
      { tier: "learn", rubric: { time: 2, effort: 1, impact: 1 } },
      { tier: "act", rubric: { time: 4, effort: 3, impact: 3 } },
      { tier: "lead", rubric: { time: 5, effort: 4, impact: 4 } },
    ]);
    expect(s.countedMinutes).toBe(240);
    expect(s.learningMinutes).toBe(20);
    expect(s.hours).toBe(4);
    expect(s.progress).toBeCloseTo(0.1);
  });
});
