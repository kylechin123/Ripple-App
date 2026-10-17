import { z } from "zod";
import { createQuestSet, isUnlocked, MAX_REROLLS_PER_DAY, setQuests } from "@/lib/server/game";
import { handler, requireProfile, supabaseAdmin } from "@/lib/supabase/server";
import type { Quest } from "@/lib/types";

export const maxDuration = 60;

/** The user's current quest set (most recent set that still has an open quest). */
export const GET = handler(async (req) => {
  const profile = await requireProfile(req);
  const db = supabaseAdmin();
  const { data: latest } = await db
    .from("quests")
    .select("set_id")
    .eq("user_id", profile.id)
    .in("status", ["offered", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);
  const rerollsLeft = MAX_REROLLS_PER_DAY - (profile.rerolls_date === today ? profile.rerolls_today : 0);

  const { data: done } = await db
    .from("quests")
    .select("id, title, tier, completed_at")
    .eq("user_id", profile.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(10);

  if (!latest) return Response.json({ set: null, rerollsLeft, completed: done ?? [] });

  const quests = await setQuests(latest.set_id, profile.id);
  const { data: issue } = await db.from("issues").select("*").eq("id", quests[0].issue_id).single();
  return Response.json({
    set: {
      setId: latest.set_id,
      issue,
      matchReason: quests[0].match_reason,
      quests: quests.map((q: Quest) => ({ ...q, unlocked: isUnlocked(q, quests) })),
    },
    rerollsLeft,
    completed: done ?? [],
  });
});

const Body = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  reroll: z.boolean().optional(),
  issue_slug: z.string().max(80).optional(), // from a friend's invite link
  invited_by: z.string().uuid().optional(),
});

export const POST = handler(async (req) => {
  const profile = await requireProfile(req);
  const body = Body.parse(await req.json().catch(() => ({})));
  // An existing user who opens a friend's invite gets linked to them once, so they count toward the friend's Lead quest.
  if (body.invited_by && !profile.invited_by && body.invited_by !== profile.id) {
    const db = supabaseAdmin();
    const { data: inviter } = await db.from("profiles").select("id").eq("id", body.invited_by).maybeSingle();
    if (inviter) await db.from("profiles").update({ invited_by: inviter.id }).eq("id", profile.id);
  }
  // Location is used for this request only and never stored.
  const loc = profile.permissions.location && body.lat != null && body.lng != null ? { lat: body.lat, lng: body.lng } : null;
  const result = await createQuestSet(profile, loc, Boolean(body.reroll) && !body.issue_slug, body.issue_slug);
  return Response.json(result);
});
