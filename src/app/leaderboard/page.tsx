"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Card, ErrorNote, Gate, Spinner, TopBar } from "@/components/ui";

type Scope = "users" | "squads" | "wards";
type Row = { id?: string; username?: string; name?: string; ward?: number | null; squad_name?: string | null; members?: number; xp: number };

const SCOPES: { key: Scope; label: string }[] = [
  { key: "users", label: "People" },
  { key: "squads", label: "Squads" },
  { key: "wards", label: "Wards" },
];

function LeaderboardInner() {
  const { api } = useApp();
  const [scope, setScope] = useState<Scope>("squads");
  const [period, setPeriod] = useState<"month" | "all">("month");
  const key = `${scope}:${period}`;
  const [result, setResult] = useState<{ key: string; rows: Row[]; me: { id: string; squad_id: string | null; ward: number | null } } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const data = result?.key === key ? result : null; // show a spinner while a new tab loads

  useEffect(() => {
    let cancelled = false;
    api<{ rows: Row[]; me: { id: string; squad_id: string | null; ward: number | null } }>(`/api/leaderboard?scope=${scope}&period=${period}`)
      .then((r) => !cancelled && setResult({ ...r, key: `${scope}:${period}` }))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [api, scope, period]);

  const monthName = new Date().toLocaleString("en-CA", { month: "long" });

  return (
    <>
      <TopBar title="Leaderboard" />
      <Card className="mb-4 bg-gradient-to-br from-amber-100 to-amber-50 text-amber-900 dark:from-amber-950 dark:to-amber-900 dark:text-amber-100">
        <p className="text-sm font-semibold">🏆 {monthName} prizes</p>
        <p className="mt-1 text-xs">Top 3 squads this month win a pizza night from local sponsors. Top person wins a $50 gift card. (Demo prizes.)</p>
      </Card>

      <div className="mb-3 flex gap-1 rounded-xl bg-surface-2 p-1">
        {SCOPES.map((s) => (
          <button key={s.key} onClick={() => setScope(s.key)} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${scope === s.key ? "bg-surface shadow-sm" : "text-muted"}`}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="mb-4 flex justify-end gap-2 text-xs">
        {(["month", "all"] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={`rounded-full px-3 py-1 ${period === p ? "bg-brand text-white" : "bg-surface-2 text-muted"}`}>
            {p === "month" ? "This month" : "All time"}
          </button>
        ))}
      </div>

      <ErrorNote message={error} />
      {!data ? (
        <Spinner />
      ) : (
        <Card className="divide-y divide-line p-0">
          {data.rows.length === 0 && <p className="p-4 text-sm text-muted">No one here yet.</p>}
          {data.rows.map((r, i) => {
            const mine = (scope === "users" && r.id === data.me.id) || (scope === "squads" && r.id === data.me.squad_id) || (scope === "wards" && r.ward === data.me.ward);
            const name = scope === "users" ? r.username : scope === "squads" ? r.name : `Ward ${r.ward}`;
            const sub = scope === "users" ? r.squad_name ?? (r.ward ? `Ward ${r.ward}` : "") : `${r.members ?? 0} members`;
            return (
              <div key={r.id ?? r.ward ?? i} className={`flex items-center gap-3 px-4 py-3 ${mine ? "bg-brand-soft" : ""}`}>
                <span className="w-6 text-center font-bold tabular-nums text-muted">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {name} {mine && <span className="text-xs text-brand">(you)</span>}
                  </p>
                  {sub && <p className="truncate text-xs text-muted">{sub}</p>}
                </div>
                <span className="font-semibold tabular-nums">{r.xp.toLocaleString()} XP</span>
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}

export default function Leaderboard() {
  return (
    <Gate>
      <LeaderboardInner />
    </Gate>
  );
}
