-- Tournament chat messages
CREATE TABLE IF NOT EXISTS public.tournament_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Toggle for chat enabled/disabled and visible/hidden on the tournament
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS chat_visible BOOLEAN NOT NULL DEFAULT true;

-- RLS
ALTER TABLE public.tournament_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read chat messages" ON public.tournament_chat_messages;
CREATE POLICY "Anyone can read chat messages"
  ON public.tournament_chat_messages FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Approved participants can insert chat messages" ON public.tournament_chat_messages;
CREATE POLICY "Approved participants can insert chat messages"
  ON public.tournament_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tournament_participants
      WHERE tournament_id = tournament_chat_messages.tournament_id
        AND user_id = auth.uid()
        AND status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Super admins can delete any chat message" ON public.tournament_chat_messages;
CREATE POLICY "Super admins can delete any chat message"
  ON public.tournament_chat_messages FOR DELETE
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.tournament_chat_messages;
CREATE POLICY "Users can delete own chat messages"
  ON public.tournament_chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_chat_messages;
