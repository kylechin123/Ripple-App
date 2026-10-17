"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StreakPill, useAchievements } from "@/components/Achievements";
import { clearInviteIssue, readInvite, readInviteIssue, useApp } from "@/components/AppProvider";
import { ImpactCard } from "@/components/ImpactCard";
import { IssueArt } from "@/components/IssueArt";
import { Button, Card, ErrorNote, Gate, Spinner, TopBar } from "@/components/ui";
import { useT } from "@/i18n";
import { getPosition } from "@/lib/client-utils";
import { TIER_META } from "@/lib/tiers";
import type { Issue, Quest } from "@/lib/types";

type QuestSet = { setId: string; issue: Issue; matchReason: string | null; quests: Quest[] };
type Feed = {
  sets: QuestSet[];
  maxActive: number;
  newLeftToday: number;
  completed: { id: string; title: string; tier: Quest["tier"]; completed_at: string }[];
};

const CATEGORY_ICON: Record<string, string> = { environment: "🌿", food: "🥫", newcomers: "🤝", accessibility: "♿" };

function SetCard({ set, onSkip }: { set: QuestSet; onSkip: () => void }) {
  const t = useT();
  const done = set.quests.filter((q) => q.status === "completed").length;
  return (
    <Card className="space-y-3 overflow-hidden p-0">
      <div className="relative">
        <IssueArt category={set.issue.category} className="h-28 w-full" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-brand-strong shadow">
          {CATEGORY_ICON[set.issue.category] ?? "📍"} {set.issue.ward ? t("common.ward", { n: set.issue.ward }) : t("common.yorkRegion")}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">{t("home.doneOf", { done })}</span>
        <button type="button" onClick={onSkip} className="absolute bottom-2 right-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-muted shadow hover:bg-white">
          {t("common.skip")}
        </button>
      </div>
      <div className="px-4">
        <h2 className="text-lg font-bold leading-snug">{set.issue.title}</h2>
        {set.matchReason && <p className="mt-1 text-sm text-muted">{set.matchReason}</p>}
      </div>
      <div className="mx-4 h-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-grad transition-all" style={{ width: `${(done / 3) * 100}%` }} />
      </div>

      <div className="space-y-2 px-4 pb-4">
        {set.quests.map((q) => {
          const meta = TIER_META[q.tier];
          const isDone = q.status === "completed";
          const started = q.status === "accepted";
          return (
            <Link key={q.id} href={`/quest/${q.id}`} className="block">
              <div
                className={`flex items-center gap-3 rounded-2xl border-2 p-3 transition hover:-translate-y-0.5 ${isDone ? "border-transparent bg-brand-soft" : "border-line bg-surface hover:border-brand"}`}
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${isDone ? "bg-grad" : "bg-surface-2"}`} aria-hidden>
                  {isDone ? "✅" : meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {t(meta.label)}
                    {started && <span className="ml-2 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] text-gold">{t("home.inProgress")}</span>}
                  </p>
                  <p className="truncate font-medium">{q.title}</p>
                </div>
                <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent tabular-nums">+{q.base_points} XP</span>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

function HomeInner() {
  const { api, profile, refresh } = useApp();
  const t = useT();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Safe to read localStorage here: <Gate> only mounts this after the client has loaded.
  const [inviteIssue, setInviteIssue] = useState<string | null>(readInviteIssue);
  const achievements = useAchievements();

  const load = useCallback(async () => {
    try {
      setFeed(await api<Feed>("/api/quests"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    api<Feed>("/api/quests")
      .then((f) => !cancelled && setFeed(f))
      .catch((err) => !cancelled && setError(err.message));
    refresh();
    return () => {
      cancelled = true;
    };
  }, [api, refresh]);

  async function addSet(issueSlug?: string) {
    setError(null);
    setBusy(issueSlug ? t("home.joiningFriend") : t("home.finding"));
    try {
      const pos = profile?.permissions.location ? await getPosition() : null;
      await api("/api/quests", { body: { ...(pos ? { lat: pos.lat, lng: pos.lng } : {}), ...(issueSlug ? { issue_slug: issueSlug, invited_by: readInvite() ?? undefined } : {}) } });
      if (issueSlug) {
        clearInviteIssue();
        setInviteIssue(null);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function skipSet(set: QuestSet) {
    const open = set.quests.find((q) => q.status === "offered" || q.status === "accepted");
    if (!open) return;
    setError(null);
    try {
      await api(`/api/quests/${open.id}`, { body: { action: "skip" } });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (busy) return <Spinner label={busy} />;
  if (!feed) return error ? <ErrorNote message={error} /> : <Spinner />;

  const canAdd = feed.sets.length < feed.maxActive && feed.newLeftToday > 0;
  const hasInviteSet = feed.sets.some((s) => s.issue.slug === inviteIssue);

  return (
    <>
      <TopBar title="Ripple" />
      {/* Hero banner (AI-generated art) */}
      <div className="relative -mx-1 mb-4 overflow-hidden rounded-3xl shadow-[0_12px_32px_-12px_rgba(124,58,237,0.6)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset, already compressed */}
        <img src="/images/hero.webp" alt={t("home.heroAlt")} className="h-44 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#3b0764]/85 via-[#3b0764]/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="font-display text-2xl font-bold drop-shadow">{t("home.greeting", { name: profile?.username ?? "" })}</p>
          <p className="text-sm opacity-90">{t("home.tagline")}</p>
          {achievements && (
            <div className="mt-2">
              <StreakPill weeks={achievements.streak.weeks} active={achievements.streak.activeThisWeek} />
            </div>
          )}
        </div>
      </div>
      <div className="mb-4">
        <ImpactCard compact />
      </div>
      <ErrorNote message={error} />

      {inviteIssue && !hasInviteSet && (
        <Card className="mb-4 border-brand">
          <p className="text-sm font-semibold">{t("home.inviteTitle")}</p>
          <p className="mt-1 text-xs text-muted">{t("home.inviteBody")}</p>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" onClick={() => addSet(inviteIssue)}>
              {t("home.inviteJoin")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                clearInviteIssue();
                setInviteIssue(null);
              }}
            >
              {t("common.notNow")}
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-muted">{t("home.yourQuests", { n: feed.sets.length, max: feed.maxActive })}</h2>
        <p className="text-xs text-muted">{t("home.anyOrder")}</p>
      </div>

      <div className="space-y-4">
        {feed.sets.map((s) => (
          <SetCard key={s.setId} set={s} onSkip={() => skipSet(s)} />
        ))}

        {feed.sets.length === 0 ? (
          <Card className="text-center">
            <p className="text-3xl">🌊</p>
            <h2 className="mt-2 text-lg font-bold">{feed.completed.length ? t("home.allCaughtUp") : t("home.ready")}</h2>
            <p className="mt-1 text-sm text-muted">{t("home.matchHint")}</p>
            <Button variant="fun" className="mt-4 w-full" disabled={!canAdd} onClick={() => addSet()}>
              {t("home.findQuest")}
            </Button>
          </Card>
        ) : (
          <Button variant="fun" className="w-full" disabled={!canAdd} onClick={() => addSet()}>
            {t("home.addAnother")}
          </Button>
        )}
        <p className="text-center text-xs text-muted">
          {feed.sets.length >= feed.maxActive ? t("home.maxActive", { max: feed.maxActive }) : t("home.newLeft", { n: feed.newLeftToday })}
        </p>
      </div>

      {feed.completed.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-muted">{t("home.recentlyCompleted")}</h3>
          <div className="space-y-2">
            {feed.completed.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <span>✅</span>
                <span className="flex-1 truncate">{c.title}</span>
                <span className="text-xs uppercase text-muted">{t(TIER_META[c.tier].label)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default function Home() {
  return (
    <Gate>
      <HomeInner />
    </Gate>
  );
}
