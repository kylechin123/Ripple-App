"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Button, Card, ErrorNote, Gate, Spinner } from "@/components/ui";
import { XpResult } from "@/components/XpResult";
import { getDemoLocation, getPosition, renderBrief, resizeImage } from "@/lib/client-utils";
import { supabaseBrowser } from "@/lib/supabase/browser";
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

const TIER_LABEL = { learn: "📖 Learn", act: "🛠️ Act", lead: "📣 Lead" };

function QuestInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { api, refresh, session } = useApp();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showBrief, setShowBrief] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function run<T>(label: string, fn: () => Promise<T>) {
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
    run("Starting…", async () => {
      await api(`/api/quests/${id}`, { body: { action: "accept" } });
      await load();
    });

  const skip = () =>
    run("Skipping…", async () => {
      await api(`/api/quests/${id}`, { body: { action: "skip" } });
      router.replace("/");
    });

  const submitQuiz = () =>
    run("Checking your answers…", async () => {
      const r = await api<Outcome>("/api/quiz/grade", { body: { quest_id: id, answers } });
      setOutcome(r);
      if (r.approved) await refresh();
      await load();
    });

  async function onPhoto(file: File | undefined) {
    if (!file || !d || !session) return;
    await run("Verifying your photo…", async () => {
      const [blob, pos] = await Promise.all([resizeImage(file), getPosition()]);
      const path = `${session.user.id}/${id}-${Date.now()}.jpg`;
      const { error: upErr } = await supabaseBrowser().storage.from("proofs").upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
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
      <Link href="/" className="text-sm text-muted">
        ← Back
      </Link>

      <div className="mt-3 flex gap-1 rounded-xl bg-surface-2 p-1">
        {d.siblings.map((s) => (
          <Link
            key={s.id}
            href={`/quest/${s.id}`}
            className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold ${s.id === quest.id ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            {s.status === "completed" ? "✅ " : s.status === "accepted" ? "⏳ " : ""}
            {TIER_LABEL[s.tier]}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">{issue.title}</p>
        <h1 className="mt-1 text-2xl font-bold">{quest.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
          <span className="rounded-full bg-surface-2 px-2 py-1">⏱ time {quest.rubric.time}/5</span>
          <span className="rounded-full bg-surface-2 px-2 py-1">💪 effort {quest.rubric.effort}/5</span>
          <span className="rounded-full bg-surface-2 px-2 py-1">🌱 impact {quest.rubric.impact}/5</span>
          <span className="rounded-full bg-brand-soft px-2 py-1 font-semibold text-brand-ink">{quest.base_points} base XP</span>
        </div>
      </div>

      {d.brief && (
        <Card className="mt-4">
          <button type="button" className="flex w-full items-center justify-between text-left text-sm font-semibold" onClick={() => setShowBrief(!showBrief)}>
            The brief <span className="text-muted">{showBrief ? "▴" : "▾"}</span>
          </button>
          {showBrief && <div className="prose-brief mt-2 text-sm" dangerouslySetInnerHTML={{ __html: renderBrief(d.brief) }} />}
        </Card>
      )}

      <div className="mt-4 space-y-4">
        {outcome?.approved && <XpResult award={outcome} note={"reason" in outcome ? outcome.reason : undefined} />}
        {outcome && !outcome.approved && (
          <Card className="border-amber-400">
            <p className="font-semibold">Not quite</p>
            <p className="mt-1 text-sm text-muted">{outcome.reason}</p>
            {outcome.retriesLeft !== undefined && <p className="mt-1 text-xs text-muted">{outcome.retriesLeft} attempts left</p>}
          </Card>
        )}
        <ErrorNote message={error} />

        {busy && <Spinner label={busy} />}

        {!busy && done && (
          <Card className="text-center">
            <p className="font-semibold">✅ Completed</p>
            {next ? (
              <Link href={`/quest/${next.id}`}>
                <Button className="mt-3 w-full">Next: {TIER_LABEL[next.tier]} →</Button>
              </Link>
            ) : (
              <Link href="/">
                <Button variant="soft" className="mt-3 w-full">
                  Back to quests
                </Button>
              </Link>
            )}
          </Card>
        )}

        {!busy && !done && !started && (
          <Card>
            <p className="text-sm">{quest.task}</p>
            {quest.tier === "act" && <p className="mt-2 text-xs text-muted">Once you start, you have {d.proofWindowHours}h to submit photo proof.</p>}
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={accept}>
                Start quest
              </Button>
              <Button variant="ghost" onClick={skip}>
                Skip
              </Button>
            </div>
          </Card>
        )}

        {!busy && !done && started && quest.tier === "learn" && d.quiz && (
          <Card className="space-y-5">
            <p className="text-sm text-muted">Answer 3 of 4 correctly to pass. Everything&apos;s in the brief above.</p>
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
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${answers[q.id] === oi ? "border-brand bg-brand-soft" : "border-line"}`}
                      >
                        <input type="radio" name={q.id} className="accent-[var(--brand)]" checked={answers[q.id] === oi} onChange={() => setAnswers({ ...answers, [q.id]: oi })} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
            <Button className="w-full" disabled={Object.keys(answers).length < d.quiz.length || d.attemptsLeft <= 0} onClick={submitQuiz}>
              Submit answers
            </Button>
          </Card>
        )}

        {!busy && !done && started && quest.tier === "act" && (
          <Card className="space-y-3">
            <p className="text-sm">{quest.task}</p>
            {quest.verification === "photo_gps" && <p className="text-xs text-muted">📍 Take the photo on site. We&apos;ll check your location when you submit.</p>}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
            <Button className="w-full" disabled={d.attemptsLeft <= 0} onClick={() => fileRef.current?.click()}>
              📸 Take proof photo
            </Button>
            <p className="text-center text-xs text-muted">{d.attemptsLeft} attempts left</p>
          </Card>
        )}

        {!busy && !done && started && quest.tier === "lead" && d.lead && (
          <Card className="space-y-4 text-center">
            <p className="text-sm">{quest.task}</p>
            <div>
              <p className="text-3xl font-black tabular-nums">
                {d.lead.done}/{d.lead.required}
              </p>
              <p className="text-xs text-muted">friends or squadmates have finished the Act quest on this issue</p>
            </div>
            <div className="mx-auto w-fit rounded-xl bg-white p-3">
              <QRCodeSVG value={typeof window !== "undefined" ? window.location.origin + d.inviteUrl : d.inviteUrl} size={160} />
            </div>
            <Button
              variant="soft"
              className="w-full"
              onClick={async () => {
                const url = window.location.origin + d.inviteUrl;
                try {
                  if (navigator.share) await navigator.share({ title: "Join me on Ripple", url });
                  else await navigator.clipboard.writeText(url);
                } catch {}
              }}
            >
              Share invite link
            </Button>
            <p className="text-xs text-muted">Squadmates count too. Join or create a squad from your profile.</p>
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
