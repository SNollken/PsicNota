-- H1 — Isola pacientes entre psicólogos (falha de privacidade)
--
-- A policy perfis_select anterior (20260916000000) tinha a cláusula:
--   papel = 'paciente' AND private.e_psicologo(auth.uid())
-- Isso permitia que QUALQUER psicólogo lesse TODOS os pacientes,
-- independente de vínculo. Um psicólogo deve ver apenas:
--   (a) o próprio perfil
--   (b) perfis de psicólogos (paciente precisa listar para agendar)
--   (c) pacientes com vínculo via consultas OU solicitações
--
-- Queries do front que dependem desta policy:
--   pacientes.js:        select id,nome_completo,nome_social,email from perfis where papel='paciente'
--   paciente-perfil.js:  select * from perfis where papel='paciente' and nome_completo=?
--   agenda-paciente.js:  select ... from perfis where papel='psicologo'
-- Todas continuam funcionando: (a) cobre o próprio perfil,
-- (b) mantém papel='psicologo' aberto, (c) filtra pacientes por vínculo.

drop policy if exists perfis_select on public.perfis;

create policy perfis_select
on public.perfis
for select
to authenticated
using (
  -- (a) Próprio perfil — sempre visível
  id = (select auth.uid())

  -- (b) Psicólogos são visíveis para todos os autenticados
  --     (paciente precisa listar psicólogos para enviar solicitação)
  or papel = 'psicologo'

  -- (c) Paciente vinculado ao psicólogo logado (via consulta existente)
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

  -- (c) Paciente vinculado via solicitação (cobre paciente novo,
  --     sem consulta ainda — só tem solicitação pendente/aprovada)
  or exists (
    select 1
    from public.solicitacoes s
    where (
      s.psicologo_id = (select auth.uid())
      and s.paciente_id = perfis.id
    ) or (
      s.paciente_id = (select auth.uid())
      and s.psicologo_id = perfis.id
    )
  )
);
