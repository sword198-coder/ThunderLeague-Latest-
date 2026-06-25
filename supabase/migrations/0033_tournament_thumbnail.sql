-- Add thumbnail_url column to tournaments table
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Create storage bucket for tournament thumbnails
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('tournament-thumbnails', 'tournament-thumbnails', true, false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access Tournament Thumbnails" ON storage.objects FOR SELECT TO public USING (bucket_id = 'tournament-thumbnails');
CREATE POLICY "Admin Insert Tournament Thumbnails" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tournament-thumbnails');
CREATE POLICY "Admin Delete Tournament Thumbnails" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tournament-thumbnails');
