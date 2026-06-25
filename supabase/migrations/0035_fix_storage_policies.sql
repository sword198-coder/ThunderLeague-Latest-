-- Fix storage policies with unique names per bucket
-- Uses DROP IF EXISTS to be idempotent

-- hero-images bucket policies
DROP POLICY IF EXISTS "Public Access Hero Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Insert Hero Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Hero Images" ON storage.objects;

CREATE POLICY "Public Access Hero Images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'hero-images');
CREATE POLICY "Admin Insert Hero Images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hero-images');
CREATE POLICY "Admin Delete Hero Images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'hero-images');

-- tournament-thumbnails bucket policies
DROP POLICY IF EXISTS "Public Access Tournament Thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admin Insert Tournament Thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Tournament Thumbnails" ON storage.objects;

CREATE POLICY "Public Access Tournament Thumbnails" ON storage.objects FOR SELECT TO public USING (bucket_id = 'tournament-thumbnails');
CREATE POLICY "Admin Insert Tournament Thumbnails" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tournament-thumbnails');
CREATE POLICY "Admin Delete Tournament Thumbnails" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tournament-thumbnails');
