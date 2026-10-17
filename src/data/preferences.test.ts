import { describe, expect, it } from "vitest";
import { HAND_ISSUES } from "./issues";
import { AFFINITY, DISLIKES, INTERESTS, ISSUE_CATEGORIES, LIMITS, SKILLS, TAG_PATTERN, TIMES, cleanTags, preferenceScore } from "./preferences";

const PRESETS = [...INTERESTS, ...SKILLS, ...DISLIKES];

describe("preference options", () => {
  it("keeps every option from the original onboarding so saved profiles stay valid", () => {
    const original = {
      interests: ["Nature", "Sports", "Art & design", "Coding", "Music", "Food", "Animals", "Gaming", "Photography", "Reading", "Fashion", "Science"],
      skills: ["Design", "Writing", "Coding", "Organizing", "Teaching", "Languages", "Social media", "Building things", "Public speaking", "Photography"],
      dislikes: ["Crowds", "Getting dirty", "Talking to strangers", "Early mornings", "Long walks", "Screens"],
      minutes: [30, 60, 150, 300],
    };
    for (const v of original.interests) expect(INTERESTS).toContain(v);
    for (const v of original.skills) expect(SKILLS).toContain(v);
    for (const v of original.dislikes) expect(DISLIKES).toContain(v);
    for (const m of original.minutes) expect(TIMES.map((t) => t.value)).toContain(m);
  });

  it("every preset passes the server's validation", () => {
    for (const v of PRESETS) {
      expect(v.length).toBeLessThanOrEqual(LIMITS.maxLength);
      expect(TAG_PATTERN.test(v)).toBe(true);
    }
    for (const t of TIMES) {
      expect(t.value).toBeGreaterThanOrEqual(10);
      expect(t.value).toBeLessThanOrEqual(1200);
    }
  });

  it("has no duplicate options within a list", () => {
    for (const list of [INTERESTS, SKILLS, DISLIKES]) expect(new Set(list).size).toBe(list.length);
  });

  it("affinity keys are presets and targets are real issue categories", () => {
    const real = new Set(HAND_ISSUES.map((i) => i.category));
    for (const [key, targets] of Object.entries(AFFINITY)) {
      expect(PRESETS).toContain(key);
      for (const cat of Object.keys(targets)) {
        expect(ISSUE_CATEGORIES).toContain(cat);
        expect(real.has(cat)).toBe(true);
      }
    }
  });

  it("cleans custom entries: trims, dedupes case-insensitively, drops invalid ones", () => {
    expect(cleanTags(["  Birdwatching ", "birdwatching", "Nature", "<script>", "x".repeat(31), ""])).toEqual(["Birdwatching", "Nature"]);
    expect(cleanTags(["Café culture", "日本語", "K-pop", "3D printing"])).toEqual(["Café culture", "日本語", "K-pop", "3D printing"]);
  });

  it("scores issue categories from interests, skills and dislikes", () => {
    const nature = { interests: ["Nature", "Gardening"], skills: [], dislikes: [] };
    expect(preferenceScore(nature, "environment")).toBeGreaterThan(preferenceScore(nature, "food"));
    const foodie = { interests: ["Food"], skills: ["Cooking"], dislikes: ["Getting dirty"] };
    expect(preferenceScore(foodie, "food")).toBeGreaterThan(preferenceScore(foodie, "environment"));
    expect(preferenceScore(foodie, "environment")).toBeLessThan(0);
  });
});
