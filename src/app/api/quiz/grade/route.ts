import { z } from "zod";
import { PASS_RATIO } from "@/lib/ai/quiz";
import { attemptsUsed, awardSubmission, MAX_ATTEMPTS_PER_QUEST } from "@/lib/server/game";
import { HttpError, handler, requireProfile, supabaseAdmin } from "@/lib/supabase/server";
import type { Quest } from "@/lib/types";

const Body = z.object({ quest_id: z.string().uuid(), answers: z.record(z.string(), z.number().int()) });

export const POST = handler(async (req) => {
  const profile = await requireProfile(req);
  const { quest_id, answers } = Body.parse(await req.json());
  const db = supabaseAdmin();

  const { data: q } = await db.from("quests").select("*").eq("id", quest_id).eq("user_id", profile.id).maybeSingle();
  if (!q) throw new HttpError(404, "Quest not found");
  const quest = q as Quest;
  if (quest.tier !== "learn") throw new HttpError(400, "Not a quiz quest");
  if (quest.status === "completed") throw new HttpError(409, "Already completed");
  if (quest.status !== "accepted") throw new HttpError(409, "Start the quest first");
  if ((await attemptsUsed(quest.id)) >= MAX_ATTEMPTS_PER_QUEST) {
    throw new HttpError(429, "Out of attempts. Reroll for a new quest.");
  }

  const { data: questions } = await db.from("quiz_questions").select("id, answer_idx").eq("quest_id", quest.id);
  if (!questions?.length) throw new HttpError(409, "Quiz not ready");

  const correct = questions.filter((qq) => answers[qq.id] === qq.answer_idx).length;
  const score = correct / questions.length;
  const passed = score >= PASS_RATIO;
  // Tell the user which ones they missed, but never reveal the right answers.
  const wrong = questions.filter((qq) => answers[qq.id] !== qq.answer_idx).map((qq) => qq.id);

  const { data: sub, error } = await db
    .from("submissions")
    .insert({ quest_id: quest.id, user_id: profile.id, quiz_score: score, reject_reason: passed ? null : `Scored ${correct}/${questions.length}` })
    .select("id")
    .single();
  if (error) throw error;

  if (!passed) {
    const left = MAX_ATTEMPTS_PER_QUEST - (await attemptsUsed(quest.id));
    return Response.json({ approved: false, correct, total: questions.length, wrong, reason: `You got ${correct}/${questions.length}. You need ${Math.ceil(PASS_RATIO * questions.length)} to pass.`, retriesLeft: left });
  }

  const award = await awardSubmission(sub.id, quest, profile.id);
  if (!award) throw new HttpError(409, "Already awarded");
  return Response.json({ ...award, correct, total: questions.length, wrong });
});
