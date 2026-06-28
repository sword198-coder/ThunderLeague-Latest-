-- Auto-follow all admin accounts for every user
-- So when admins post, everyone sees it in their feed

-- For existing users: follow all super_admins
insert into follows (follower_id, following_id)
select p.id as follower_id, a.id as following_id
from profiles p
cross join profiles a
where a.role = 'super_admin'
  and p.id != a.id
  and not exists (
    select 1 from follows f
    where f.follower_id = p.id and f.following_id = a.id
  );

-- Update handle_new_user to also auto-follow admins
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
BEGIN
  INSERT INTO public.profiles (id, username, email, first_name, last_name, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'display_name'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Auto-follow all admins
  INSERT INTO public.follows (follower_id, following_id)
  SELECT NEW.id, a.id
  FROM public.profiles a
  WHERE a.role = 'super_admin' AND a.id != NEW.id
    AND NOT EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = NEW.id AND f.following_id = a.id
    );

  RETURN NEW;
END;
$function$;
