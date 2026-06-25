-- Create chat_reports table
CREATE TABLE IF NOT EXISTS public.chat_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.tournament_chat_messages(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT DEFAULT 'inappropriate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can report
CREATE POLICY "Users can create reports"
  ON public.chat_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Admins can read all reports
CREATE POLICY "Admins can read reports"
  ON public.chat_reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Admins can delete reports (after resolving)
CREATE POLICY "Admins can delete reports"
  ON public.chat_reports FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Enable realtime for chat reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reports;
