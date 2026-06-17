-- Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  mode text NOT NULL CHECK (mode IN ('air', 'ground', 'both')),
  tier text NOT NULL CHECK (tier IN ('low', 'mid', 'high', 'top')),
  battle_rating text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  max_players integer NOT NULL DEFAULT 16 CHECK (max_players > 0),
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create participants table
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

-- Tournaments policies
-- Anyone can read tournaments; super_admins can insert/update/delete
CREATE POLICY "Anyone can read tournaments"
  ON public.tournaments FOR SELECT
  USING (true);

CREATE POLICY "Super admins can insert tournaments"
  ON public.tournaments FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update tournaments"
  ON public.tournaments FOR UPDATE
  USING (is_super_admin());

CREATE POLICY "Super admins can delete tournaments"
  ON public.tournaments FOR DELETE
  USING (is_super_admin());

-- Participants policies
-- Users can read their own participation; super_admins can read all
CREATE POLICY "Users can read own participation"
  ON public.tournament_participants FOR SELECT
  USING (auth.uid() = user_id OR is_super_admin());

-- Users can join (insert) if not full and not already joined
CREATE POLICY "Users can join tournaments"
  ON public.tournament_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id
        AND t.status IN ('upcoming', 'active')
        AND (SELECT COUNT(*) FROM public.tournament_participants tp WHERE tp.tournament_id = t.id AND tp.status = 'approved') < t.max_players
    )
  );

-- Super admins can update participants (approve/reject)
CREATE POLICY "Super admins can update participants"
  ON public.tournament_participants FOR UPDATE
  USING (is_super_admin());

-- Users can leave (delete own pending participation)
CREATE POLICY "Users can leave tournaments"
  ON public.tournament_participants FOR DELETE
  USING (auth.uid() = user_id);

-- Super admins can delete any participant
CREATE POLICY "Super admins can manage participants"
  ON public.tournament_participants FOR DELETE
  USING (is_super_admin());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_participants;
