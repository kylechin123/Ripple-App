"use client";

import { useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import { Card } from "./ui";

type Impact = {
  total_xp: number;
  month_xp: number;
  quests_completed: number;
  members: number;
  issues_tackled: number;
  byType: { task_type: string; completed: number; xp: number }[];
  you: { xp: number; share: number };
};

const TYPE_META: Record<string, { icon: string; label: string }> = {
  quiz: { icon: "📖", label: "briefs learned" },
  cleanup: { icon: "🌿", label: "cleanups" },
  report: { icon: "📣", label: "reports filed" },
  design: { icon: "🎨", label: "designs made" },
  tutor: { icon: "🤝", label: "people helped" },
  code: { icon: "💻", label: "tools built" },
  event: { icon: "👥", label: "squad actions" },
};

/** "Total global impact": every Ripple user's contribution added together. */
export function ImpactCard({ compact = false }: { compact?: boolean }) {
  const { api } = useApp();
  const [impact, setImpact] = useState<Impact | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<Impact>("/api/impact")
      .then((r) => !cancelled && setImpact(r))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api]);

  if (!impact) return <Card className={`${compact ? "h-24" : "h-44"} animate-pulse bg-surface-2`} />;

  const pct = impact.you.share * 100;
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-brand to-brand-strong text-white dark:text-[#04201d]">
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">🌍 Total global impact</p>
      <p className="mt-1 text-3xl font-black tabular-nums">{impact.total_xp.toLocaleString()} XP</p>
      <p className="text-sm opacity-90">
        contributed by {impact.members.toLocaleString()} people · {impact.quests_completed.toLocaleString()} quests completed
      </p>

      {!compact && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/15 p-2">
              <p className="text-lg font-bold tabular-nums">{impact.month_xp.toLocaleString()}</p>
              <p className="text-[11px] opacity-80">XP this month</p>
            </div>
            <div className="rounded-xl bg-white/15 p-2">
              <p className="text-lg font-bold tabular-nums">{impact.issues_tackled}</p>
              <p className="text-[11px] opacity-80">issues tackled</p>
            </div>
            <div className="rounded-xl bg-white/15 p-2">
              <p className="text-lg font-bold tabular-nums">{pct > 0 && pct < 0.1 ? "<0.1" : pct.toFixed(1)}%</p>
              <p className="text-[11px] opacity-80">is yours</p>
            </div>
          </div>
          {impact.byType.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-90">
              {impact.byType.map((t) => (
                <span key={t.task_type}>
                  {TYPE_META[t.task_type]?.icon ?? "✅"} {t.completed} {TYPE_META[t.task_type]?.label ?? t.task_type}
                </span>
              ))}
            </div>
          )}
        </>
      )}
      {compact && impact.you.xp > 0 && <p className="mt-1 text-xs opacity-80">Your share: {pct > 0 && pct < 0.1 ? "<0.1" : pct.toFixed(1)}%</p>}
    </Card>
  );
}
