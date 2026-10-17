-- Ripple schema. Run in the Supabase SQL editor (or `supabase db push`).
-- Safe to re-run: drops and recreates everything.

drop view if exists leaderboard_users, leaderboard_squads, leaderboard_wards,
  leaderboard_users_monthly, leaderboard_squads_monthly, leaderboard_wards_monthly cascade;
drop function if exists award_submission(uuid, int, int, float8) cascade;
drop function if exists redeem_perk(uuid, uuid) cascade;
drop table if exists redemptions, perks, squad_goals, submissions, quiz_questions, quests, issues, profiles, squads cascade;


create table squads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ward int,
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamptz not null default now()
);

-- id = auth.users.id for real users; seeded demo users have no auth row.
create table profiles (
  id uuid primary key,
  username text not null,
  age_band text not null default 'adult' check (age_band in ('minor', 'adult')),
  ward int check (ward between 1 and 8),
  interests text[] not null default '{}',
  skills text[] not null default '{}',
  dislikes text[] not null default '{}',
  weekly_minutes int not null default 60,
  permissions jsonb not null default '{"location":false,"calendar":false,"screentime":false,"health":false}',
  onboarded boolean not null default false,
  stretch_level float8 not null default 1.0,
  verified_count int not null default 0,
  xp int not null default 0,
  coins int not null default 0,
  squad_id uuid references squads(id) on delete set null,
  invited_by uuid references profiles(id) on delete set null,
  rerolls_today int not null default 0,
  rerolls_date date not null default current_date,
  category_weights jsonb not null default '{}',
  is_seed boolean not null default false,
  created_at timestamptz not null default now()
);

create table issues (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null,
  summary text not null,
  source_url text,
  ward int,
  lat float8,
  lng float8,
  seeded_from text not null default 'hand' check (seeded_from in ('open_data', 'hand'))
);

create table quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  issue_id uuid not null references issues(id) on delete cascade,
  set_id uuid not null,                      -- groups the learn/act/lead trio
  tier text not null check (tier in ('learn', 'act', 'lead')),
  title text not null,
  brief_md text not null default '',
  task text not null,
  task_type text not null,
  verification text not null check (verification in ('quiz', 'photo', 'photo_gps', 'squad')),
  rubric jsonb not null,                     -- clamped server-side, never client-written
  difficulty int not null,
  base_points int not null,
  match_reason text,
  status text not null default 'offered' check (status in ('offered', 'accepted', 'skipped', 'completed')),
  target_lat float8,
  target_lng float8,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on quests (user_id, status);

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  position int not null,
  question text not null,
  options text[] not null,
  answer_idx int not null
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid references quests(id) on delete cascade,  -- null only for seeded history
  user_id uuid not null references profiles(id) on delete cascade,
  photo_path text,
  phash text,
  lat float8,
  lng float8,
  accuracy_m float8,
  quiz_score float8,
  submitted_at timestamptz not null default now(),
  ai_verdict jsonb,
  approved boolean not null default false,
  reject_reason text,
  xp_awarded int not null default 0,
  coins_awarded int not null default 0,
  task_type text,
  created_at timestamptz not null default now()
);
create index on submissions (user_id, approved, created_at);

create table squad_goals (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references squads(id) on delete cascade,
  issue_id uuid not null references issues(id) on delete cascade,
  xp_target int not null,
  xp_progress int not null default 0,
  unique (squad_id, issue_id)
);

create table perks (
  id uuid primary key default gen_random_uuid(),
  business text not null,
  title text not null,
  description text not null default '',
  coin_cost int not null,
  emoji text not null default '🎁'
);

create table redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  perk_id uuid not null references perks(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now()
);

-- ---------- Atomic award: idempotent, one transaction ----------
create function award_submission(p_submission uuid, p_xp int, p_coins int, p_new_level float8)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  s submissions%rowtype;
  q quests%rowtype;
  p profiles%rowtype;
begin
  select * into s from submissions where id = p_submission for update;
  if not found or s.approved then
    return false;  -- already awarded (double-tap) or missing
  end if;

  select * into q from quests where id = s.quest_id for update;
  if q.status = 'completed' then
    return false;
  end if;

  update submissions
     set approved = true, xp_awarded = p_xp, coins_awarded = p_coins, task_type = q.task_type
   where id = p_submission;

  update quests set status = 'completed', completed_at = now() where id = q.id;

  update profiles
     set xp = xp + p_xp,
         coins = coins + p_coins,
         verified_count = verified_count + 1,
         stretch_level = greatest(stretch_level, p_new_level)  -- never decreases
   where id = s.user_id
   returning * into p;

  if p.squad_id is not null then
    insert into squad_goals (squad_id, issue_id, xp_target, xp_progress)
    values (p.squad_id, q.issue_id, 2000, p_xp)
    on conflict (squad_id, issue_id) do update set xp_progress = squad_goals.xp_progress + excluded.xp_progress;
  end if;

  return true;
