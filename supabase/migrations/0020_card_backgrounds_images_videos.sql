-- Add type and file_url to card_backgrounds
ALTER TABLE public.card_backgrounds ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'gradient' CHECK (type IN ('gradient', 'image', 'video'));
ALTER TABLE public.card_backgrounds ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT '';

-- Allow admins to insert/update/delete backgrounds
DROP POLICY IF EXISTS "Admins can insert backgrounds" ON public.card_backgrounds;
CREATE POLICY "Admins can insert backgrounds" ON public.card_backgrounds FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Admins can update backgrounds" ON public.card_backgrounds;
CREATE POLICY "Admins can update backgrounds" ON public.card_backgrounds FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Admins can delete backgrounds" ON public.card_backgrounds;
CREATE POLICY "Admins can delete backgrounds" ON public.card_backgrounds FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Storage bucket for card backgrounds
INSERT INTO storage.buckets (id, name, public) VALUES ('card-backgrounds', 'card-backgrounds', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can read card-backgrounds" ON storage.objects;
CREATE POLICY "Public can read card-backgrounds" ON storage.objects FOR SELECT USING (bucket_id = 'card-backgrounds');

DROP POLICY IF EXISTS "Admins can upload card-backgrounds" ON storage.objects;
CREATE POLICY "Admins can upload card-backgrounds" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'card-backgrounds' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Admins can delete card-backgrounds" ON storage.objects;
CREATE POLICY "Admins can delete card-backgrounds" ON storage.objects FOR DELETE USING (bucket_id = 'card-backgrounds' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Update seed data with type
UPDATE public.card_backgrounds SET type = 'gradient', file_url = '' WHERE type IS NULL;
