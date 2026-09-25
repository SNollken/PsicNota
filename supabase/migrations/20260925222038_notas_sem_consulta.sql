-- Allow one general quick note per psychologist without a linked appointment.
ALTER TABLE public.notas
  ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.notas
  DROP CONSTRAINT notas_pkey;

ALTER TABLE public.notas
  ADD CONSTRAINT notas_pkey PRIMARY KEY (id);

ALTER TABLE public.notas
  ALTER COLUMN consulta_id DROP NOT NULL;

ALTER TABLE public.notas
  ADD CONSTRAINT notas_consulta_id_key UNIQUE (consulta_id);

CREATE UNIQUE INDEX notas_psicologo_sem_consulta_uidx
  ON public.notas (psicologo_id)
  WHERE consulta_id IS NULL;
