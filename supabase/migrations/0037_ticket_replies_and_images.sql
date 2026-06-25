-- Add image_url to support_tickets
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create ticket_replies table
CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

-- Users can create replies on their own tickets
CREATE POLICY "Users can reply to own tickets"
  ON public.ticket_replies FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
  );

-- Admins can reply to any ticket
CREATE POLICY "Admins can reply to any ticket"
  ON public.ticket_replies FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Users can read replies on their own tickets
CREATE POLICY "Users can read own ticket replies"
  ON public.ticket_replies FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Admins can read all replies
CREATE POLICY "Admins can read all ticket replies"
  ON public.ticket_replies FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Users can delete their own replies
CREATE POLICY "Users can delete own replies"
  ON public.ticket_replies FOR DELETE
  USING (auth.uid() = user_id);

-- Ticket-images storage bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('ticket-images', 'ticket-images', true, false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ticket-images
DROP POLICY IF EXISTS "Public Access Ticket Images" ON storage.objects;
CREATE POLICY "Public Access Ticket Images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'ticket-images');

DROP POLICY IF EXISTS "Users Can Upload Ticket Images" ON storage.objects;
CREATE POLICY "Users Can Upload Ticket Images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ticket-images');

DROP POLICY IF EXISTS "Users Can Delete Ticket Images" ON storage.objects;
CREATE POLICY "Users Can Delete Ticket Images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ticket-images');
