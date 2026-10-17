import { handler, requireProfile, supabaseAdmin } from "@/lib/supabase/server";

const VIEWS = {
  users: "leaderboard_users",
  squads: "leaderboard_squads",
  wards: "leaderboard_wards",
} as const;

export const GET = handler(async (req) => {
  const profile = await requireProfile(req);
  const url = new URL(req.url);
  const scope = (url.searchParams.get("scope") ?? "users") as keyof typeof VIEWS;
  const monthly = url.searchParams.get("period") === "month";
  if (!(scope in VIEWS)) return Response.json({ error: "Bad scope" }, { status: 400 });

  const view = VIEWS[scope] + (monthly ? "_monthly" : "");
  const { data, error } = await supabaseAdmin().from(view).select("*").order("xp", { ascending: false }).limit(50);
  if (error) throw error;
  return Response.json({ rows: data ?? [], me: { id: profile.id, squad_id: profile.squad_id, ward: profile.ward } });
});
