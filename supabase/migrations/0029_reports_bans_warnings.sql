-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
CREATE POLICY "Users can insert own reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own reports" ON public.reports;
CREATE POLICY "Users can read own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can read all reports" ON public.reports;
CREATE POLICY "Super admins can read all reports"
  ON public.reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Super admins can update reports" ON public.reports;
CREATE POLICY "Super admins can update reports"
  ON public.reports FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- User bans table
CREATE TABLE IF NOT EXISTS public.user_bans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  duration_text TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own ban" ON public.user_bans;
CREATE POLICY "Users can read own ban"
  ON public.user_bans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can manage bans" ON public.user_bans;
CREATE POLICY "Super admins can manage bans"
  ON public.user_bans FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- User warnings table
CREATE TABLE IF NOT EXISTS public.user_warnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own warnings" ON public.user_warnings;
CREATE POLICY "Users can read own warnings"
  ON public.user_warnings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can manage warnings" ON public.user_warnings;
CREATE POLICY "Super admins can manage warnings"
  ON public.user_warnings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Storage bucket for report images
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can read report images" ON storage.objects;
CREATE POLICY "Anyone can read report images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reports');

DROP POLICY IF EXISTS "Users can upload report images" ON storage.objects;
CREATE POLICY "Users can upload report images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'reports' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Super admins can delete report images" ON storage.objects;
CREATE POLICY "Super admins can delete report images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'reports' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
