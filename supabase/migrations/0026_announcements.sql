-- Announcements (admin popup cards)
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'checkbox', 'choices', 'text', 'choices+text')),
  options JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-user acknowledgement
CREATE TABLE IF NOT EXISTS public.user_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  checkbox_checked BOOLEAN DEFAULT false,
  choice_response TEXT DEFAULT '',
  text_response TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read announcements" ON public.announcements;
CREATE POLICY "Anyone can read announcements"
  ON public.announcements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Super admins can insert announcements" ON public.announcements;
CREATE POLICY "Super admins can insert announcements"
  ON public.announcements FOR INSERT
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can delete announcements" ON public.announcements;
CREATE POLICY "Super admins can delete announcements"
  ON public.announcements FOR DELETE
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Users can read own announcement responses" ON public.user_announcements;
CREATE POLICY "Users can read own announcement responses"
  ON public.user_announcements FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own announcement responses" ON public.user_announcements;
CREATE POLICY "Users can insert own announcement responses"
  ON public.user_announcements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own announcement responses" ON public.user_announcements;
CREATE POLICY "Users can update own announcement responses"
  ON public.user_announcements FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can read all responses" ON public.user_announcements;
CREATE POLICY "Super admins can read all responses"
  ON public.user_announcements FOR SELECT
  USING (public.is_super_admin());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_announcements;
