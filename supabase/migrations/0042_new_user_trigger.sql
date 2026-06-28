-- Attach handle_new_user trigger to auth.users
-- This was missing in previous migrations, causing new users to have no profile row

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
