"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { IssueArt } from "@/components/IssueArt";
import { Button, Card, ErrorNote, Gate, Spinner } from "@/components/ui";
import { XpResult } from "@/components/XpResult";
import { useT } from "@/i18n";
import { getDemoLocation, getPosition, renderBrief, resizeImage } from "@/lib/client-utils";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { TIER_META } from "@/lib/tiers";
import type { AwardResult, Issue, PublicQuizQuestion, Quest } from "@/lib/types";

type Detail = {
  quest: Quest;
  issue: Issue;
  brief: string;
  quiz: PublicQuizQuestion[] | null;
  lead: { done: number; required: number } | null;
  attemptsLeft: number;
  proofWindowHours: number;
  siblings: { id: string; tier: Quest["tier"]; status: Quest["status"]; title: string }[];
  inviteUrl: string;
};

type Outcome = (AwardResult & { reason?: string }) | { approved: false; reason: string; retriesLeft?: number; wrong?: string[] };

function QuestInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { api, refresh, session } = useApp();
  const t = useT();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showBrief, setShowBrief] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const tierLabel = (tier: Quest["tier"]) => `${TIER_META[tier].icon} ${t(TIER_META[tier].label)}`;

  const load = useCallback(async () => {
    try {
      setD(await api<Detail>(`/api/quests/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [api, id]);

  // State resets per quest because the page keys this component by id.
  useEffect(() => {
    let cancelled = false;
    api<Detail>(`/api/quests/${id}`)
      .then((detail) => {
        if (cancelled) return;
        setD(detail);
        setShowBrief(detail.quest.tier === "learn");
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  async function run<R>(label: string, fn: () => Promise<R>) {
    setError(null);
    setBusy(label);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const accept = () =>
    run(t("quest.starting"), async () => {
      await api(`/api/quests/${id}`, { body: { action: "accept" } });
      await load();
    });

  const skip = () =>
    run(t("quest.skipping"), async () => {
      await api(`/api/quests/${id}`, { body: { action: "skip" } });
      router.replace("/");
    });

  const submitQuiz = () =>
    run(t("quest.checking"), async () => {
      const r = await api<Outcome>("/api/quiz/grade", { body: { quest_id: id, answers } });
      setOutcome(r);
      if (r.approved) await refresh();
      await load();
    });

  async function onPhoto(file: File | undefined) {
    if (!file || !d || !session) return;
    await run(t("quest.verifying"), async () => {
      const [blob, pos] = await Promise.all([resizeImage(file), getPosition()]);
      const path = `${session.user.id}/${id}-${Date.now()}.jpg`;
      const { error: upErr } = await supabaseBrowser().storage.from("proofs").upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw new Error(t("quest.uploadFailed", { msg: upErr.message }));
      const r = await api<Outcome>("/api/verify", {
        body: { quest_id: id, photo_path: path, lat: pos?.lat ?? null, lng: pos?.lng ?? null, accuracy: pos?.accuracy ?? null, demo_location: getDemoLocation() },
      });
      setOutcome(r);
      if (r.approved) await refresh();
      await load();
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  if (!d) return error ? <ErrorNote message={error} /> : <Spinner />;
  const { quest, issue } = d;
  const done = quest.status === "completed";
  const started = quest.status === "accepted";
  // Suggest whichever tier in this set is still open (tiers can be done in any order).
  const next = d.siblings.find((s) => s.id !== quest.id && s.status !== "completed" && s.status !== "skipped");

  return (
    <div className="pt-4">
      <Link href="/" className="text-sm font-semibold text-muted">
        ← {t("common.back")}
      </Link>

      <div className="relative mt-3 overflow-hidden rounded-3xl shadow-[0_10px_28px_-12px_rgba(124,58,237,0.55)]">
        <IssueArt category={issue.category} className="h-32 w-full" />
        <div className="absolute inset-x-3 bottom-3 flex gap-1 rounded-2xl bg-white/85 p-1 backdrop-blur">
          {d.siblings.map((s) => (
            <Link
              key={s.id}
              href={`/quest/${s.id}`}
              className={`flex-1 rounded-xl py-2 text-center text-xs font-bold transition ${s.id === quest.id ? "bg-grad text-white shadow" : "text-[#4c1d95] hover:bg-white"}`}
            >
              {s.status === "completed" ? "✅ " : s.status === "accepted" ? "⏳ " : ""}
              {tierLabel(s.tier)}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-brand">{issue.title}</p>
        <h1 className="mt-1 text-2xl font-bold">{quest.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
          <span className="rounded-full bg-surface-2 px-2.5 py-1">⏱ {t("quest.time", { n: quest.rubric.time })}</span>
          <span className="rounded-full bg-surface-2 px-2.5 py-1">💪 {t("quest.effort", { n: quest.rubric.effort })}</span>
          <span className="rounded-full bg-surface-2 px-2.5 py-1">🌱 {t("quest.impact", { n: quest.rubric.impact })}</span>
          <span className="rounded-full bg-accent-soft px-2.5 py-1 font-bold text-accent">{t("quest.baseXp", { n: quest.base_points })}</span>
        </div>
      </div>

      {d.brief && (
        <Card className="mt-4">
          <button type="button" className="flex w-full items-center justify-between text-left text-sm font-semibold" onClick={() => setShowBrief(!showBrief)}>
            📖 {t("quest.brief")} <span className="text-muted">{showBrief ? "▴" : "▾"}</span>
          </button>
          {showBrief && <div className="prose-brief mt-2 text-sm" dangerouslySetInnerHTML={{ __html: renderBrief(d.brief) }} />}
        </Card>
      )}

      <div className="mt-4 space-y-4">
        {outcome?.approved && <XpResult award={outcome} note={"reason" in outcome ? outcome.reason : undefined} />}
        {outcome && !outcome.approved && (
          <Card className="border-amber-400">
            <p className="font-semibold">{t("quest.notQuite")}</p>
            <p className="mt-1 text-sm text-muted">{outcome.reason}</p>
            {outcome.retriesLeft !== undefined && <p className="mt-1 text-xs text-muted">{t("quest.attemptsLeft", { n: outcome.retriesLeft })}</p>}
          </Card>
        )}
        <ErrorNote message={error} />

        {busy && <Spinner label={busy} />}

        {!busy && done && (
          <Card className="text-center">
            <p className="font-semibold">✅ {t("quest.completed")}</p>
            {next ? (
              <Link href={`/quest/${next.id}`}>
                <Button variant="fun" className="mt-3 w-full">
                  {t("quest.next", { tier: tierLabel(next.tier) })}
                </Button>
              </Link>
            ) : (
              <Link href="/">
                <Button variant="soft" className="mt-3 w-full">
                  {t("quest.backToQuests")}
                </Button>
              </Link>
            )}
          </Card>
        )}

        {!busy && !done && !started && (
          <Card>
            <p className="text-sm">{quest.task}</p>
            {quest.tier === "act" && <p className="mt-2 text-xs text-muted">{t("quest.proofWindow", { h: d.proofWindowHours })}</p>}
            <div className="mt-4 flex gap-2">
              <Button variant="fun" className="flex-1" onClick={accept}>
                ⚡ {t("quest.start")}
              </Button>
              <Button variant="ghost" onClick={skip}>
                {t("common.skip")}
              </Button>
            </div>
          </Card>
        )}

        {!busy && !done && started && quest.tier === "learn" && d.quiz && (
          <Card className="space-y-5">
            <p className="text-sm text-muted">{t("quest.quizHint")}</p>
            {d.quiz.map((q, qi) => {
              const missed = outcome && !outcome.approved && "wrong" in outcome && outcome.wrong?.includes(q.id);
              return (
                <fieldset key={q.id}>
                  <legend className={`mb-2 text-sm font-semibold ${missed ? "text-amber-600" : ""}`}>
                    {qi + 1}. {q.question} {missed && "✗"}
                  </legend>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <label
                        key={oi}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-sm transition ${answers[q.id] === oi ? "border-brand bg-brand-soft" : "border-line hover:border-brand"}`}
                      >
                        <input type="radio" name={q.id} className="accent-[var(--brand)]" checked={answers[q.id] === oi} onChange={() => setAnswers({ ...answers, [q.id]: oi })} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
            <Button variant="fun" className="w-full" disabled={Object.keys(answers).length < d.quiz.length || d.attemptsLeft <= 0} onClick={submitQuiz}>
              {t("quest.submitAnswers")}
            </Button>
          </Card>
        )}

        {!busy && !done && started && quest.tier === "act" && (
          <Card className="space-y-3">
            <p className="text-sm">{quest.task}</p>
            {quest.verification === "photo_gps" && <p className="text-xs text-muted">📍 {t("quest.onSite")}</p>}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            <Button variant="fun" className="w-full" disabled={d.attemptsLeft <= 0} onClick={() => fileRef.current?.click()}>
              📸 {t("quest.takePhoto")}
            </Button>
            <p className="text-center text-xs text-muted">{t("quest.attemptsLeft", { n: d.attemptsLeft })}</p>
          </Card>
        )}

        {!busy && !done && started && quest.tier === "lead" && d.lead && (
          <Card className="space-y-4 text-center">
            <p className="text-sm">{quest.task}</p>
            <div>
              <p className="font-display text-4xl font-bold tabular-nums text-grad">
                {d.lead.done}/{d.lead.required}
              </p>
              <p className="text-xs text-muted">{t("quest.leadProgress")}</p>
            </div>
            <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow">
              <QRCodeSVG value={typeof window !== "undefined" ? window.location.origin + d.inviteUrl : d.inviteUrl} size={160} fgColor="#4c1d95" />
            </div>
            <Button
              variant="soft"
              className="w-full"
              onClick={async () => {
                const url = window.location.origin + d.inviteUrl;
                try {
                  if (navigator.share) await navigator.share({ title: t("quest.shareTitle"), url });
                  else await navigator.clipboard.writeText(url);
                } catch {}
              }}
            >
              {t("quest.share")}
            </Button>
            <p className="text-xs text-muted">{t("quest.squadCounts")}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function QuestPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Gate>
      <QuestInner key={id} />
    </Gate>
  );
}
