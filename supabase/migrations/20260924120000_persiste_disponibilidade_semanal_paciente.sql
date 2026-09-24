ALTER TABLE public.perfis
  ADD COLUMN IF NOT EXISTS disponibilidade_online jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS disponibilidade_presencial jsonb NOT NULL DEFAULT '[]'::jsonb;
