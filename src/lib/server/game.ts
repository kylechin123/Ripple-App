import "server-only";
import { randomUUID } from "node:crypto";
import { DEMO_QUESTS } from "@/data/demo-quests";
import { generateQuestSet, type GeneratedSet } from "@/lib/ai/quests";
import { generateQuiz, type Quiz } from "@/lib/ai/quiz";
import { hasAnthropicKey, isDemoMode } from "@/lib/ai/client";
import { distanceMeters } from "@/lib/geo";
import { basePoints, clampRubric, computeAward, difficultyOf, type Rubric, type TaskType, type Tier } from "@/lib/points";
import { HttpError, supabaseAdmin } from "@/lib/supabase/server";
import type { AwardResult, Issue, Profile, Quest } from "@/lib/types";

const db = () => supabaseAdmin();

export const MAX_REROLLS_PER_DAY = 3;
export const MAX_ATTEMPTS_PER_QUEST = 3;
export const PROOF_WINDOW_HOURS = 48;
export const LEAD_FRIENDS_REQUIRED = 2;

const aiEnabled = () => !isDemoMode() && hasAnthropicKey();

// ---------- Issue selection ----------

export async function candidateIssues(profile: Profile, loc: { lat: number; lng: number } | null): Promise<Issue[]> {
  const { data, error } = await db().from("issues").select("*");
  if (error) throw error;
  const issues = (data ?? []) as Issue[];
  if (!issues.length) throw new HttpError(500, "No issues seeded. Run `npm run seed`.");

  if (loc) {
    return issues
      .filter((i) => i.lat != null && i.lng != null)
      .sort((a, b) => distanceMeters(loc.lat, loc.lng, a.lat!, a.lng!) - distanceMeters(loc.lat, loc.lng, b.lat!, b.lng!))
      .slice(0, 8);
  }
  const weight = (i: Issue) => profile.category_weights?.[i.category] ?? 0;
  return [...issues].sort((a, b) => weight(b) - weight(a) || (a.seeded_from === "hand" ? -1 : 1)).slice(0, 8);
}

// ---------- Quest set creation ----------

async function recentlySkippedSlugs(userId: string): Promise<string[]> {
  const { data } = await db()
    .from("quests")
    .select("issues(slug)")
    .eq("user_id", userId)
    .eq("status", "skipped")
    .order("created_at", { ascending: false })
    .limit(9);
  const slugs = (data ?? []).map((r) => (r.issues as unknown as { slug: string } | null)?.slug).filter(Boolean) as string[];
  return [...new Set(slugs)];
}

function demoSetFor(candidates: Issue[], avoid: string[]): GeneratedSet {
  const pick =
    candidates.find((i) => DEMO_QUESTS[i.slug] && !avoid.includes(i.slug)) ??
    candidates.find((i) => DEMO_QUESTS[i.slug]) ??
    ({ slug: Object.keys(DEMO_QUESTS)[0] } as Issue);
  return DEMO_QUESTS[pick.slug].set;
}

function questRow(
  profile: Profile,
  issue: Issue,
  setId: string,
  tier: Tier,
  fields: { title: string; brief_md?: string; task: string; task_type: TaskType; verification: Quest["verification"]; rubric: Rubric },
  matchReason: string,
  target: { lat: number | null; lng: number | null },
) {
  const rubric = clampRubric(fields.task_type, fields.rubric);
  return {
    user_id: profile.id,
    issue_id: issue.id,
    set_id: setId,
    tier,
    title: fields.title,
    brief_md: fields.brief_md ?? "",
    task: fields.task,
    task_type: fields.task_type,
    verification: fields.verification,
    rubric,
    difficulty: difficultyOf(rubric),
    base_points: basePoints(tier, rubric),
    match_reason: matchReason,
    status: "offered" as const,
    target_lat: target.lat,
    target_lng: target.lng,
  };
}

