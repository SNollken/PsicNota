revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.e_psicologo(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfis
    where id = uid
      and papel = 'psicologo'
  );
$$;

revoke all on function private.e_psicologo(uuid) from public, anon;
grant execute on function private.e_psicologo(uuid) to authenticated;

alter table public.perfis enable row level security;

drop policy if exists "Psicologos visualizam perfis de pacientes" on public.perfis;
drop policy if exists perfis_select on public.perfis;

create policy perfis_select
on public.perfis
for select
to authenticated
using (
  id = (select auth.uid())
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

drop function if exists public.e_psicologo();
