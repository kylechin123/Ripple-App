import { z } from "zod";
import { activeSets, createQuestSet, MAX_ACTIVE_SETS, newSetsLeftToday, setQuests } from "@/lib/server/game";
import { handler, requireProfile, supabaseAdmin } from "@/lib/supabase/server";
import type { Issue } from "@/lib/types";

export const maxDuration = 60;

/** All of the user's in-progress quest sets, newest first. Every tier is open. */
export const GET = handler(async (req) => {
  const profile = await requireProfile(req);
  const db = supabaseAdmin();
  const active = await activeSets(profile.id);

  const sets = await Promise.all(
    [...active.keys()].map(async (setId) => {
      const quests = await setQuests(setId, profile.id);
      const { data: issue } = await db.from("issues").select("*").eq("id", quests[0].issue_id).single();
      return { setId, issue: issue as Issue, matchReason: quests[0].match_reason, quests };
    }),
  );

  const { data: done } = await db
    .from("quests")
    .select("id, title, tier, completed_at")
    .eq("user_id", profile.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(10);

  return Response.json({
    sets,
    maxActive: MAX_ACTIVE_SETS,
    newLeftToday: Math.max(0, newSetsLeftToday(profile)),
    completed: done ?? [],
  });
});

const Body = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  issue_slug: z.string().max(80).optional(), // from a friend's invite link
  invited_by: z.string().uuid().optional(),
});

/** Add another quest set (runs in parallel with the others). */
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
  const result = await createQuestSet(profile, loc, body.issue_slug);
  return Response.json(result);
});