/** Generate a new learn/act/lead trio. Any unfinished offered/accepted quests are marked skipped. */
export async function createQuestSet(profile: Profile, loc: { lat: number; lng: number } | null, isReroll: boolean, forcedSlug?: string) {
  if (isReroll) {
    const today = new Date().toISOString().slice(0, 10);
    const used = profile.rerolls_date === today ? profile.rerolls_today : 0;
    if (used >= MAX_REROLLS_PER_DAY) throw new HttpError(429, `You've used all ${MAX_REROLLS_PER_DAY} rerolls today`);
    await db().from("profiles").update({ rerolls_today: used + 1, rerolls_date: today }).eq("id", profile.id);
  }

  // Retire the current set (only quests that aren't done).
  const { data: open } = await db()
    .from("quests")
    .select("id, issue_id, issues(category)")
    .eq("user_id", profile.id)
    .in("status", ["offered", "accepted"]);
  if (open?.length) {
    await db().from("quests").update({ status: "skipped" }).in("id", open.map((q) => q.id));
    const category = (open[0].issues as unknown as { category: string } | null)?.category;
    if (isReroll && category) await bumpCategory(profile, category, -0.2);
  }

  let candidates = await candidateIssues(profile, loc);
  let avoid = await recentlySkippedSlugs(profile.id);
  if (forcedSlug) {
    const { data: forced } = await db().from("issues").select("*").eq("slug", forcedSlug).maybeSingle();
    if (forced) {
      candidates = [forced as Issue];
      avoid = [];
    }
  }

  let set: GeneratedSet;
  let source: "ai" | "demo" = "demo";
  if (aiEnabled()) {
    try {
      set = await generateQuestSet(profile, candidates, avoid);
      source = "ai";
    } catch (err) {
      console.error("Quest generation failed; falling back to demo quests", err);
      set = demoSetFor(candidates, avoid);
    }
  } else {
    set = demoSetFor(candidates, avoid);
  }

  let issue = candidates.find((i) => i.slug === set.issue_slug);
  if (!issue) {
    const { data } = await db().from("issues").select("*").eq("slug", set.issue_slug).single();
    issue = data as Issue;
  }

  const setId = randomUUID();
  const actTarget = set.act.location_based ? { lat: issue.lat, lng: issue.lng } : { lat: null, lng: null };
  const rows = [
    questRow(profile, issue, setId, "learn", { title: set.learn.title, brief_md: set.learn.brief_md, task: "Read the brief, then pass the quiz (3 of 4 correct).", task_type: "quiz", verification: "quiz", rubric: set.learn.rubric }, set.match_reason, { lat: null, lng: null }),
    questRow(profile, issue, setId, "act", { title: set.act.title, task: set.act.task, task_type: set.act.task_type, verification: set.act.location_based && issue.lat != null ? "photo_gps" : "photo", rubric: set.act.rubric }, set.match_reason, actTarget),
    questRow(profile, issue, setId, "lead", { title: set.lead.title, task: set.lead.task, task_type: "event", verification: "squad", rubric: set.lead.rubric }, set.match_reason, { lat: null, lng: null }),
  ];
  const { data: inserted, error } = await db().from("quests").insert(rows).select("*");
  if (error) throw error;

  // Seed the quiz now when we have a pre-written one, so opening the quest is instant.
  const learn = (inserted as Quest[]).find((q) => q.tier === "learn")!;
  if (source === "demo" && DEMO_QUESTS[issue.slug]) await insertQuiz(learn.id, DEMO_QUESTS[issue.slug].quiz);

  await bumpCategory(profile, issue.category, 0.1);
  return { setId, source };
}

// ---------- Quiz ----------

async function insertQuiz(questId: string, quiz: Quiz) {
  const { error } = await db()
    .from("quiz_questions")
    .insert(quiz.map((q, position) => ({ quest_id: questId, position, question: q.question, options: q.options, answer_idx: q.answer_idx })));
  if (error) throw error;
}

/** Returns quiz questions WITHOUT answers, generating them on first open. */
export async function ensureQuiz(quest: Quest, issueSlug: string) {
  const load = () =>
    db().from("quiz_questions").select("id, position, question, options").eq("quest_id", quest.id).order("position");
  let { data } = await load();
  if (!data?.length) {
    let quiz: Quiz | null = null;
    if (aiEnabled()) {
      try {
        quiz = await generateQuiz(quest.brief_md);
      } catch (err) {
        console.error("Quiz generation failed; falling back", err);
      }
    }
    quiz ??= DEMO_QUESTS[issueSlug]?.quiz ?? null;
    if (!quiz) throw new HttpError(503, "Couldn't create a quiz right now. Try again in a moment.");
    await insertQuiz(quest.id, quiz);
    ({ data } = await load());
  }
  return data ?? [];
}

// ---------- Unlocking ----------

export async function setQuests(setId: string, userId: string): Promise<Quest[]> {
  const { data, error } = await db().from("quests").select("*").eq("set_id", setId).eq("user_id", userId);
  if (error) throw error;
  const order: Record<Tier, number> = { learn: 0, act: 1, lead: 2 };
  return ((data ?? []) as Quest[]).sort((a, b) => order[a.tier] - order[b.tier]);
}

