import { computeBadges, type Activity } from "@/lib/badges";
import { handler, requireProfile, supabaseAdmin } from "@/lib/supabase/server";

/** Weekly streak + badges for the caller, computed from verified submissions. */
export const GET = handler(async (req) => {
  const profile = await requireProfile(req);
  const db = supabaseAdmin();
  const [{ data: subs, error }, { count: redemptions }] = await Promise.all([
    db
      .from("submissions")
      .select("created_at, task_type, quests(tier, issues(category))")
      .eq("user_id", profile.id)
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(500),
    db.from("redemptions").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
  ]);
  if (error) throw error;

  const activity: Activity[] = (subs ?? []).map((s) => {
    const q = s.quests as unknown as { tier: Activity["tier"]; issues: { category: string } | null } | null;
    return { created_at: s.created_at, task_type: s.task_type, tier: q?.tier ?? null, category: q?.issues?.category ?? null };
  });
  return Response.json(computeBadges({ activity, xp: profile.xp, inSquad: Boolean(profile.squad_id), redemptions: redemptions ?? 0, now: new Date() }));
});
