-- Allow users to mark own notifications as read
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow super admins to update any notification
DROP POLICY IF EXISTS "Super admins can update notifications" ON public.notifications;
CREATE POLICY "Super admins can update notifications"
  ON public.notifications FOR UPDATE
  USING (public.is_super_admin());

-- Allow users to insert read receipts for global notifications
DROP POLICY IF EXISTS "Users can insert read receipts" ON public.notifications;
CREATE POLICY "Users can insert read receipts"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id AND read = true AND is_global = false);
