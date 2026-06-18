-- Add system column to tournaments (1v1 knockout or 4v4 teams)
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS system text NOT NULL DEFAULT '1v1' CHECK (system IN ('1v1', '4v4'));

-- Create tournament matches table
CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round integer NOT NULL,
  match_index integer NOT NULL,
  player1_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  player2_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  team1_player_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  team2_player_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  winner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, round, match_index)
);

-- Enable RLS
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

-- Anyone can read matches
CREATE POLICY "Anyone can read tournament matches"
  ON public.tournament_matches FOR SELECT
  USING (true);

-- Super admins can insert/update/delete matches
CREATE POLICY "Super admins can insert matches"
  ON public.tournament_matches FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update matches"
  ON public.tournament_matches FOR UPDATE
  USING (is_super_admin());

CREATE POLICY "Super admins can delete matches"
  ON public.tournament_matches FOR DELETE
  USING (is_super_admin());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;
