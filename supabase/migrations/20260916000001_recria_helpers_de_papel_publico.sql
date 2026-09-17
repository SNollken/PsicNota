-- Corrige as funcoes helper de papel no schema public.
--
-- A migration 20260915 criou private.e_psicologo e, no final, executa
-- "drop function if exists public.e_psicologo()". As policies de
-- solicitacoes, consultas e notas porem referenciam public.e_paciente()
-- e public.e_psicologo(), que por sua vez chamam public.papel_atual(uid).
-- Sem public.papel_atual, o insert de uma solicitacao pelo paciente falha
-- com 42883 ("function public.papel_atual(uuid) does not exist").
--
-- Esta migration recria a familia public no mesmo formato do
-- schema-base (schema-proposto.sql), sem mexer em private.e_psicologo
-- nem em nenhuma policy. Idempotente.

create or replace function public.papel_atual(uid uuid default auth.uid())
returns text language sql stable security definer set search_path = public as
$$ select papel from public.perfis where id = uid $$;

create or replace function public.e_psicologo(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as
$$ select coalesce(public.papel_atual(uid), '') = 'psicologo' $$;

create or replace function public.e_paciente(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as
$$ select coalesce(public.papel_atual(uid), '') = 'paciente' $$;

revoke all on function public.papel_atual(uuid) from public, anon;
revoke all on function public.e_psicologo(uuid) from public, anon;
revoke all on function public.e_paciente(uuid) from public, anon;

grant execute on function public.papel_atual(uuid) to authenticated;
grant execute on function public.e_psicologo(uuid) to authenticated;
grant execute on function public.e_paciente(uuid) to authenticated;
