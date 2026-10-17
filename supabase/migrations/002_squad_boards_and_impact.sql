-- Non-destructive migration for an existing Ripple database: adds squad_id to the
-- people leaderboards (for the "My squad" board) and global impact views.
-- New installs get all of this from schema.sql.

-- squad_id is appended last so `create or replace view` keeps the existing columns.
create or replace view leaderboard_users as
  select p.id, p.username, p.ward, s.name as squad_name, p.xp, p.squad_id
    from profiles p left join squads s on s.id = p.squad_id
   where p.onboarded;

create or replace view leaderboard_users_monthly as
  select p.id, p.username, p.ward, s.name as squad_name, coalesce(sum(sub.xp_awarded), 0)::int as xp, p.squad_id
    from profiles p
    left join squads s on s.id = p.squad_id
    left join submissions sub on sub.user_id = p.id and sub.approved
         and sub.created_at >= date_trunc('month', now())
   where p.onboarded
   group by p.id, s.name;

-- One row: everyone's contribution added together.
create or replace view global_impact as
  select
    (select coalesce(sum(xp), 0) from profiles where onboarded)::int as total_xp,
    (select coalesce(sum(xp_awarded), 0) from submissions where approved and created_at >= date_trunc('month', now()))::int as month_xp,
    (select count(*) from submissions where approved)::int as quests_completed,
    (select count(*) from profiles where onboarded)::int as members,
    (select count(distinct q.issue_id) from quests q where q.status = 'completed')::int as issues_tackled;

create or replace view global_impact_by_type as
  select task_type, count(*)::int as completed, coalesce(sum(xp_awarded), 0)::int as xp
    from submissions
   where approved and task_type is not null
   group by task_type;

alter view leaderboard_users set (security_invoker = true);
alter view leaderboard_users_monthly set (security_invoker = true);
alter view global_impact set (security_invoker = true);
alter view global_impact_by_type set (security_invoker = true);
