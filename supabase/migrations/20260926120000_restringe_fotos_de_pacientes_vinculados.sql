drop policy if exists avatars_read_linked_patients on storage.objects;

create policy avatars_read_linked_patients
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.perfis patient
    where patient.id::text = (storage.foldername(name))[1]
      and patient.papel = 'paciente'
      and (select private.e_psicologo())
      and (
        exists (
          select 1
          from public.consultas c
          where c.psicologo_id = (select auth.uid())
            and c.paciente_id = patient.id
        )
        or exists (
          select 1
          from public.solicitacoes s
          where s.psicologo_id = (select auth.uid())
            and s.paciente_id = patient.id
        )
      )
  )
);
