import { handler, requireProfile, supabaseAdmin } from "@/lib/supabase/server";

/** Total global impact: everyone's contribution added together, plus the caller's share. */
export const GET = handler(async (req) => {
  const profile = await requireProfile(req);
  const db = supabaseAdmin();
  const [{ data: totals, error }, { data: byType }] = await Promise.all([
    db.from("global_impact").select("*").single(),
    db.from("global_impact_by_type").select("*").order("completed", { ascending: false }),
  ]);
  if (error) throw error;
  const total = totals?.total_xp ?? 0;
  return Response.json({
    ...totals,
    byType: byType ?? [],
    you: { xp: profile.xp, share: total > 0 ? profile.xp / total : 0 },
  });
});
