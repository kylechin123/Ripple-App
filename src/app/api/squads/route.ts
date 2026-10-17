import { z } from "zod";
import { HttpError, handler, requireProfile, supabaseAdmin } from "@/lib/supabase/server";

export const GET = handler(async (req) => {
  const profile = await requireProfile(req);
  const db = supabaseAdmin();
  if (!profile.squad_id) return Response.json({ squad: null, members: [], goals: [] });
  const [{ data: squad }, { data: members }, { data: goals }] = await Promise.all([
    db.from("squads").select("id, name, ward, invite_code").eq("id", profile.squad_id).single(),
    db.from("profiles").select("id, username, xp").eq("squad_id", profile.squad_id).order("xp", { ascending: false }),
    db.from("squad_goals").select("id, xp_target, xp_progress, issues(title)").eq("squad_id", profile.squad_id),
  ]);
  return Response.json({ squad, members: members ?? [], goals: goals ?? [] });
});

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("join"), invite_code: z.string().trim().min(4).max(12) }),
  z.object({ action: z.literal("create"), name: z.string().trim().min(2).max(40) }),
  z.object({ action: z.literal("leave") }),
]);

export const POST = handler(async (req) => {
  const profile = await requireProfile(req);
  const body = Body.parse(await req.json());
  const db = supabaseAdmin();

  if (body.action === "leave") {
    await db.from("profiles").update({ squad_id: null }).eq("id", profile.id);
    return Response.json({ ok: true });
  }
  if (body.action === "join") {
    const { data: squad } = await db.from("squads").select("id").eq("invite_code", body.invite_code.toUpperCase()).maybeSingle();
    if (!squad) throw new HttpError(404, "No squad with that code");
    await db.from("profiles").update({ squad_id: squad.id }).eq("id", profile.id);
    return Response.json({ ok: true });
  }
  const { data: squad, error } = await db.from("squads").insert({ name: body.name, ward: profile.ward }).select("id").single();
  if (error) throw error;
  await db.from("profiles").update({ squad_id: squad.id }).eq("id", profile.id);
  return Response.json({ ok: true });
});
