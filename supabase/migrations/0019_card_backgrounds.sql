-- Player card background options
CREATE TABLE IF NOT EXISTS public.card_backgrounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  gradient_from TEXT NOT NULL,
  gradient_via TEXT DEFAULT '',
  gradient_to TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User purchased backgrounds
CREATE TABLE IF NOT EXISTS public.user_card_backgrounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  background_id UUID NOT NULL REFERENCES public.card_backgrounds(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, background_id)
);

-- Selected background on profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS selected_card_background_id UUID REFERENCES public.card_backgrounds(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.card_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_card_backgrounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read backgrounds" ON public.card_backgrounds;
CREATE POLICY "Everyone can read backgrounds" ON public.card_backgrounds FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own purchases" ON public.user_card_backgrounds;
CREATE POLICY "Users can insert own purchases" ON public.user_card_backgrounds FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own purchases" ON public.user_card_backgrounds;
CREATE POLICY "Users can read own purchases" ON public.user_card_backgrounds FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all purchases" ON public.user_card_backgrounds;
CREATE POLICY "Admins can read all purchases" ON public.user_card_backgrounds FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Seed default backgrounds
INSERT INTO public.card_backgrounds (id, name, gradient_from, gradient_via, gradient_to, price) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Amber Flame', '#92400e', '#d97706', '#fbbf24', 0),
  ('00000000-0000-0000-0000-000000000002', 'Ocean Deep', '#1e3a5f', '#3b82f6', '#60a5fa', 50),
  ('00000000-0000-0000-0000-000000000003', 'Royal Purple', '#4c1d95', '#7c3aed', '#a78bfa', 75),
  ('00000000-0000-0000-0000-000000000004', 'Forest Emerald', '#064e3b', '#059669', '#34d399', 75),
  ('00000000-0000-0000-0000-000000000005', 'Crimson Night', '#7f1d1d', '#dc2626', '#fca5a5', 100),
  ('00000000-0000-0000-0000-000000000006', 'Midnight Galaxy', '#020617', '#1e293b', '#475569', 100),
  ('00000000-0000-0000-0000-000000000007', 'Sunset Blaze', '#7c2d12', '#ea580c', '#fdba74', 150),
  ('00000000-0000-0000-0000-000000000008', 'Cyber Pink', '#831843', '#ec4899', '#f9a8d4', 200)
ON CONFLICT (id) DO NOTHING;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.card_backgrounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_card_backgrounds;
