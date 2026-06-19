-- Allow super_admin to update all profiles (SELECT already covered by policy from 0006)
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_super_admin());

-- Allow users to insert own purchase logs (negative amounts = point deductions)
DROP POLICY IF EXISTS "Users can insert own purchase logs" ON public.thunder_points_log;
CREATE POLICY "Users can insert own purchase logs"
  ON public.thunder_points_log FOR INSERT
  WITH CHECK (auth.uid() = user_id AND amount < 0);
