"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Button, Card, ErrorNote, Gate, Spinner, TopBar } from "@/components/ui";
import { useI18n, type T } from "@/i18n";

type Row = { id: string; date: string; issue: string; ward: number | null; title: string; tier: "learn" | "act" | "lead"; minutes: number; counts: boolean; verifiedBy: "quiz" | "squad" | "photo" };
type Hours = { username: string; rows: Row[]; summary: { countedMinutes: number; learningMinutes: number; hours: number; goal: number; progress: number } };

const fmt = (t: T, m: number) => {
  if (m < 60) return t("hours.fmtMin", { m });
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${t("hours.fmtH", { h })} ${t("hours.fmtMin", { m: rest })}` : t("hours.fmtH", { h });
};

/** Progress ring toward Ontario's 40 hours. */
function Ring({ progress, label }: { progress: number; label: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 128 128" className="h-32 w-32" role="img" aria-label={label}>
      <defs>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="0.55" stopColor="#db2777" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
      {progress > 0 && <circle cx="64" cy="64" r={r} fill="none" stroke="url(#ring)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${c * progress} ${c}`} transform="rotate(-90 64 64)" />}
    </svg>
  );
}

function HoursInner() {
  const { api } = useApp();
  const { t, lang } = useI18n();
  const [data, setData] = useState<Hours | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<Hours>("/api/hours")
      .then((r) => !cancelled && setData(r))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [api]);

  if (!data) return error ? <ErrorNote message={error} /> : <Spinner />;
  const { summary } = data;
  const counted = data.rows.filter((r) => r.counts);
  const date = (iso: string | Date) => new Date(iso).toLocaleDateString(lang === "en" ? "en-CA" : lang);

  return (
    <>
      <div className="no-print">
        <TopBar title={t("hours.title")} />
      </div>

      <Card className="flex items-center gap-4">
        <div className="relative shrink-0">
          <Ring progress={summary.progress} label={t("hours.ringLabel", { hours: summary.hours, goal: summary.goal })} />
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="font-display text-2xl font-bold">{summary.hours}</p>
              <p className="text-[11px] text-muted">{t("hours.ofGoal", { goal: summary.goal })}</p>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <p className="font-display text-lg font-bold">{t("hours.ontario")}</p>
          <p className="text-sm text-muted">{t("hours.explainer", { goal: summary.goal })}</p>
          {summary.learningMinutes > 0 && <p className="text-xs text-muted">{t("hours.learning", { time: fmt(t, summary.learningMinutes) })}</p>}
        </div>
      </Card>

      <div className="no-print mt-3 flex gap-2">
        <Button variant="fun" className="flex-1" onClick={() => window.print()} disabled={!counted.length}>
          🖨️ {t("hours.print")}
        </Button>
        <Link href="/profile">
          <Button variant="soft">{t("common.back")}</Button>
        </Link>
      </div>

      {/* Printable log */}
      <Card className="mt-4 p-0">
        <div className="border-b border-line p-4">
          <h2 className="font-bold">{t("hours.logTitle", { name: data.username })}</h2>
          <p className="text-xs text-muted">{t("hours.generated", { date: date(new Date()) })}</p>
        </div>
        {counted.length === 0 ? (
          <p className="p-4 text-sm text-muted">{t("hours.empty")}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-line">
                <th className="p-3">{t("hours.date")}</th>
                <th className="p-3">{t("hours.activity")}</th>
                <th className="p-3 text-right">{t("hours.time")}</th>
              </tr>
            </thead>
            <tbody>
              {counted.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="whitespace-nowrap p-3 align-top text-xs text-muted">{date(r.date)}</td>
                  <td className="p-3 align-top">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted">
                      {r.issue}
                      {r.ward ? ` · ${t("common.ward", { n: r.ward })}` : ""} · {t(`hours.by.${r.verifiedBy}`)}
                    </p>
                  </td>
                  <td className="whitespace-nowrap p-3 text-right align-top tabular-nums">{fmt(t, r.minutes)}</td>
                </tr>
              ))}
              <tr>
                <td className="p-3" />
                <td className="p-3 font-bold">{t("hours.total")}</td>
                <td className="p-3 text-right font-bold tabular-nums">{fmt(t, summary.countedMinutes)}</td>
              </tr>
            </tbody>
          </table>
        )}
        <div className="space-y-4 border-t border-line p-4 text-xs text-muted">
          <p>{t("hours.disclaimer")}</p>
          <div className="grid grid-cols-2 gap-6 pt-4">
            <div className="border-t border-current pt-1">{t("hours.studentSig")}</div>
            <div className="border-t border-current pt-1">{t("hours.supervisorSig")}</div>
          </div>
        </div>
      </Card>
    </>
  );
}

export default function HoursPage() {
  return (
    <Gate>
      <HoursInner />
    </Gate>
  );
}
