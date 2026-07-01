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
declare
  v_username text;
  v_email text;
begin
  -- First try a simple update (row already exists from trigger)
  update public.profiles set
    war_thunder_username = coalesce(p_war_thunder_username, public.profiles.war_thunder_username),
    squadron_name = coalesce(p_squadron_name, public.profiles.squadron_name),
    discord_username = coalesce(p_discord_username, public.profiles.discord_username),
    nationality = coalesce(p_nationality, public.profiles.nationality)
  where id = p_id;

  -- If no row was updated, insert with username from auth.users metadata
  if not found then
    select raw_user_meta_data ->> 'username', email
    into v_username, v_email
    from auth.users
    where id = p_id;

    insert into public.profiles (id, username, email, war_thunder_username, squadron_name, discord_username, nationality)
    values (
      p_id,
      coalesce(v_username, split_part(v_email, '@', 1)),
      v_email,
      p_war_thunder_username,
      p_squadron_name,
      p_discord_username,
      p_nationality
    );
  end if;
end;
$$;
