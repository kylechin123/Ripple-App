import { z } from "zod";
import { handler, requireProfile, supabaseAdmin } from "@/lib/supabase/server";

export const GET = handler(async (req) => {
  const profile = await requireProfile(req);
  const db = supabaseAdmin();
  const [{ data: perks }, { data: redemptions }] = await Promise.all([
    db.from("perks").select("*").order("coin_cost"),
    db.from("redemptions").select("id, code, created_at, perks(business, title, emoji)").eq("user_id", profile.id).order("created_at", { ascending: false }),
  ]);
  return Response.json({ perks: perks ?? [], redemptions: redemptions ?? [], coins: profile.coins, xp: profile.xp });
});

const Body = z.object({ perk_id: z.string().uuid() });

/** Spend coins. XP (and therefore rank) is never touched. */
export const POST = handler(async (req) => {
  const profile = await requireProfile(req);
  const { perk_id } = Body.parse(await req.json());
  const { data: code, error } = await supabaseAdmin().rpc("redeem_perk", { p_user: profile.id, p_perk: perk_id });
  if (error) {
    const msg = error.message.includes("not enough coins") ? "Not enough coins yet" : error.message;
    return Response.json({ error: msg }, { status: 400 });
  }
  return Response.json({ code });
});
