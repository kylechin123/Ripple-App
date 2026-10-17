// Options for interests, skills, dislikes and weekly time. Shared by onboarding,
// the preferences editor and the server (validation + quest matching).
//
// Never rename an existing option: saved profiles store these strings verbatim.

export const INTEREST_GROUPS: { label: string; options: string[] }[] = [
  { label: "Outdoors & active", options: ["Nature", "Sports", "Animals", "Hiking", "Cycling", "Gardening", "Fitness"] },
  { label: "Creative", options: ["Art & design", "Music", "Photography", "Fashion", "Film & video", "Writing", "Theatre", "Crafts & DIY"] },
  { label: "Tech & science", options: ["Coding", "Gaming", "Science", "Robotics", "Math"] },
  {
    label: "People & community",
    options: ["Food", "Reading", "Languages", "History", "Kids & teaching", "Seniors", "Climate", "Social justice", "Mental health", "Entrepreneurship", "Volunteering"],
  },
];
export const INTERESTS = INTEREST_GROUPS.flatMap((g) => g.options);

export const SKILLS = [
  "Design", "Writing", "Coding", "Organizing", "Teaching", "Languages", "Social media", "Building things", "Public speaking", "Photography",
  "Translation", "Cooking", "Gardening", "First aid", "Music", "Research", "Spreadsheets & data", "Event planning", "Fundraising", "Listening & mentoring",
];

export const DISLIKES = [
  "Crowds", "Getting dirty", "Talking to strangers", "Early mornings", "Long walks", "Screens",
  "Late evenings", "Heavy lifting", "Cold weather", "Phone calls", "Bugs", "Being on camera",
];

export const TIMES = [
  { label: "15 min / week", value: 15 },
  { label: "30 min / week", value: 30 },
  { label: "1 hour / week", value: 60 },
  { label: "2–3 hours / week", value: 150 },
  { label: "5 hours / week", value: 300 },
  { label: "10+ hours / week", value: 600 },
];

export const ISSUE_CATEGORIES = ["environment", "food", "newcomers", "accessibility"] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

/** How much each preset pulls a user toward (or away from) a category of issue. */
export const AFFINITY: Record<string, Partial<Record<IssueCategory, number>>> = {
  // interests
  Nature: { environment: 1 },
  Hiking: { environment: 1 },
  Cycling: { environment: 0.5, accessibility: 0.5 },
  Gardening: { environment: 1 },
  Animals: { environment: 1 },
  Climate: { environment: 1 },
  Science: { environment: 0.5 },
  Food: { food: 1 },
  Languages: { newcomers: 1 },
  "Kids & teaching": { newcomers: 1 },
  History: { accessibility: 0.5 },
  Seniors: { accessibility: 1, food: 0.5 },
  "Social justice": { accessibility: 1, food: 0.5, newcomers: 0.5 },
  "Mental health": { newcomers: 0.5 },
  Volunteering: { food: 1 },
  "Art & design": { food: 0.5 },
  // skills
  Cooking: { food: 1 },
  Translation: { newcomers: 1 },
  Teaching: { newcomers: 1 },
  "Listening & mentoring": { newcomers: 1 },
  Organizing: { food: 0.5 },
  "Event planning": { food: 0.5, newcomers: 0.5 },
  Fundraising: { food: 1 },
  Design: { food: 0.5, accessibility: 0.5 },
  Research: { accessibility: 0.5 },
  "Building things": { accessibility: 1 },
  // dislikes
  "Getting dirty": { environment: -1 },
  Bugs: { environment: -0.5 },
  "Cold weather": { environment: -0.5 },
  "Long walks": { environment: -0.5, accessibility: -0.5 },
  "Talking to strangers": { newcomers: -1 },
  Crowds: { food: -0.5 },
};

export const LIMITS = { maxPerList: 20, maxLength: 30 };

/** Letters (any language), numbers, spaces and simple punctuation. Keeps custom entries clean for the AI prompt. */
export const TAG_PATTERN = /^[\p{L}\p{N} &'’.,+\-/]+$/u;

/** Trim, drop invalid, and dedupe case-insensitively (first spelling wins). */
export function cleanTags(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim().replace(/\s+/g, " ");
    const key = v.toLowerCase();
    if (!v || v.length > LIMITS.maxLength || !TAG_PATTERN.test(v) || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out.slice(0, LIMITS.maxPerList);
}

/** Interest score of an issue category for a user's preferences. */
export function preferenceScore(prefs: { interests: string[]; skills: string[]; dislikes: string[] }, category: string) {
  let score = 0;
  for (const v of [...prefs.interests, ...prefs.skills, ...prefs.dislikes]) score += AFFINITY[v]?.[category as IssueCategory] ?? 0;
  return score;
}
