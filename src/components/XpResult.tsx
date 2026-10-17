"use client";

import confetti from "canvas-confetti";
import { useEffect } from "react";
import type { AwardResult } from "@/lib/types";
import { Card } from "./ui";

export function XpResult({ award, note }: { award: AwardResult; note?: string }) {
  useEffect(() => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#0d9488", "#2dd4bf", "#fbbf24", "#ffffff"] });
  }, []);
  return (
    <Card className="animate-pop border-brand text-center">
      <p className="text-sm font-semibold text-brand">Verified ✓</p>
      <p className="mt-1 text-4xl font-black tabular-nums">+{award.xp} XP</p>
      <p className="mt-1 text-sm text-muted">+{award.coins} 🪙 coins to spend on local perks</p>
      <div className="mt-4 rounded-xl bg-surface-2 px-3 py-2 font-mono text-xs text-muted">
        {award.base} base × {award.stretch.toFixed(2)} stretch × {award.repeat.toFixed(2)} repeat = <span className="font-bold text-fg">{award.xp} XP</span>
      </div>
      {award.repeat < 1 && <p className="mt-2 text-xs text-muted">Repeat bonus is lower because you&apos;ve done this kind of task recently. Try something new for full points.</p>}
      {award.stretch > 1 && <p className="mt-2 text-xs text-muted">Stretch bonus: this was harder than your usual quests.</p>}
      {note && <p className="mt-2 text-sm">{note}</p>}
    </Card>
  );
}
