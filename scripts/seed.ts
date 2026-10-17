/**
 * Seed Ripple's database: issues, perks, squads and fake users with XP history.
 * Usage: npm run seed   (reads .env.local)
 *
 * Optional open data: drop GeoJSON files (e.g. parks or community centres exported
 * from the City of Markham / York Region open data portals) into seed/open-data/.
 * Each Point feature with a name becomes an issue.
 */
import { config } from "dotenv";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { HAND_ISSUES, PERKS, SQUADS } from "../src/data/issues";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

function must<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) {
    console.error(`Failed to ${what}: ${res.error.message}`);
    process.exit(1);
  }
  return res.data;
}

type Feature = { geometry?: { type: string; coordinates: unknown }; properties?: Record<string, unknown> };

function firstPoint(geom: Feature["geometry"]): [number, number] | null {
  if (!geom) return null;
  let c: unknown = geom.coordinates;
  while (Array.isArray(c) && Array.isArray(c[0])) c = c[0];
  return Array.isArray(c) && typeof c[0] === "number" ? [c[0] as number, c[1] as number] : null;
}

function openDataIssues() {
  const dir = join(process.cwd(), "seed", "open-data");
  if (!existsSync(dir)) return [];
  const out = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".geojson") || f.endsWith(".json"))) {
    const geo = JSON.parse(readFileSync(join(dir, file), "utf8")) as { features?: Feature[] };
    for (const f of (geo.features ?? []).slice(0, 15)) {
      const props = f.properties ?? {};
      const name = String(props.NAME ?? props.Name ?? props.name ?? props.PARK_NAME ?? props.FACILITY_NAME ?? "").trim();
      const pt = firstPoint(f.geometry);
      if (!name || !pt) continue;
      const slug = `od-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`.slice(0, 70);
      out.push({
        slug,
        title: `Park check-in: ${name}`,
        category: "environment",
        summary: `${name} is a public space in Markham listed in municipal open data. Like many local parks and facilities, it benefits from residents who pick up litter, report damaged equipment or overflowing bins to the City of Markham, and help keep it welcoming for neighbours.`,
        source_url: null,
        ward: null,
        lng: pt[0],
        lat: pt[1],
        seeded_from: "open_data" as const,
      });
    }
    console.log(`  open data: read ${file}`);
  }
  return out;
}

const NAMES = [
  "maple_mia", "rouge_ranger", "unionville_jay", "cornell_kai", "milliken_mo", "pond_patrol", "green_grace", "tutor_tom",
  "flyer_fatima", "ravi_recycles", "sam_sweeps", "luna_leads", "ollie_outdoors", "priya_plants", "ben_builds",
];
const TASKS = ["quiz", "cleanup", "report", "design", "tutor", "code", "event"];

async function main() {
  console.log("Seeding issues…");
  const issues = [...HAND_ISSUES, ...openDataIssues()];
  must(await db.from("issues").upsert(issues, { onConflict: "slug" }), "upsert issues");
  console.log(`  ${issues.length} issues`);

  console.log("Seeding perks…");
  const existingPerks = must(await db.from("perks").select("id"), "read perks");
  if (!existingPerks?.length) must(await db.from("perks").insert(PERKS), "insert perks");

  console.log("Seeding squads…");
  const squadIds: string[] = [];
  for (const s of SQUADS) {
    const found = must(await db.from("squads").select("id").eq("name", s.name).maybeSingle(), "read squad");
    if (found) squadIds.push(found.id);
    else squadIds.push(must(await db.from("squads").insert(s).select("id").single(), "insert squad")!.id);
  }

  console.log("Seeding demo users…");
  must(await db.from("profiles").delete().eq("is_seed", true), "clear seed users");
  const now = Date.now();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const profiles = [];
  const submissions = [];
  for (let i = 0; i < NAMES.length; i++) {
    const id = randomUUID();
    let xp = 0;
    const count = 3 + ((i * 7) % 9);
    for (let j = 0; j < count; j++) {
      const amount = [30, 60, 120, 180, 240, 300][(i + j) % 6];
      // Roughly a third of history lands in the current month so the monthly board isn't empty.
      const thisMonth = j % 3 === 0;
      const t = thisMonth ? monthStart + Math.random() * Math.max(1, now - monthStart) : monthStart - (1 + Math.random() * 60) * 86400000;
      submissions.push({ user_id: id, approved: true, xp_awarded: amount, coins_awarded: Math.floor(amount / 10), task_type: TASKS[(i + j) % TASKS.length], created_at: new Date(t).toISOString(), submitted_at: new Date(t).toISOString() });
      xp += amount;
    }
    profiles.push({
      id,
      username: NAMES[i],
      age_band: i % 3 === 0 ? "minor" : "adult",
      ward: [3, 5, 8, 4, 6, 2, 1, 7][i % 8],
      interests: ["Nature"],
      onboarded: true,
      is_seed: true,
      squad_id: i < 12 ? squadIds[i % squadIds.length] : null,
      xp,
      coins: Math.floor(xp / 20),
      verified_count: count,
      stretch_level: 1 + (i % 4) * 0.4,
    });
  }
  must(await db.from("profiles").insert(profiles), "insert seed users");
  must(await db.from("submissions").insert(submissions), "insert seed history");
  console.log(`  ${profiles.length} users, ${submissions.length} past submissions`);

  const codes = must(await db.from("squads").select("name, invite_code"), "read squad codes");
  console.log("\nSquad invite codes (join one from the Me tab):");
  for (const c of codes ?? []) console.log(`  ${c.invite_code}  ${c.name}`);
  console.log("\nDone.");
}

main();
