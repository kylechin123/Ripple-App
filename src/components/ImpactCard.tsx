"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n";
import type { MessageKey } from "@/i18n/en";
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

const TYPE_ICON: Record<string, string> = { quiz: "📖", cleanup: "🌿", report: "📣", design: "🎨", tutor: "🤝", code: "💻", event: "👥" };

/** "Total global impact": every Ripple user's contribution added together. */
export function ImpactCard({ compact = false }: { compact?: boolean }) {
  const { api } = useApp();
  const t = useT();
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
    <Card className="overflow-hidden border-transparent bg-grad text-white">
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">🌍 {t("impact.title")}</p>
      <p className="mt-1 text-3xl font-black tabular-nums">{impact.total_xp.toLocaleString()} XP</p>
      <p className="text-sm opacity-90">
        {t("impact.byline", { people: impact.members.toLocaleString(), quests: impact.quests_completed.toLocaleString() })}
      </p>

      {!compact && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/15 p-2">
              <p className="text-lg font-bold tabular-nums">{impact.month_xp.toLocaleString()}</p>
              <p className="text-[11px] opacity-80">{t("impact.month")}</p>
            </div>
            <div className="rounded-xl bg-white/15 p-2">
              <p className="text-lg font-bold tabular-nums">{impact.issues_tackled}</p>
              <p className="text-[11px] opacity-80">{t("impact.issues")}</p>
            </div>
            <div className="rounded-xl bg-white/15 p-2">
              <p className="text-lg font-bold tabular-nums">{pct > 0 && pct < 0.1 ? "<0.1" : pct.toFixed(1)}%</p>
              <p className="text-[11px] opacity-80">{t("impact.yours")}</p>
            </div>
          </div>
          {impact.byType.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-90">
              {impact.byType.map((tt) => (
                <span key={tt.task_type}>
                  {TYPE_ICON[tt.task_type] ?? "✅"} {tt.completed} {TYPE_ICON[tt.task_type] ? t(`impact.type.${tt.task_type}` as MessageKey) : tt.task_type}
                </span>
              ))}
            </div>
          )}
        </>
      )}
      {compact && impact.you.xp > 0 && <p className="mt-1 text-xs opacity-80">{t("impact.share", { pct: pct > 0 && pct < 0.1 ? "<0.1" : pct.toFixed(1) })}</p>}
    </Card>
  );
}
