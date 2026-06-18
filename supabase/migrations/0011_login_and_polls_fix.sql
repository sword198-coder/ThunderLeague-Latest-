-- Allow anonymous users to look up email by username for login
DROP POLICY IF EXISTS "Anyone can read profiles for login" ON public.profiles;
CREATE POLICY "Anyone can read profiles for login"
  ON public.profiles FOR SELECT
  USING (true);

-- Update polls policy to allow reading closed polls too (not just active)
DROP POLICY IF EXISTS "Anyone can read active polls" ON public.polls;
CREATE POLICY "Anyone can read polls"
  ON public.polls FOR SELECT
  USING (status IN ('active', 'closed') OR is_super_admin());

-- Add hidden column to polls so admins can hide polls from the votes page
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS hidden boolean DEFAULT false;
