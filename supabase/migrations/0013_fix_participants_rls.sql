-- Fix participants RLS: allow all users to see all tournament participants
DROP POLICY IF EXISTS "Users can read own participation" ON public.tournament_participants;
CREATE POLICY "Anyone can read tournament participants"
  ON public.tournament_participants FOR SELECT
  USING (true);
