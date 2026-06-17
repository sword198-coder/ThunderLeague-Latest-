ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS war_thunder_username text,
ADD COLUMN IF NOT EXISTS squadron_name text;
