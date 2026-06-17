ALTER TABLE public.tournament_participants
  ADD COLUMN in_game_name text,
  ADD COLUMN squadron text,
  ADD COLUMN country text NOT NULL DEFAULT '',
  ADD COLUMN vehicle text NOT NULL DEFAULT '',
  ADD COLUMN accepted_terms boolean NOT NULL DEFAULT false;

ALTER TABLE public.tournament_participants
  ALTER COLUMN country DROP DEFAULT,
  ALTER COLUMN vehicle DROP DEFAULT,
  ALTER COLUMN accepted_terms DROP DEFAULT;
