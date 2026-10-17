import { handler, requireProfile, supabaseAdmin } from "@/lib/supabase/server";

const VIEWS = {
  global: "leaderboard_users", // everyone
  squad: "leaderboard_users", // filtered to the caller's squad below
  squads: "leaderboard_squads",
  wards: "leaderboard_wards",
} as const;

export const GET = handler(async (req) => {
  const profile = await requireProfile(req);
  const url = new URL(req.url);
  const scope = (url.searchParams.get("scope") ?? "global") as keyof typeof VIEWS;
  const monthly = url.searchParams.get("period") === "month";
  if (!(scope in VIEWS)) return Response.json({ error: "Bad scope" }, { status: 400 });

  const me = { id: profile.id, squad_id: profile.squad_id, ward: profile.ward };
  if (scope === "squad" && !profile.squad_id) return Response.json({ rows: [], me, noSquad: true });

  let query = supabaseAdmin()
    .from(VIEWS[scope] + (monthly ? "_monthly" : ""))
    .select("*")
    .order("xp", { ascending: false })
    .limit(50);
  if (scope === "squad") query = query.eq("squad_id", profile.squad_id!);
  const { data, error } = await query;
  if (error) throw error;
  return Response.json({ rows: data ?? [], me });
});
