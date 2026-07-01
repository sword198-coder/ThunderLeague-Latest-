-- RPC to upsert profile data bypassing RLS (for signup flow when no session exists)
create or replace function public.upsert_own_profile(
  p_id uuid,
  p_war_thunder_username text default null,
  p_squadron_name text default null,
  p_discord_username text default null,
  p_nationality text default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into public.profiles (id, war_thunder_username, squadron_name, discord_username, nationality)
  values (p_id, p_war_thunder_username, p_squadron_name, p_discord_username, p_nationality)
  on conflict (id) do update set
    war_thunder_username = coalesce(p_war_thunder_username, public.profiles.war_thunder_username),
    squadron_name = coalesce(p_squadron_name, public.profiles.squadron_name),
    discord_username = coalesce(p_discord_username, public.profiles.discord_username),
    nationality = coalesce(p_nationality, public.profiles.nationality);
end;
$$;
