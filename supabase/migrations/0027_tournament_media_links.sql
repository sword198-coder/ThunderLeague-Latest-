CREATE TABLE IF NOT EXISTS public.tournament_media_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  label TEXT,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tournament_media_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read visible media links" ON public.tournament_media_links;
CREATE POLICY "Anyone can read visible media links"
  ON public.tournament_media_links FOR SELECT
  USING (visible = true);

DROP POLICY IF EXISTS "Super admins can manage media links" ON public.tournament_media_links;
CREATE POLICY "Super admins can manage media links"
  ON public.tournament_media_links FOR ALL
  USING (public.is_super_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_media_links;
