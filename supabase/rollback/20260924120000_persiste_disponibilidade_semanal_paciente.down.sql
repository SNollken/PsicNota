ALTER TABLE public.perfis
  DROP COLUMN IF EXISTS disponibilidade_online,
  DROP COLUMN IF EXISTS disponibilidade_presencial;
