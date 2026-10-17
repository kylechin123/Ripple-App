# Ripple

**Turn "I should help" into "I helped": personalized, verified, and rewarded locally.**

Ripple turns your interests into quests about real problems in Markham and York Region. Each issue becomes a three-tier quest: **Learn** (brief + AI quiz), **Act** (a solo task verified by photo), and **Lead** (get two friends to do it too). All tiers are open, so do them in any order, and run several quests at once. Verified progress earns **XP**, which ranks you and your squad, and **coins**, which you spend at local perks. Spending coins never lowers your rank.

**Also:** a map of local issues, a volunteer-hours log toward Ontario's 40-hour requirement (printable for school), weekly streaks and badges, and the interface in English, 简体中文, 繁體中文 and தமிழ்.

Mobile-first Next.js web app. Open it on a phone and "Add to Home Screen" for an app-like feel.

## Stack

- Next.js 16 (App Router) + Tailwind 4, deployed on Vercel
- Supabase: anonymous auth, Postgres (with RLS), Storage for proof photos
- Claude API (`claude-opus-5-5` by default): quest generation, quiz generation, photo verification

## Setup (about 10 minutes)

1. **Install**
   ```bash
   npm install
   ```
2. **Create a Supabase project** at [supabase.com](https://supabase.com).
   - **SQL Editor:** paste and run all of `supabase/schema.sql`. It's safe to re-run; it drops and recreates Ripple's tables.
   - **Authentication → Sign In / Providers:** turn on **Allow anonymous sign-ins**.
3. **Environment**
   ```bash
   cp .env.example .env.local
   ```
   Fill in the Supabase URL, anon key and service-role key (Project Settings → API), and your `ANTHROPIC_API_KEY`.
   No API key yet? Set `DEMO_MODE=true` and `NEXT_PUBLIC_DEMO_MODE=true` to use the pre-written quests.
4. **Seed** issues, perks, squads and 15 demo users with XP history:
   ```bash
   npm run seed
   ```
   The seed script prints squad invite codes you can join from the **Me** tab.
5. **Run**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

### Testing on a phone

Browsers only allow geolocation and the camera over **HTTPS**, so `http://192.168.x.x:3000` won't work for location quests. Either deploy to Vercel (`npx vercel`, then add the same env vars in the Vercel dashboard), or tunnel your dev server, e.g. with `npx cloudflared tunnel --url http://localhost:3000`.

### Optional: real open data

Export GeoJSON (e.g. parks or community centres) from the City of Markham or York Region open data portals, drop the files in `seed/open-data/`, and run `npm run seed` again. Each named point becomes a "park check-in" issue.

## How points work (`src/lib/points.ts`)

```
base    = tierWeight (learn 1, act 2, lead 3) × 10 × (time + effort + impact)
stretch = 1 + 0.5 × clamp((difficulty − yourLevel) / 2, 0, 1) × min(1, verifiedQuests / 5)
repeat  = max(0.4, 0.8 ^ sameTaskTypeInLast7Days)
XP      = round(base × stretch × repeat),  coins = floor(XP / 10)
```

The anti-gaming rules, all enforced on the server:

- **The AI scores the rubric, then the server clamps it** to fixed ranges per task type. Users never set points, and the client only ever sends a quest id.
- **Difficulty is derived from the rubric.** That's why a harder quest always beats an easier one; `points.test.ts` checks this property for every rubric and user state.
- **New users start at exactly 1.0×.** The stretch bonus only builds up from verified history, is capped at 1.5×, and your level never goes down, so sandbagging doesn't pay.
- **Skips never touch the multiplier**; they only teach Ripple which topics you like. You can run up to 3 quest sets at once and add 6 new ones per day, so nobody can farm quests the AI happened to over-score.
- **Repeating the same kind of task** has diminishing returns.

### Verification

- **Learn:** an AI-generated quiz (pass 3/4). Answers never leave the server, and you get 3 attempts.
- **Act:** a photo resized on the phone and uploaded to a private bucket. The checks then run cheapest first:
  1. the quest must be started and the photo submitted within 48 hours
  2. GPS within 300 m (plus reported accuracy, capped) for location quests
  3. a perceptual-hash duplicate check across all past submissions
  4. Claude vision checks the photo matches the task

  Points are awarded atomically and only once, even on a double-tap.
- **Lead:** completes automatically when 2 friends you invited, or squadmates, finish that issue's Act quest. Invite links bring friends straight to the same issue.

## Demo script (3 minutes)

Before the demo, set `DEMO_MODE=true` and `NEXT_PUBLIC_DEMO_MODE=true` if the venue Wi-Fi is shaky, and turn on **Me → Demo tools → Use demo location** when you're indoors.

1. Onboard as "aisha_draws", under 18, who likes Art & design and Sports. Point out that screen time and health default to off for minors, and that every permission is optional.
2. A quest appears that matches her interests. **Learn:** read the brief and pass the quiz; the XP breakdown shows `base × stretch × repeat`.
3. **Act:** take a photo; GPS and the AI check pass, and XP is awarded.
4. **Anti-gaming:** start a new quest set and submit the same photo, which is rejected as a duplicate. Mention that the rubric is locked server-side and that repeats decay.
5. **Ranks:** the 🌍 Total global impact card adds up everyone's contribution. Switch between **Global**, **My squad**, **Squads** and **Wards**. **Perks:** redeem a bubble tea; your coins drop but your XP and rank stay the same.
6. Close with the business model: local businesses get cheap foot traffic and community goodwill.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Unit tests (points engine, duplicate detection, GPS) |
| `npm run seed` | Seed Supabase |
| `npm run lint` / `npm run typecheck` | Lint / type-check |
| `npm run build` | Production build |

## Project layout

```
supabase/schema.sql        tables, RLS, atomic award/redeem functions, leaderboard + impact views
supabase/migrations/       non-destructive upgrades for an existing database
scripts/seed.ts            seed data loader
src/lib/points.ts          points engine (pure, unit-tested)
src/lib/ai/                Claude calls: quests, quiz, photo verification
src/lib/server/game.ts     quest sets (parallel, all tiers open), awarding, Lead completion
src/app/api/               route handlers (all writes use the service-role key)
src/app/                   screens: onboarding, quests, quest detail, leaderboard, perks, profile
src/data/                  hand-written issues, demo quests, mock perks, preference options
src/i18n/                  translations (en is the source; zh-Hans, zh-Hant, ta)
src/lib/badges.ts, hours.ts  streaks/badges and volunteer-hours logic (pure, unit-tested)
public/images/             AI-generated hero art
```

## Notes

- Hand-written issue summaries are illustrative and written for the demo, and their coordinates are approximate. Check them before relying on location quests.
- Perks and businesses are mocks. Calendar, screen-time and health permissions are UI previews only.
- For a real launch with minors, add parental consent and a data-retention policy.
