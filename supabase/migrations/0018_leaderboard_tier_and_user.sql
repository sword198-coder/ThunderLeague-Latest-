-- Add user_id and tier to leaderboard_entries
ALTER TABLE public.leaderboard_entries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.leaderboard_entries ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'high' CHECK (tier IN ('low', 'mid', 'high'));
