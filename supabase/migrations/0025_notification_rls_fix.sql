-- Allow users to mark own or global notifications as read
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id OR is_global = true);

-- Allow super admins to update any notification
DROP POLICY IF EXISTS "Super admins can update notifications" ON public.notifications;
CREATE POLICY "Super admins can update notifications"
  ON public.notifications FOR UPDATE
  USING (public.is_super_admin());
