"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n";
import type { MessageKey } from "@/i18n/en";
import type { Badge } from "@/lib/badges";
import { useApp } from "./AppProvider";
import { Card } from "./ui";

export type AchievementsData = { streak: { weeks: number; activeThisWeek: boolean }; badges: Badge[] };

export function useAchievements() {
  const { api, profile } = useApp();
  const [data, setData] = useState<AchievementsData | null>(null);
  // Refetch when XP changes (a quest was just verified).
  const xp = profile?.xp;
  useEffect(() => {
    let cancelled = false;
    api<AchievementsData>("/api/achievements")
      .then((r) => !cancelled && setData(r))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api, xp]);
  return data;
}

/** Compact streak pill for headers. */
export function StreakPill({ weeks, active }: { weeks: number; active: boolean }) {
  const t = useT();
  return (
    <span
      title={active ? t("streak.activeTitle") : t("streak.keepTitle")}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${weeks > 0 ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"}`}
    >
      🔥 {t("streak.weeks", { n: weeks })}
      {weeks > 0 && !active ? ` · ${t("streak.keepGoing")}` : ""}
    </span>
  );
}

export function BadgeGrid({ data }: { data: AchievementsData }) {
  const t = useT();
  const name = (b: Badge) => t(`badge.${b.id}.name` as MessageKey);
  const desc = (b: Badge) => t(`badge.${b.id}.desc` as MessageKey);
  const earned = data.badges.filter((b) => b.earned).length;
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">🏅 {t("badges.title")}</h2>
        <span className="text-xs font-semibold text-muted">
          {t("badges.unlocked", { n: earned, total: data.badges.length })}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {data.badges.map((b) => (
          <div key={b.id} className="flex flex-col items-center text-center" title={`${name(b)}: ${desc(b)}`}>
            <div
              className={`grid h-14 w-14 place-items-center rounded-2xl text-2xl transition ${
                b.earned ? "bg-grad shadow-[0_6px_16px_-6px_rgba(219,39,119,0.7)]" : "bg-surface-2 opacity-60 grayscale"
              }`}
            >
              {b.icon}
            </div>
            <p className="mt-1 text-[11px] font-semibold leading-tight">{name(b)}</p>
            {!b.earned && b.goal > 1 && (
              <p className="text-[10px] text-muted tabular-nums">
                {b.progress}/{b.goal}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
