"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { clearInviteIssue, readInvite, readInviteIssue, useApp } from "@/components/AppProvider";
import { Button, Card, ErrorNote, Gate, Spinner, TopBar } from "@/components/ui";
import { getPosition } from "@/lib/client-utils";
import type { Issue, Quest } from "@/lib/types";

type FeedQuest = Quest & { unlocked: boolean };
type Feed = {
  set: { setId: string; issue: Issue; matchReason: string | null; quests: FeedQuest[] } | null;
  rerollsLeft: number;
  completed: { id: string; title: string; tier: string; completed_at: string }[];
};

const TIER_META = {
  learn: { label: "Learn", icon: "📖" },
  act: { label: "Act", icon: "🛠️" },
  lead: { label: "Lead", icon: "📣" },
} as const;

const CATEGORY_ICON: Record<string, string> = { environment: "🌿", food: "🥫", newcomers: "🤝", accessibility: "♿" };

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

  async function newSet(reroll: boolean, issueSlug?: string) {
    setError(null);
    setBusy(issueSlug ? "Joining your friend's quest…" : reroll ? "Finding a different quest…" : "Finding a quest that fits you…");
    try {
      const pos = profile?.permissions.location ? await getPosition() : null;
      await api("/api/quests", { body: { reroll, ...(pos ? { lat: pos.lat, lng: pos.lng } : {}), ...(issueSlug ? { issue_slug: issueSlug, invited_by: readInvite() ?? undefined } : {}) } });
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

  if (busy) return <Spinner label={busy} />;
  if (!feed) return error ? <ErrorNote message={error} /> : <Spinner />;

  const set = feed.set;
  return (
    <>
      <TopBar title={`Hey ${profile?.username ?? ""} 👋`} />
      <ErrorNote message={error} />

      {inviteIssue && inviteIssue !== set?.issue.slug && (
        <Card className="mb-4 border-brand">
          <p className="text-sm font-semibold">🤝 A friend invited you to their quest</p>
          <p className="mt-1 text-xs text-muted">Doing the same quest helps them complete their Lead tier.</p>
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" onClick={() => newSet(false, inviteIssue)}>
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

      {set ? (
        <Card className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              {CATEGORY_ICON[set.issue.category] ?? "📍"} For you · {set.issue.ward ? `Ward ${set.issue.ward}` : "York Region"}
            </p>
            <h2 className="mt-1 text-xl font-bold">{set.issue.title}</h2>
            {set.matchReason && <p className="mt-1 text-sm text-muted">{set.matchReason}</p>}
          </div>

          <div className="space-y-2">
            {set.quests.map((q) => {
              const meta = TIER_META[q.tier];
              const done = q.status === "completed";
              const body = (
                <div
                  className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                    done ? "border-brand bg-brand-soft" : q.unlocked ? "border-line bg-surface hover:border-brand" : "border-line bg-surface-2 opacity-60"
                  }`}
                >
                  <span className="text-2xl" aria-hidden>
                    {done ? "✅" : q.unlocked ? meta.icon : "🔒"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{meta.label}</p>
                    <p className="truncate font-medium">{q.title}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface-2 px-2 py-1 text-xs font-semibold tabular-nums">{q.base_points} XP</span>
                </div>
              );
              return q.unlocked || done ? (
                <Link key={q.id} href={`/quest/${q.id}`} className="block">
                  {body}
                </Link>
              ) : (
                <div key={q.id}>{body}</div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">{feed.rerollsLeft} rerolls left today</p>
            <Button variant="ghost" disabled={feed.rerollsLeft <= 0} onClick={() => newSet(true)}>
              ↻ Different quest
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="text-center">
          <p className="text-3xl">🌊</p>
          <h2 className="mt-2 text-lg font-bold">{feed.completed.length ? "Quest set complete!" : "Ready for a quest?"}</h2>
          <p className="mt-1 text-sm text-muted">We&apos;ll match a local issue to your interests.</p>
          <Button className="mt-4 w-full" onClick={() => newSet(false)}>
            Find my next quest
          </Button>
        </Card>
      )}

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
