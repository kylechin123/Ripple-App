import { z } from "zod";
import {
  attemptsUsed,
  bumpCategory,
  ensureQuiz,
  leadProgress,
  MAX_ATTEMPTS_PER_QUEST,
  PROOF_WINDOW_HOURS,
  setQuests,
} from "@/lib/server/game";
import { HttpError, handler, requireProfile, supabaseAdmin } from "@/lib/supabase/server";
import type { Issue, Quest } from "@/lib/types";

export const maxDuration = 60;

async function loadQuest(id: string, userId: string) {
  const { data } = await supabaseAdmin().from("quests").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) throw new HttpError(404, "Quest not found");
  return data as Quest;
}

export const GET = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const profile = await requireProfile(req);
  const quest = await loadQuest(id, profile.id);
  const siblings = await setQuests(quest.set_id, profile.id);
  const { data: issue } = await supabaseAdmin().from("issues").select("*").eq("id", quest.issue_id).single();

  // Learn tier carries the brief; act/lead show it too so users can re-read.
  const learn = siblings.find((q) => q.tier === "learn");
  const quiz = quest.tier === "learn" && quest.status !== "completed" ? await ensureQuiz(quest, (issue as Issue).slug) : null;
  const lead = quest.tier === "lead" ? await leadProgress(profile, quest.issue_id) : null;
  const attempts = await attemptsUsed(quest.id);

  return Response.json({
    quest,
    issue,
    brief: learn?.brief_md ?? "",
    quiz,
    lead,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS_PER_QUEST - attempts),
    proofWindowHours: PROOF_WINDOW_HOURS,
    siblings: siblings.map((q) => ({ id: q.id, tier: q.tier, status: q.status, title: q.title })),
    inviteUrl: `/?invite=${profile.id}&issue=${encodeURIComponent((issue as Issue).slug)}`,
  });
});

const Body = z.object({ action: z.enum(["accept", "skip"]) });

export const POST = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const profile = await requireProfile(req);
  const { action } = Body.parse(await req.json());
  const quest = await loadQuest(id, profile.id);
  const siblings = await setQuests(quest.set_id, profile.id);
  const db = supabaseAdmin();

  if (action === "accept") {
    if (quest.status === "skipped") throw new HttpError(409, "You skipped this quest. Add a new one from the home screen.");
    if (quest.status === "offered") {
      await db.from("quests").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", quest.id);
    }
    return Response.json({ ok: true });
  }

  // Skip the whole set. Skips never affect the stretch multiplier, only topic preferences.
  const open = siblings.filter((q) => q.status === "offered" || q.status === "accepted").map((q) => q.id);
  if (open.length) await db.from("quests").update({ status: "skipped" }).in("id", open);
  const { data: issue } = await db.from("issues").select("category").eq("id", quest.issue_id).single();
  if (issue) await bumpCategory(profile, issue.category, -0.2);
  return Response.json({ ok: true });
});
