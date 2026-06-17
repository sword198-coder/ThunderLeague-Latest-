-- Extend profiles with WT preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS play_countries text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS play_tiers text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS play_mode text DEFAULT 'both' CHECK (play_mode IN ('air', 'ground', 'both'));

-- Fix recursive RLS policies by using is_super_admin() function
DROP POLICY IF EXISTS "Super admins can read all profiles" ON public.profiles;
CREATE POLICY "Super admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can insert notifications" ON public.notifications;
CREATE POLICY "Super admins can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Only super admins can update site settings" ON public.site_settings;
CREATE POLICY "Only super admins can update site settings"
  ON public.site_settings FOR ALL
  USING (public.is_super_admin());

-- Avatar storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users manage own avatar"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
