import { countsTowardHours, estimatedMinutes, summarizeHours } from "@/lib/hours";
import type { Rubric, Tier } from "@/lib/points";
import { handler, requireProfile, supabaseAdmin } from "@/lib/supabase/server";

/** Volunteer hours log: one row per verified quest, with estimated minutes. */
export const GET = handler(async (req) => {
  const profile = await requireProfile(req);
  const { data, error } = await supabaseAdmin()
    .from("quests")
    .select("id, title, tier, task_type, verification, rubric, completed_at, issues(title, ward)")
    .eq("user_id", profile.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []).map((q) => {
    const issue = q.issues as unknown as { title: string; ward: number | null } | null;
    const rubric = q.rubric as Rubric;
    return {
      id: q.id,
      date: q.completed_at,
      issue: issue?.title ?? "",
      ward: issue?.ward ?? null,
      title: q.title,
      tier: q.tier as Tier,
      minutes: estimatedMinutes(rubric),
      counts: countsTowardHours(q.tier as Tier),
      verifiedBy: (q.verification === "quiz" ? "quiz" : q.verification === "squad" ? "squad" : "photo") as "quiz" | "squad" | "photo",
    };
  });

  return Response.json({
    username: profile.username,
    rows,
    summary: summarizeHours(rows.map((r) => ({ tier: r.tier, rubric: (data ?? []).find((q) => q.id === r.id)!.rubric as Rubric }))),
  });
});
