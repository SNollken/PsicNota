-- N3 — Paciente vê dados profissionais do psicólogo (para agendar)
--
-- A policy dados_psicologo_select (do schema-base) exige EXISTS em consultas,
-- então o paciente que está AGENDANDO (sem consulta ainda) encontra o
-- psicólogo em perfis mas não vê CRP, bio, especialidades em dados_psicologo.
-- Isso quebra a tela de agendamento (agenda-paciente.js lê dados_psicologo).
--
-- Correção: dados profissionais do psicólogo são informação pública
-- (o CRP é registro obrigatório e verificável). Permitir select quando:
--   (a) perfil_id = auth.uid() — psicólogo vê/edita os próprios dados
--   (b) o perfil referenciado tem papel = 'psicologo' — qualquer autenticado
--       pode ler dados profissionais de um psicólogo (para agendar)
--
-- Queries do front que dependem desta policy:
--   agenda-paciente.js:  select ... from dados_psicologo (via perfis join)
--   home.js (psicólogo): select ... from dados_psicologo where perfil_id = auth.uid()
-- Ambas continuam funcionando.

drop policy if exists dados_psicologo_select on public.dados_psicologo;

create policy dados_psicologo_select
on public.dados_psicologo
for select
to authenticated
using (
  -- (a) Próprio perfil profissional
  perfil_id = (select auth.uid())

  -- (b) Dados de qualquer psicólogo são públicos para autenticados
  --     (CRP é registro público; bio/especialidades são informação de vitrine)
  or exists (
    select 1
    from public.perfis p
    where p.id = dados_psicologo.perfil_id
      and p.papel = 'psicologo'
  )
);
