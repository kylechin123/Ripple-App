import { z } from "zod";
import { getProfile, handler, requireUser, supabaseAdmin } from "@/lib/supabase/server";

export const GET = handler(async (req) => {
  const { userId } = await requireUser(req);
  const profile = await getProfile(userId);
  let squad = null;
  if (profile?.squad_id) {
    const { data } = await supabaseAdmin().from("squads").select("id, name, ward, invite_code").eq("id", profile.squad_id).single();
    squad = data;
  }
  return Response.json({ profile, squad });
});

const tags = z.array(z.string().trim().min(1).max(40)).max(12);

// Only onboarding/settings fields. xp, coins, stretch_level, etc. are never accepted from the client.
const ProfileInput = z.object({
  username: z.string().trim().min(2).max(24),
  age_band: z.enum(["minor", "adult"]),
  ward: z.number().int().min(1).max(8).nullable(),
  interests: tags,
  skills: tags,
  dislikes: tags,
  weekly_minutes: z.number().int().min(10).max(1200),
  permissions: z.object({ location: z.boolean(), calendar: z.boolean(), screentime: z.boolean(), health: z.boolean() }),
  invited_by: z.string().uuid().nullable().optional(),
});

export const POST = handler(async (req) => {
  const { userId } = await requireUser(req);
  const parsed = ProfileInput.partial().safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid profile" }, { status: 400 });
  const input = parsed.data;
  const db = supabaseAdmin();
  const existing = await getProfile(userId);

  if (!existing) {
    const full = ProfileInput.safeParse(input);
    if (!full.success) return Response.json({ error: "Missing onboarding fields" }, { status: 400 });
    let invitedBy: string | null = null;
    if (input.invited_by && input.invited_by !== userId) {
      const { data } = await db.from("profiles").select("id").eq("id", input.invited_by).maybeSingle();
      invitedBy = data?.id ?? null;
    }
    const { invited_by: _, ...fields } = full.data; // eslint-disable-line @typescript-eslint/no-unused-vars
    const { error } = await db.from("profiles").insert({ id: userId, ...fields, invited_by: invitedBy, onboarded: true });
    if (error) throw error;
  } else {
    const { invited_by: _, ...fields } = input; // eslint-disable-line @typescript-eslint/no-unused-vars -- inviter can't be changed later
    const { error } = await db.from("profiles").update(fields).eq("id", userId);
    if (error) throw error;
  }
  return Response.json({ profile: await getProfile(userId) });
});
