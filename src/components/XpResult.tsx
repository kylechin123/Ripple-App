"use client";

import confetti from "canvas-confetti";
import { useEffect } from "react";
import { useT } from "@/i18n";
import type { AwardResult } from "@/lib/types";
import { Card } from "./ui";

export function XpResult({ award, note }: { award: AwardResult; note?: string }) {
  const t = useT();
  useEffect(() => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#7c3aed", "#db2777", "#f97316", "#fbbf24", "#ffffff"] });
  }, []);
  return (
    <Card className="animate-pop border-brand text-center">
      <p className="text-sm font-bold text-brand">🎉 {t("xp.verified")}</p>
      <p className="mt-1 font-display text-5xl font-bold tabular-nums text-grad">+{award.xp} XP</p>
      <p className="mt-1 text-sm text-muted">{t("xp.coins", { n: award.coins })}</p>
      <div className="mt-4 rounded-xl bg-surface-2 px-3 py-2 font-mono text-xs text-muted">
        {t("xp.formula", { base: award.base, stretch: award.stretch.toFixed(2), repeat: award.repeat.toFixed(2) })} = <span className="font-bold text-fg">{award.xp} XP</span>
      </div>
      {award.repeat < 1 && <p className="mt-2 text-xs text-muted">{t("xp.repeatNote")}</p>}
      {award.stretch > 1 && <p className="mt-2 text-xs text-muted">{t("xp.stretchNote")}</p>}
      {note && <p className="mt-2 text-sm">{note}</p>}
    </Card>
  );
}
