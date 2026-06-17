CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin');
$$;

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rank integer NOT NULL,
  player_name text NOT NULL,
  squadron_name text,
  battle_rating text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  wins integer DEFAULT 0,
  losses integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read leaderboard"
  ON leaderboard_entries FOR SELECT
  USING (true);

CREATE POLICY "Super admins manage leaderboard"
  ON leaderboard_entries FOR ALL
  USING (public.is_super_admin());
