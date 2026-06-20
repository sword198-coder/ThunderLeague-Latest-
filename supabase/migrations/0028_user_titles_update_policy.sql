-- Allow super admins to update user_titles (needed for upsert)
DROP POLICY IF EXISTS "Admins can update user titles" ON public.user_titles;
CREATE POLICY "Admins can update user titles"
  ON public.user_titles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
