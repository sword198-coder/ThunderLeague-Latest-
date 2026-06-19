-- Card titles table
CREATE TABLE IF NOT EXISTS public.card_titles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_text TEXT NOT NULL,
  style_type TEXT NOT NULL DEFAULT 'gold' CHECK (style_type IN ('gold', 'gradient', 'glow')),
  gradient_from TEXT DEFAULT '',
  gradient_to TEXT DEFAULT '',
  glow_color TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User granted titles
CREATE TABLE IF NOT EXISTS public.user_titles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id UUID NOT NULL REFERENCES public.card_titles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, title_id)
);

-- Selected title on profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS selected_title_id UUID REFERENCES public.card_titles(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.card_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_titles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read titles" ON public.card_titles;
CREATE POLICY "Everyone can read titles" ON public.card_titles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert titles" ON public.card_titles;
CREATE POLICY "Admins can insert titles" ON public.card_titles FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Admins can delete titles" ON public.card_titles;
CREATE POLICY "Admins can delete titles" ON public.card_titles FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Users can read own granted titles" ON public.user_titles;
CREATE POLICY "Users can read own granted titles" ON public.user_titles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can insert user titles" ON public.user_titles;
CREATE POLICY "Admins can insert user titles" ON public.user_titles FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Admins can read all user titles" ON public.user_titles;
CREATE POLICY "Admins can read all user titles" ON public.user_titles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Admins can delete user titles" ON public.user_titles;
CREATE POLICY "Admins can delete user titles" ON public.user_titles FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_titles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_titles;

-- Seed default gold title
INSERT INTO public.card_titles (name, display_text, style_type) VALUES
  ('Gold', '★ Gold ★', 'gold')
ON CONFLICT DO NOTHING;
