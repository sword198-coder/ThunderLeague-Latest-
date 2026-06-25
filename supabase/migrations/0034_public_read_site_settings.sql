-- Allow public (non-authenticated) users to read site_settings
-- This is needed for the landing page hero, news ticker, and other public components
DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
CREATE POLICY "Public can read site settings"
  ON public.site_settings FOR SELECT
  TO public
  USING (true);

-- Super admins still have full access (insert/update/delete)
-- (existing policy "Only super admins can update site settings" handles that)
