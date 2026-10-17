import { activeSets } from "@/lib/server/game";
import { handler, requireProfile, supabaseAdmin } from "@/lib/supabase/server";

/** Issues with coordinates, plus the caller's quest status on each and how many people have helped. */
export const GET = handler(async (req) => {
  const profile = await requireProfile(req);
  const db = supabaseAdmin();
  const [{ data: issues, error }, active, { data: mine }, { data: done }] = await Promise.all([
    db.from("issues").select("id, slug, title, category, ward, lat, lng, summary").not("lat", "is", null).not("lng", "is", null),
    activeSets(profile.id),
    db.from("quests").select("id, issue_id, set_id, tier, status").eq("user_id", profile.id).in("status", ["offered", "accepted", "completed"]),
    db.from("quests").select("issue_id, user_id").eq("status", "completed"),
  ]);
  if (error) throw error;

  const activeSetIds = new Set(active.keys());
  const helpers = new Map<string, Set<string>>();
  for (const q of done ?? []) {
    if (!helpers.has(q.issue_id)) helpers.set(q.issue_id, new Set());
    helpers.get(q.issue_id)!.add(q.user_id);
  }

  return Response.json({
    issues: (issues ?? []).map((i) => {
      const myQuests = (mine ?? []).filter((q) => q.issue_id === i.id);
      const activeQuest = myQuests.find((q) => activeSetIds.has(q.set_id) && q.status !== "completed") ?? myQuests.find((q) => activeSetIds.has(q.set_id));
      return {
        ...i,
        helpers: helpers.get(i.id)?.size ?? 0,
        status: activeQuest ? "active" : myQuests.some((q) => q.status === "completed") ? "helped" : "open",
        questId: activeQuest?.id ?? null,
      };
    }),
  });
});
