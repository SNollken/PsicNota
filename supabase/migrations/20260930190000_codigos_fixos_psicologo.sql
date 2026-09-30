create table public.codigos_psicologo (
  psicologo_id uuid primary key references public.perfis(id) on delete cascade,
  numero bigint generated always as identity unique,
  codigo text generated always as ('PN-' || numero::text) stored unique,
  criado_em timestamptz not null default now()
);
alter table public.codigos_psicologo enable row level security;
revoke all on public.codigos_psicologo from anon, authenticated;
grant select on public.codigos_psicologo to authenticated;
create policy codigos_psicologo_select on public.codigos_psicologo
for select to authenticated using (psicologo_id = (select auth.uid()));

create table public.vinculos_paciente (
  paciente_id uuid primary key references public.perfis(id) on delete cascade,
  psicologo_id uuid not null references public.perfis(id) on delete cascade,
  criado_em timestamptz not null default now(),
  check (paciente_id <> psicologo_id)
);
create index vinculos_paciente_psicologo_idx on public.vinculos_paciente(psicologo_id);
alter table public.vinculos_paciente enable row level security;
revoke all on public.vinculos_paciente from anon, authenticated;
grant select on public.vinculos_paciente to authenticated;
create policy vinculos_paciente_select on public.vinculos_paciente
for select to authenticated
using (paciente_id = (select auth.uid()) or psicologo_id = (select auth.uid()));

create function public.atribuir_codigo_psicologo()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.papel = 'psicologo' then
    insert into public.codigos_psicologo (psicologo_id) values (new.id);
  end if;
  return new;
end;
$$;
revoke all on function public.atribuir_codigo_psicologo() from public, anon, authenticated;
create trigger atribuir_codigo_psicologo
  after insert on public.perfis for each row execute function public.atribuir_codigo_psicologo();

create function public.obter_codigo_psicologo()
returns text language plpgsql security definer set search_path = ''
as $$
declare
  codigo_atual text;
begin
  if not exists (select 1 from public.perfis where id = auth.uid() and papel = 'psicologo') then
    raise exception 'Apenas psicólogos podem consultar seu código';
  end if;
  select codigo into codigo_atual from public.codigos_psicologo where psicologo_id = auth.uid();
  if codigo_atual is null then
    raise exception 'Código profissional indisponível';
  end if;
  return codigo_atual;
end;
$$;
revoke all on function public.obter_codigo_psicologo() from public, anon;
grant execute on function public.obter_codigo_psicologo() to authenticated;
