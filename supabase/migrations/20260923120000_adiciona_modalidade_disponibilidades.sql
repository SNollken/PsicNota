ALTER TABLE public.disponibilidades
  ADD COLUMN IF NOT EXISTS modalidade text NOT NULL DEFAULT 'online';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'disponibilidades_modalidade_check'
      AND conrelid = 'public.disponibilidades'::regclass
  ) THEN
    ALTER TABLE public.disponibilidades
      ADD CONSTRAINT disponibilidades_modalidade_check
      CHECK (modalidade IN ('online', 'presencial'));
  END IF;
END $$;
