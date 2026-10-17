import type { Issue } from "@/lib/types";

/**
 * Hand-written demo issues. Coordinates are approximate. Check them on a map
 * before the demo and adjust if your quest locations need to be exact.
 * Summaries are illustrative and written for the demo, not official city data.
 */
export const HAND_ISSUES: Omit<Issue, "id">[] = [
  {
    slug: "toogood-pond-litter",
    title: "Litter around Toogood Pond",
    category: "environment",
    summary:
      "Toogood Pond Park in Unionville is one of Markham's busiest parks. After warm weekends, wrappers, cups and plastic collect along the trail edges and near the water, where wind and rain carry them into the pond and the creek system that drains toward the Rouge River. Plastic litter harms wildlife and is far easier to pick up on land than to remove from water. Residents can help by doing small cleanups and by reporting overflowing bins to the City of Markham, which empties park bins on a schedule.",
    source_url: null,
    ward: 3,
    lat: 43.8792,
    lng: -79.3185,
    seeded_from: "hand",
  },
  {
    slug: "food-bank-volunteers",
    title: "Food banks need more volunteers",
    category: "food",
    summary:
      "Food banks across York Region have reported rising demand as grocery and housing costs have gone up. Many rely almost entirely on volunteers to sort donations, pack hampers and run food drives. Volunteer shortages often hit on weekdays and during the summer, when students are away. Simple ways to help include running a small food drive at school or work, volunteering for a sorting shift, or making clear, multilingual flyers about what items are most needed (usually canned protein, rice, cooking oil and baby supplies).",
    source_url: null,
    ward: 4,
    lat: 43.8561,
    lng: -79.337,
    seeded_from: "hand",
  },
  {
    slug: "newcomer-conversation-circles",
    title: "Newcomers looking for conversation partners",
    category: "newcomers",
    summary:
      "Markham is one of the most diverse cities in Canada, and many residents are newcomers building a life in a new language. Public libraries and community centres run English conversation circles where newcomers practise everyday conversation in a relaxed setting, but these groups often need more friendly volunteers. Loneliness and isolation are common in a newcomer's first years. Even an hour of conversation, help with a library card, or a walk through local services can make someone feel welcome.",
    source_url: null,
    ward: 6,
    lat: 43.8995,
    lng: -79.2865,
    seeded_from: "hand",
  },
  {
    slug: "rouge-invasive-species",
    title: "Invasive plants in the Rouge",
    category: "environment",
    summary:
      "Rouge National Urban Park runs along Markham's eastern edge. Invasive plants like dog-strangling vine and garlic mustard spread quickly, crowd out native wildflowers, and reduce habitat for pollinators such as monarch butterflies. Park staff and partner groups run guided volunteer events to pull invasives and plant native species. Visitors can also help by staying on trails, cleaning seeds off boots and bikes, and learning to identify invasive plants so they can report new patches.",
    source_url: null,
    ward: 5,
    lat: 43.846,
    lng: -79.216,
    seeded_from: "hand",
  },
  {
    slug: "main-street-accessibility",
    title: "Accessibility gaps on Main Street Markham",
    category: "accessibility",
    summary:
      "Main Street Markham is a historic district with older storefronts. Some entrances have steps without ramps, some sidewalks have uneven or narrow sections, and some crossings have no curb cuts, all of which make visiting harder for wheelchair users, people with strollers, and seniors. Ontario's accessibility law (AODA) sets standards for new and renovated public spaces, but older buildings often lag behind. Residents can help by mapping barriers, reporting broken sidewalks to the city, and encouraging businesses to add portable ramps.",
    source_url: null,
    ward: 4,
    lat: 43.8772,
    lng: -79.2603,
    seeded_from: "hand",
  },
];

export const PERKS = [
  { business: "Pearl Tea House (mock)", title: "$2 off any bubble tea", description: "Valid at the Unionville location.", coin_cost: 15, emoji: "🧋" },
  { business: "Main St. Books (mock)", title: "10% off one book", description: "Excludes textbooks.", coin_cost: 30, emoji: "📚" },
  { business: "Rouge Cycle Co. (mock)", title: "Free bike tune-up check", description: "Brakes, gears and tire pressure.", coin_cost: 60, emoji: "🚲" },
  { business: "Village Grind Café (mock)", title: "Free drip coffee or tea", description: "One per visit.", coin_cost: 10, emoji: "☕" },
];

export const SQUADS = [
  { name: "Unionville Unicorns", ward: 3 },
  { name: "Cornell Crew", ward: 5 },
  { name: "Milliken Movers", ward: 8 },
];
