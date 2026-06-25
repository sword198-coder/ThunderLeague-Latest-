-- Create storage bucket for trailer videos
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('trailer-videos', 'trailer-videos', true, false, 104857600, ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for trailer-videos
DROP POLICY IF EXISTS "Public Access Trailer Videos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Insert Trailer Videos" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Trailer Videos" ON storage.objects;

CREATE POLICY "Public Access Trailer Videos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'trailer-videos');
CREATE POLICY "Admin Insert Trailer Videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'trailer-videos');
CREATE POLICY "Admin Delete Trailer Videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'trailer-videos');

-- RPC function to auto-update tournament status (bypasses RLS)
CREATE OR REPLACE FUNCTION public.auto_update_tournament_status(tournament_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t_status TEXT;
  t_start TIMESTAMPTZ;
  t_end TIMESTAMPTZ;
  new_status TEXT;
BEGIN
  SELECT status, start_date, end_date INTO t_status, t_start, t_end
  FROM public.tournaments WHERE id = tournament_id;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  new_status := t_status;

  IF t_status = 'upcoming' AND NOW() >= t_start THEN
    new_status := CASE WHEN NOW() >= t_end THEN 'completed' ELSE 'active' END;
  ELSIF t_status = 'active' AND NOW() >= t_end THEN
    new_status := 'completed';
  END IF;

  IF new_status != t_status THEN
    UPDATE public.tournaments SET status = new_status WHERE id = tournament_id;
    RETURN new_status;
  END IF;

  RETURN 'unchanged';
END;
$$;
