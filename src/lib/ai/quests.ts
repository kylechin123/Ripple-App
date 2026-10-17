import "server-only";
import { z } from "zod";
import { structuredCall } from "./client";
import type { Issue, Profile } from "../types";

const RubricSchema = z.object({ time: z.number(), effort: z.number(), impact: z.number() });

export const GeneratedSetSchema = z.object({
  issue_slug: z.string(),
  match_reason: z.string(),
  learn: z.object({ title: z.string(), brief_md: z.string(), rubric: RubricSchema }),
  act: z.object({
    title: z.string(),
    task: z.string(),
    task_type: z.enum(["report", "cleanup", "design", "tutor", "code"]),
    location_based: z.boolean(),
    rubric: RubricSchema,
  }),
  lead: z.object({ title: z.string(), task: z.string(), rubric: RubricSchema }),
});
export type GeneratedSet = z.infer<typeof GeneratedSetSchema>;

const SYSTEM = `You design short civic "quests" for Ripple, an app that helps people in Markham and York Region (Ontario, Canada) learn about and fix real local problems.

Given a user profile and a list of candidate local issues, pick the ONE issue that best fits the user's interests and skills (avoid their dislikes), then write a 3-tier quest set for it:

1. learn: a title and a brief_md of about 150 words in Markdown explaining the issue locally: what it is, why it matters in Markham/York Region, and one or two concrete facts from the issue summary. Only state facts that are in the issue summary or are common knowledge; don't invent statistics.
2. act: one concrete solo action matched to the user's skills, doable in roughly the user's weekly time budget, verifiable with ONE photo (e.g. a filled litter bag at the park, a printed flyer, a screenshot of a submitted 311 report, a photo of a tutoring setup). Choose task_type from report | cleanup | design | tutor | code. Set location_based=true only if the photo must be taken at the issue's location.
3. lead: a squad action. The user invites at least 2 friends or squadmates to complete the act quest too, or organises a small group event.

Score each tier's rubric with integers 1-5 using these anchors:
- time: 1 = under 10 min, 2 = 10-30 min, 3 = 30-60 min, 4 = 1-2 h, 5 = more than 2 h
- effort: 1 = trivial, 2 = light, 3 = moderate, 4 = demanding, 5 = very demanding or needs a specialised skill
- impact: 1 = personal learning only, 2 = small visible help, 3 = helps a group or a place, 4 = lasting benefit to many, 5 = changes a system
Score honestly; the server clamps the scores to fixed ranges anyway.

Tone: warm, specific, encouraging, no guilt-tripping. Keep titles under 60 characters.`;

const MINOR_RULES = `
The user is a MINOR. Every task must be safe for a teenager: no solo tasks after dark, no remote or isolated locations, nothing that requires approaching strangers alone, no handling sharp or hazardous waste (suggest gloves and an adult or a friend for cleanups).`;

export async function generateQuestSet(profile: Profile, issues: Issue[], avoidSlugs: string[]): Promise<GeneratedSet> {
  const candidates = issues.map((i) => ({ slug: i.slug, title: i.title, category: i.category, ward: i.ward, summary: i.summary }));
  const user = {
    interests: profile.interests,
    skills: profile.skills,
    dislikes: profile.dislikes,
    weekly_minutes: profile.weekly_minutes,
    age_band: profile.age_band,
    preferred_categories: profile.category_weights,
  };
  const result = await structuredCall({
    schema: GeneratedSetSchema,
    system: SYSTEM + (profile.age_band === "minor" ? MINOR_RULES : ""),
    effort: "medium",
    content: `User profile:\n${JSON.stringify(user, null, 2)}\n\nCandidate issues:\n${JSON.stringify(candidates, null, 2)}${
      avoidSlugs.length ? `\n\nThe user just skipped these issues; pick a different one if any other fits: ${avoidSlugs.join(", ")}` : ""
    }\n\nReturn issue_slug exactly as given in the candidate list.`,
  });
  if (!issues.some((i) => i.slug === result.issue_slug)) result.issue_slug = issues[0].slug;
  return result;
}
