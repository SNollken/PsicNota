-- Convites de uso único para cadastro de pacientes.
-- Aplicar no Supabase antes de publicar a interface atualizada.
create table if not exists public.convites_paciente (
  codigo text primary key,
  psicologo_id uuid not null references public.perfis(id),
  paciente_id uuid unique references auth.users(id),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '7 days')
);
alter table public.convites_paciente enable row level security;
revoke all on public.convites_paciente from anon, authenticated;

create or replace function public.criar_convite_paciente()
returns text language plpgsql security definer
set search_path = ''
as $$
declare
  novo_codigo text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.perfis
    where id = auth.uid() and papel = 'psicologo'
  ) then
    raise exception 'Apenas psicólogos podem criar convites';
  end if;

  -- Dois UUIDs aleatórios fornecem 256 bits de entropia.
  novo_codigo := upper(replace(gen_random_uuid()::text, '-', '') ||
                       replace(gen_random_uuid()::text, '-', ''));
  insert into public.convites_paciente (codigo, psicologo_id)
  values (novo_codigo, auth.uid());
  return novo_codigo;
end;
$$;
revoke all on function public.criar_convite_paciente() from public, anon;
grant execute on function public.criar_convite_paciente() to authenticated;

create or replace function public.exigir_convite_paciente()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  codigo_informado text;
begin
  if new.raw_user_meta_data ->> 'papel' = 'paciente' then
    codigo_informado := upper(trim(coalesce(new.raw_user_meta_data ->> 'codigo_convite', '')));
    update public.convites_paciente
       set paciente_id = new.id
     where codigo = codigo_informado
       and paciente_id is null
       and expira_em > now();
    if not found then
      raise exception 'Código de convite inválido, expirado ou já utilizado';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists zzz_exigir_convite_paciente on auth.users;
create trigger zzz_exigir_convite_paciente
  after insert on auth.users
  for each row execute function public.exigir_convite_paciente();
