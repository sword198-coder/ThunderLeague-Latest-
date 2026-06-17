ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own or global notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id OR is_global = true);
