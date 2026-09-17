-- Pacientes precisam ver o perfil basico de psicologos para enviar
-- solicitacoes de consulta (a politica anterior so expunha psicologos
-- com consulta em comum, entao paciente novo nao encontrava ninguem).
-- Mantem as hipoteses anteriores e acrescenta papel = 'psicologo'.

drop policy if exists perfis_select on public.perfis;

create policy perfis_select
on public.perfis
for select
to authenticated
using (
  id = (select auth.uid())
  or papel = 'psicologo'
  or (
    papel = 'paciente'
    and (select private.e_psicologo((select auth.uid())))
  )
  or exists (
    select 1
    from public.consultas c
    where (
      c.psicologo_id = (select auth.uid())
      and c.paciente_id = perfis.id
    ) or (
      c.paciente_id = (select auth.uid())
      and c.psicologo_id = perfis.id
    )
  )
);
