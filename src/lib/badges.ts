// Weekly streaks and badges, computed from a user's verified activity. Pure: the API passes `now`.

export type Activity = {
  created_at: string; // ISO time the submission was approved
  task_type: string | null;
  tier: "learn" | "act" | "lead" | null; // null for imported history
  category: string | null;
};

export type BadgeContext = {
  activity: Activity[];
  xp: number;
  inSquad: boolean;
  redemptions: number;
  now: Date;
};

export type Badge = { id: string; icon: string; name: string; description: string; earned: boolean; progress: number; goal: number };

/** Monday-based week index (UTC), so "this week" is stable everywhere. */
export function weekIndex(d: Date) {
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
  return Math.floor(monday / (7 * 24 * 3600 * 1000));
}

/**
 * Consecutive weeks with at least one verified quest. A streak stays alive
 * through the current week even if you haven't done anything yet this week.
 */
export function weeklyStreak(activity: Activity[], now: Date) {
  const weeks = new Set(activity.map((a) => weekIndex(new Date(a.created_at))));
  const current = weekIndex(now);
  const activeThisWeek = weeks.has(current);
  let w = activeThisWeek ? current : current - 1;
  let count = 0;
  while (weeks.has(w)) {
    count++;
    w--;
  }
  return { weeks: count, activeThisWeek };
}

export function computeBadges(ctx: BadgeContext): { streak: ReturnType<typeof weeklyStreak>; badges: Badge[] } {
  const a = ctx.activity;
  const count = (fn: (x: Activity) => boolean) => a.filter(fn).length;
  const categories = new Set(a.map((x) => x.category).filter(Boolean));
  const streak = weeklyStreak(a, ctx.now);

  const defs: Omit<Badge, "earned">[] = [
    { id: "first-ripple", icon: "💧", name: "First Ripple", description: "Complete your first verified quest", progress: a.length, goal: 1 },
    { id: "hands-on", icon: "🛠️", name: "Hands On", description: "Get an Act quest photo-verified", progress: count((x) => x.tier === "act"), goal: 1 },
    { id: "quiz-whiz", icon: "🧠", name: "Quiz Whiz", description: "Pass 5 Learn quizzes", progress: count((x) => x.tier === "learn" || x.task_type === "quiz"), goal: 5 },
    { id: "cleanup-crew", icon: "🧹", name: "Cleanup Crew", description: "Do 3 cleanups", progress: count((x) => x.task_type === "cleanup"), goal: 3 },
    { id: "squad-leader", icon: "📣", name: "Squad Leader", description: "Complete a Lead quest", progress: count((x) => x.tier === "lead"), goal: 1 },
    { id: "explorer", icon: "🧭", name: "Explorer", description: "Help with 3 different kinds of issues", progress: categories.size, goal: 3 },
    { id: "on-fire", icon: "🔥", name: "On Fire", description: "Keep a 3-week streak", progress: streak.weeks, goal: 3 },
    { id: "big-splash", icon: "🌊", name: "Big Splash", description: "Earn 1,000 XP", progress: ctx.xp, goal: 1000 },
    { id: "team-player", icon: "🤝", name: "Team Player", description: "Join a squad", progress: ctx.inSquad ? 1 : 0, goal: 1 },
    { id: "local-lover", icon: "🧋", name: "Local Lover", description: "Redeem a perk at a local business", progress: ctx.redemptions, goal: 1 },
  ];
  return {
    streak,
    badges: defs.map((d) => ({ ...d, progress: Math.min(d.progress, d.goal), earned: d.progress >= d.goal })),
  };
}