export function isUnlocked(quest: Quest, siblings: Quest[]) {
  if (quest.tier === "learn") return true;
  const prev = siblings.find((q) => q.tier === (quest.tier === "act" ? "learn" : "act"));
  return prev?.status === "completed";
}

// ---------- Behavior learning ----------

export async function bumpCategory(profile: Profile, category: string, delta: number) {
  const weights = { ...(profile.category_weights ?? {}) };
  weights[category] = Math.round(((weights[category] ?? 0) + delta) * 100) / 100;
  profile.category_weights = weights;
  await db().from("profiles").update({ category_weights: weights }).eq("id", profile.id);
}

// ---------- Awarding ----------

async function sameTypeRecentCount(userId: string, taskType: string) {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { count, error } = await db()
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("approved", true)
    .eq("task_type", taskType)
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Award points for an already-inserted (unapproved) submission. All inputs come from the DB.
 * The RPC is idempotent: a double-submit awards once.
 */
export async function awardSubmission(submissionId: string, quest: Quest, profileId: string): Promise<AwardResult | null> {
  const { data: fresh } = await db().from("profiles").select("*").eq("id", profileId).single();
  const profile = fresh as Profile;
  const award = computeAward({
    tier: quest.tier,
    rubric: quest.rubric,
    stretchLevel: profile.stretch_level,
    verifiedCount: profile.verified_count,
    sameTypeRecent: await sameTypeRecentCount(profile.id, quest.task_type),
  });
  const { data: ok, error } = await db().rpc("award_submission", {
    p_submission: submissionId,
    p_xp: award.xp,
    p_coins: award.coins,
    p_new_level: award.newLevel,
  });
  if (error) throw error;
  if (!ok) return null;

  const { data: issue } = await db().from("issues").select("category").eq("id", quest.issue_id).single();
  if (issue) await bumpCategory(profile, issue.category, 0.3);
  if (quest.tier === "act") await checkLeadCompletions(quest.issue_id);

  return { approved: true, xp: award.xp, coins: award.coins, base: award.base, stretch: award.stretch, repeat: award.repeat };
}

/** People who count toward `leaderId`'s Lead quest: squadmates or friends they invited. */
async function recruitIds(leader: Profile): Promise<string[]> {
  const ors = [`invited_by.eq.${leader.id}`];
  if (leader.squad_id) ors.push(`squad_id.eq.${leader.squad_id}`);
  const { data } = await db().from("profiles").select("id").or(ors.join(",")).neq("id", leader.id);
  return (data ?? []).map((r) => r.id);
}

export async function leadProgress(leader: Profile, issueId: string) {
  const recruits = await recruitIds(leader);
  if (!recruits.length) return { done: 0, required: LEAD_FRIENDS_REQUIRED };
  const { data } = await db()
    .from("submissions")
    .select("user_id, quests!inner(issue_id, tier)")
    .eq("approved", true)
    .in("user_id", recruits)
    .eq("quests.issue_id", issueId)
    .eq("quests.tier", "act");
  const done = new Set((data ?? []).map((r) => r.user_id)).size;
  return { done, required: LEAD_FRIENDS_REQUIRED };
}

/** After any Act completion on an issue, see whether someone's Lead quest is now satisfied. */
export async function checkLeadCompletions(issueId: string) {
  const { data: leads } = await db().from("quests").select("*").eq("issue_id", issueId).eq("tier", "lead").in("status", ["offered", "accepted"]);
  for (const lead of (leads ?? []) as Quest[]) {
    const siblings = await setQuests(lead.set_id, lead.user_id);
    if (!isUnlocked(lead, siblings)) continue;
    const { data: leader } = await db().from("profiles").select("*").eq("id", lead.user_id).single();
    if (!leader) continue;
    const { done, required } = await leadProgress(leader as Profile, issueId);
    if (done < required) continue;
    const { data: sub, error } = await db()
      .from("submissions")
      .insert({ quest_id: lead.id, user_id: lead.user_id, ai_verdict: { reason: `${done} friends completed the Act quest` } })
      .select("id")
      .single();
    if (error) throw error;
    await awardSubmission(sub.id, lead, lead.user_id);
  }
}

export async function attemptsUsed(questId: string) {
  const { count } = await db()
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("quest_id", questId)
    .eq("approved", false);
  return count ?? 0;
}