end $$;

-- ---------- Atomic redeem: spends coins only, XP untouched ----------
create function redeem_perk(p_user uuid, p_perk uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  cost int;
  new_code text;
begin
  select coin_cost into cost from perks where id = p_perk;
  if cost is null then
    raise exception 'perk not found';
  end if;

  update profiles set coins = coins - cost where id = p_user and coins >= cost;
  if not found then
    raise exception 'not enough coins';
  end if;

  new_code := 'RPL-' || upper(substr(md5(random()::text), 1, 8));
  insert into redemptions (user_id, perk_id, code) values (p_user, p_perk, new_code);
  return new_code;
end $$;

revoke execute on function award_submission(uuid, int, int, float8) from public, anon, authenticated;
revoke execute on function redeem_perk(uuid, uuid) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function award_submission(uuid, int, int, float8) to service_role;
    grant execute on function redeem_perk(uuid, uuid) to service_role;
  end if;
end $$;

-- ---------- Leaderboards ----------
create view leaderboard_users as
  select p.id, p.username, p.ward, s.name as squad_name, p.xp
    from profiles p left join squads s on s.id = p.squad_id
   where p.onboarded;

create view leaderboard_squads as
  select s.id, s.name, s.ward, coalesce(sum(p.xp), 0)::int as xp, count(p.id)::int as members
    from squads s left join profiles p on p.squad_id = s.id
   group by s.id;

create view leaderboard_wards as
  select p.ward, coalesce(sum(p.xp), 0)::int as xp, count(*)::int as members
    from profiles p where p.ward is not null and p.onboarded
   group by p.ward;

create view leaderboard_users_monthly as
  select p.id, p.username, p.ward, s.name as squad_name, coalesce(sum(sub.xp_awarded), 0)::int as xp
    from profiles p
    left join squads s on s.id = p.squad_id
    left join submissions sub on sub.user_id = p.id and sub.approved
         and sub.created_at >= date_trunc('month', now())
   where p.onboarded
   group by p.id, s.name;

create view leaderboard_squads_monthly as
  select s.id, s.name, s.ward, coalesce(sum(sub.xp_awarded), 0)::int as xp, count(distinct p.id)::int as members
    from squads s
    left join profiles p on p.squad_id = s.id
    left join submissions sub on sub.user_id = p.id and sub.approved
         and sub.created_at >= date_trunc('month', now())
   group by s.id;

create view leaderboard_wards_monthly as
  select p.ward, coalesce(sum(sub.xp_awarded), 0)::int as xp, count(distinct p.id)::int as members
    from profiles p
    left join submissions sub on sub.user_id = p.id and sub.approved
         and sub.created_at >= date_trunc('month', now())
   where p.ward is not null and p.onboarded
   group by p.ward;

-- ---------- RLS ----------
-- All writes go through Next.js API routes using the service-role key.
-- The browser's anon key can only read public data and its own rows.
alter table profiles enable row level security;
alter table squads enable row level security;
alter table issues enable row level security;
alter table quests enable row level security;
alter table quiz_questions enable row level security;   -- no policies: answers never readable by clients
alter table submissions enable row level security;
alter table squad_goals enable row level security;
alter table perks enable row level security;
alter table redemptions enable row level security;

create policy "profiles readable" on profiles for select using (true);
create policy "squads readable" on squads for select using (true);
create policy "issues readable" on issues for select using (true);
create policy "perks readable" on perks for select using (true);
create policy "squad goals readable" on squad_goals for select using (true);
create policy "own quests" on quests for select using (auth.uid() = user_id);
create policy "own submissions" on submissions for select using (auth.uid() = user_id);
create policy "own redemptions" on redemptions for select using (auth.uid() = user_id);
-- No insert/update/delete policies anywhere => clients cannot write xp, coins, approvals, etc.

-- Views run with the owner's rights by default; make them respect RLS of the caller instead.
alter view leaderboard_users set (security_invoker = true);
alter view leaderboard_squads set (security_invoker = true);
alter view leaderboard_wards set (security_invoker = true);
alter view leaderboard_users_monthly set (security_invoker = true);
alter view leaderboard_squads_monthly set (security_invoker = true);
alter view leaderboard_wards_monthly set (security_invoker = true);

-- ---------- Storage: private bucket, users upload only into their own folder ----------
insert into storage.buckets (id, name, public) values ('proofs', 'proofs', false)
  on conflict (id) do nothing;

drop policy if exists "upload own proofs" on storage.objects;
create policy "upload own proofs" on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);
