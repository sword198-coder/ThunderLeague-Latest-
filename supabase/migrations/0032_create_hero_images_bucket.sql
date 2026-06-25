INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('hero-images', 'hero-images', true, false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'hero-images');
CREATE POLICY "Admin Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hero-images');
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'hero-images');
