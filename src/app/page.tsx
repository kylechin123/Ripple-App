"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { clearInviteIssue, readInvite, readInviteIssue, useApp } from "@/components/AppProvider";
import { ImpactCard } from "@/components/ImpactCard";
import { Button, Card, ErrorNote, Gate, Spinner, TopBar } from "@/components/ui";
import { getPosition } from "@/lib/client-utils";
import type { Issue, Quest } from "@/lib/types";

type QuestSet = { setId: string; issue: Issue; matchReason: string | null; quests: Quest[] };
type Feed = {
  sets: QuestSet[];
  maxActive: number;
  newLeftToday: number;
  completed: { id: string; title: string; tier: string; completed_at: string }[];
};

const TIER_META = {
  learn: { label: "Learn", icon: "📖" },
  act: { label: "Act", icon: "🛠️" },
  lead: { label: "Lead", icon: "📣" },
} as const;

const CATEGORY_ICON: Record<string, string> = { environment: "🌿", food: "🥫", newcomers: "🤝", accessibility: "♿" };

function SetCard({ set, onSkip }: { set: QuestSet; onSkip: () => void }) {
  const done = set.quests.filter((q) => q.status === "completed").length;
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            {CATEGORY_ICON[set.issue.category] ?? "📍"} {set.issue.ward ? `Ward ${set.issue.ward}` : "York Region"} · {done}/3 done
          </p>
          <h2 className="mt-1 text-lg font-bold leading-snug">{set.issue.title}</h2>
          {set.matchReason && <p className="mt-1 text-sm text-muted">{set.matchReason}</p>}
        </div>
        <Button variant="ghost" className="shrink-0 px-2 py-1 text-xs" onClick={onSkip}>
          Skip
        </Button>
      </div>

      <div className="space-y-2">
        {set.quests.map((q) => {
          const meta = TIER_META[q.tier];
          const isDone = q.status === "completed";
          const started = q.status === "accepted";
          return (
            <Link key={q.id} href={`/quest/${q.id}`} className="block">
              <div className={`flex items-center gap-3 rounded-xl border p-3 transition ${isDone ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand"}`}>
                <span className="text-2xl" aria-hidden>
                  {isDone ? "✅" : meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {meta.label}
                    {started && <span className="ml-2 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] text-gold">In progress</span>}
                  </p>
                  <p className="truncate font-medium">{q.title}</p>
                </div>
                <span className="shrink-0 rounded-full bg-surface-2 px-2 py-1 text-xs font-semibold tabular-nums">{q.base_points} XP</span>
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
  const [feed, setFeed] = useState<Feed | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Safe to read localStorage here: <Gate> only mounts this after the client has loaded.
  const [inviteIssue, setInviteIssue] = useState<string | null>(readInviteIssue);

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
    setBusy(issueSlug ? "Joining your friend's quest…" : "Finding a quest that fits you…");
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
      <TopBar title={`Hey ${profile?.username ?? ""} 👋`} />
      <div className="mb-4">
        <ImpactCard compact />
      </div>
      <ErrorNote message={error} />

      {inviteIssue && !hasInviteSet && (
        <Card className="mb-4 border-brand">
          <p className="text-sm font-semibold">🤝 A friend invited you to their quest</p>
          <p className="mt-1 text-xs text-muted">Doing the same quest helps them complete their Lead tier.</p>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" onClick={() => addSet(inviteIssue)}>
              Join their quest
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                clearInviteIssue();
                setInviteIssue(null);
              }}
            >
              Not now
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-muted">
          Your quests ({feed.sets.length}/{feed.maxActive})
        </h2>
        <p className="text-xs text-muted">Do any tier, in any order</p>
      </div>

      <div className="space-y-4">
        {feed.sets.map((s) => (
          <SetCard key={s.setId} set={s} onSkip={() => skipSet(s)} />
        ))}

        {feed.sets.length === 0 ? (
          <Card className="text-center">
            <p className="text-3xl">🌊</p>
            <h2 className="mt-2 text-lg font-bold">{feed.completed.length ? "All caught up!" : "Ready for a quest?"}</h2>
            <p className="mt-1 text-sm text-muted">We&apos;ll match a local issue to your interests.</p>
            <Button className="mt-4 w-full" disabled={!canAdd} onClick={() => addSet()}>
              Find a quest
            </Button>
          </Card>
        ) : (
          <Button variant="soft" className="w-full" disabled={!canAdd} onClick={() => addSet()}>
            + Add another quest
          </Button>
        )}
        <p className="text-center text-xs text-muted">
          {feed.sets.length >= feed.maxActive
            ? `You can run ${feed.maxActive} quests at once. Finish or skip one to add more.`
            : `${feed.newLeftToday} new quests left today`}
        </p>
      </div>

      {feed.completed.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-muted">Recently completed</h3>
          <div className="space-y-2">
            {feed.completed.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <span>✅</span>
                <span className="flex-1 truncate">{c.title}</span>
                <span className="text-xs uppercase text-muted">{c.tier}</span>
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
