-- Add nationality & discord_username to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_username TEXT;

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can insert their own tickets
CREATE POLICY "Users can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own tickets
CREATE POLICY "Users can read own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all tickets
CREATE POLICY "Admins can read all tickets"
  ON public.support_tickets FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Admins can update any ticket
CREATE POLICY "Admins can update tickets"
  ON public.support_tickets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));
