-- Create polls table
CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_option text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Enable RLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Polls policies
-- Anyone can read active polls; super_admins can read all
CREATE POLICY "Anyone can read active polls"
  ON public.polls FOR SELECT
  USING (status = 'active' OR is_super_admin());

-- Only super_admins can insert/update/delete polls
CREATE POLICY "Super admins can insert polls"
  ON public.polls FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update polls"
  ON public.polls FOR UPDATE
  USING (is_super_admin());

CREATE POLICY "Super admins can delete polls"
  ON public.polls FOR DELETE
  USING (is_super_admin());

-- Votes policies
-- Users can read their own votes; super_admins can read all
CREATE POLICY "Users can read own votes"
  ON public.votes FOR SELECT
  USING (auth.uid() = user_id OR is_super_admin());

-- Users can insert their own votes (one per poll via UNIQUE)
CREATE POLICY "Users can vote"
  ON public.votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own vote (change their mind)
CREATE POLICY "Users can update own vote"
  ON public.votes FOR UPDATE
  USING (auth.uid() = user_id);

-- Super admins can delete any vote
CREATE POLICY "Super admins can delete votes"
  ON public.votes FOR DELETE
  USING (is_super_admin());

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
