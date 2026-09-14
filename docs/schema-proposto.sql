-- =====================================================================
-- PSICNOTA - SCHEMA INICIAL v2 (Supabase PostgreSQL 17)
-- Status: revisado para aplicacao unica em banco vazio.
-- Projeto: gjfqslgoplpqeqewytdn (regiao sa-east-1)
-- Data: 2026-08-26
--
-- Modelo de dados derivado do prototipo (assets/js/shared-data.js,
-- cadastro.js, agenda-psicologo.js, agenda-paciente.js, perfil.js,
-- pacientes.js).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) EXTENSOES
-- ---------------------------------------------------------------------
create extension if not exists pg_trgm;     -- busca por nome de paciente (opcional)

-- ---------------------------------------------------------------------
-- 1) UTILITARIO
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2) PERFIS (estende auth.users; 1 linha por usuario)
--    LGPD: consentimento explicito versionado no cadastro.
-- ---------------------------------------------------------------------
create table public.perfis (
  id                       uuid primary key references auth.users (id) on delete cascade,
  papel                    text not null check (papel in ('psicologo','paciente')),
  nome_completo            text not null check (char_length(trim(nome_completo)) >= 3),
  nome_social              text,
  pronomes                 text,
  genero                   text,
  cidade                   text,
  estado                   char(2),
  formato_preferido        text,
  periodo_preferido        text,
  lembretes_consulta       boolean not null default false,
  notificacoes_email       boolean not null default false,
  data_nascimento          date,
  telefone                 text,
  email                    text not null,
  avatar_url               text,  -- caminho no storage, nunca data URL (minimizacao)
  lgpd_consentimento_em    timestamptz not null default now(),
  lgpd_consentimento_versao text not null default '1.0',
  criado_em                timestamptz not null default now(),
  atualizado_em            timestamptz not null default now()
);

create index perfis_papel_idx on public.perfis (papel);

-- Dados profissionais (somente psicologo)
create table public.dados_psicologo (
  perfil_id           uuid primary key references public.perfis (id) on delete cascade,
  crp_numero          text not null check (char_length(trim(crp_numero)) >= 4),
  crp_uf              text not null check (char_length(crp_uf) = 2),
  especialidade       text,
  formato_atendimento text not null default 'ambos'
                      check (formato_atendimento in ('online','presencial','ambos')),
  sobre_mim           text,
  abordagem_terapeutica text,
  publico_atendido    text,
  areas_atuacao       text[] not null default '{}',
  constraint dados_psicologo_crp_unico unique (crp_uf, crp_numero)
);

-- Disponibilidade semanal do psicologo (os "slots" do prototipo)
create table public.disponibilidades (
  id           uuid primary key default gen_random_uuid(),
  psicologo_id uuid not null references public.perfis (id) on delete cascade,
  dia_semana   smallint not null check (dia_semana between 0 and 6),  -- 0 = domingo
  horario      time not null,
  unique (psicologo_id, dia_semana, horario)
);

-- ---------------------------------------------------------------------
-- 3) SOLICITACOES (paciente pede um horario; psicologo aprova/recusa)
-- ---------------------------------------------------------------------
create table public.solicitacoes (
  id            uuid primary key default gen_random_uuid(),
  psicologo_id  uuid not null references public.perfis (id) on delete cascade,
  paciente_id   uuid not null references public.perfis (id) on delete cascade,
  data_desejada date not null,
  horario       time not null,
  duracao_min   smallint not null default 50 check (duracao_min > 0),
  modalidade    text not null check (modalidade in ('online','presencial')),
  observacao    text,
  status        text not null default 'pending'
                check (status in ('pending','approved','rejected','cancelled')),
  solicitado_em timestamptz not null default now(),
  revisado_em   timestamptz,
  motivo_recusa text
);

-- impede 2 solicitacoes pendentes do mesmo paciente pro mesmo slot
create unique index solicitacoes_pendente_unicas_idx
  on public.solicitacoes (paciente_id, data_desejada, horario)
  where status = 'pending';

create index solicitacoes_psicologo_status_idx on public.solicitacoes (psicologo_id, status);
create index solicitacoes_paciente_idx on public.solicitacoes (paciente_id);

-- ---------------------------------------------------------------------
-- 4) CONSULTAS (agendamentos confirmados)
--    Tenant = psicologo: toda linha clinica carrega psicologo_id.
-- ---------------------------------------------------------------------
create table public.consultas (
  id             uuid primary key default gen_random_uuid(),
  psicologo_id   uuid not null references public.perfis (id) on delete cascade,
  paciente_id    uuid not null references public.perfis (id) on delete cascade,
  data           date not null,
  horario        time not null,
  duracao_min    smallint not null default 50 check (duracao_min > 0),
  modalidade     text not null check (modalidade in ('online','presencial')),
  status         text not null default 'confirmed'
                 check (status in ('scheduled','confirmed','completed','cancelled','no_show')),
  observacao     text,
  origem         text not null default 'psychologist'
                 check (origem in ('psychologist','patient_request')),
  solicitacao_id uuid references public.solicitacoes (id) on delete set null,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

-- slot unico por psicologo (ignorando canceladas) - igual ao prototipo
create unique index consultas_slot_unico_idx
  on public.consultas (psicologo_id, data, horario)
  where status <> 'cancelled';

create index consultas_psicologo_data_idx on public.consultas (psicologo_id, data);
create index consultas_paciente_data_idx  on public.consultas (paciente_id, data);
create index consultas_abertas_idx on public.consultas (status)
  where status in ('scheduled','confirmed');

-- ---------------------------------------------------------------------
-- 5) NOTAS (notas rapidas durante a consulta; 1:1 com a consulta)
--    LGPD: paciente NUNCA ve.
-- ---------------------------------------------------------------------
create table public.notas (
  consulta_id   uuid primary key references public.consultas (id) on delete cascade,
  psicologo_id  uuid not null references public.perfis (id) on delete cascade,
  conteudo      text not null default '',
  humor         text check (humor in ('muito-bem','bem','neutro','mal','muito-mal')),
  atualizado_em timestamptz not null default now()
);

create index notas_psicologo_idx on public.notas (psicologo_id);

-- ---------------------------------------------------------------------
-- 6) LOGS DE ACESSO (accountability LGPD; so metadados, nunca conteudo)
--    Escrita apenas via service_role/backend; nenhum usuario le direto.
-- ---------------------------------------------------------------------
create table public.logs_acesso (
  id          bigint generated always as identity primary key,
  ator_id     uuid references public.perfis (id) on delete set null,
  tabela_alvo text not null,
  registro_id text,
  acao        text not null check (acao in ('select','insert','update','delete')),
  ip          inet,
  user_agent  text,
  criado_em   timestamptz not null default now()
);

create index logs_acesso_ator_idx on public.logs_acesso (ator_id, criado_em desc);
create index logs_acesso_alvo_idx on public.logs_acesso (tabela_alvo, registro_id);

-- ---------------------------------------------------------------------
-- 7) TRIGGERS
-- ---------------------------------------------------------------------
create trigger trg_perfis_updated     before update on public.perfis     for each row execute function public.set_updated_at();
create trigger trg_consultas_updated  before update on public.consultas  for each row execute function public.set_updated_at();
create trigger trg_notas_updated      before update on public.notas      for each row execute function public.set_updated_at();

-- Cria perfil automaticamente quando o usuario se cadastra no Supabase Auth.
-- CONTRATO DE INTEGRACAO: o signUp (cadastro.js, hoje ainda demo/localStorage)
-- deve enviar em options.data (raw_user_meta_data) as chaves:
--   papel ('psicologo'|'paciente'), nome_completo, data_nascimento (AAAA-MM-DD),
--   telefone, e para psicologo: crp_numero, crp_uf (2 letras), especialidade,
--   formato_atendimento ('online'|'presencial'|'ambos').
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p_papel text := coalesce(new.raw_user_meta_data->>'papel', 'paciente');
begin
  insert into public.perfis (id, papel, nome_completo, data_nascimento, telefone, email)
  values (
    new.id,
    case when p_papel = 'psicologo' then 'psicologo' else 'paciente' end,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nome_completo'), ''), 'Usuário'),
    case
      when nullif(new.raw_user_meta_data->>'data_nascimento', '') is null then null
      when new.raw_user_meta_data->>'data_nascimento' ~ '^\\d{2}/\\d{2}/\\d{4}$'
        then to_date(new.raw_user_meta_data->>'data_nascimento', 'DD/MM/YYYY')
      else (new.raw_user_meta_data->>'data_nascimento')::date
    end,
    nullif(new.raw_user_meta_data->>'telefone', ''),
    new.email
  );

  -- Defensivo: so cria dados_psicologo se o CRP completo veio no cadastro;
  -- senao o psicologo completa depois pelo perfil (evita quebrar o signup
  -- e nunca fabrica dado de registro do psicólogo).
  if p_papel = 'psicologo'
     and nullif(trim(new.raw_user_meta_data->>'crp_numero'), '') is not null
     and nullif(trim(new.raw_user_meta_data->>'crp_uf'), '') is not null then
    insert into public.dados_psicologo (perfil_id, crp_numero, crp_uf, especialidade, formato_atendimento)
    values (
      new.id,
      trim(new.raw_user_meta_data->>'crp_numero'),
      upper(trim(new.raw_user_meta_data->>'crp_uf')),
      new.raw_user_meta_data->>'especialidade',
      coalesce(new.raw_user_meta_data->>'formato_atendimento', 'ambos')
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 8) RLS - MULTI-TENANT
--     Tenant = psicologo (cada consultorio e isolado).
--     Psicologo: tudo que tem psicologo_id = auth.uid().
--     Paciente: so as proprias linhas; notas NUNCA.
-- ---------------------------------------------------------------------
alter table public.perfis              enable row level security;
alter table public.dados_psicologo     enable row level security;
alter table public.disponibilidades    enable row level security;
alter table public.solicitacoes        enable row level security;
alter table public.consultas           enable row level security;
alter table public.notas               enable row level security;
alter table public.logs_acesso         enable row level security;

-- Helpers SECURITY DEFINER (evitam recursao de RLS na tabela perfis)
create or replace function public.papel_atual(uid uuid default auth.uid())
returns text language sql stable security definer set search_path = public as
$$ select papel from public.perfis where id = uid $$;

create or replace function public.e_psicologo(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as
$$ select coalesce(public.papel_atual(uid), '') = 'psicologo' $$;

create or replace function public.e_paciente(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as
$$ select coalesce(public.papel_atual(uid), '') = 'paciente' $$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.papel_atual(uuid) from public;
revoke all on function public.e_psicologo(uuid) from public;
revoke all on function public.e_paciente(uuid) from public;
grant execute on function public.papel_atual(uuid) to authenticated;
grant execute on function public.e_psicologo(uuid) to authenticated;
grant execute on function public.e_paciente(uuid) to authenticated;

-- PERFIS: cada um ve/edita o proprio; psicologo ve pacientes com consulta
-- em comum; paciente ve dados basicos dos proprios psicologos.
create policy perfis_select on public.perfis for select using (
  id = auth.uid()
  or exists (
    select 1 from public.consultas c
    where (c.psicologo_id = auth.uid() and c.paciente_id  = perfis.id)
       or (c.paciente_id  = auth.uid() and c.psicologo_id = perfis.id)
  )
);
create policy perfis_insert on public.perfis for insert
  with check (id = auth.uid());
create policy perfis_update on public.perfis for update
  using (id = auth.uid()) with check (id = auth.uid());
-- Sem politica de delete: remocao de conta passa pelo service_role
-- (fluxo LGPD controlado, com baixa de arquivos no storage).

-- DADOS DO PSICOLOGO: o proprio edita; paciente ve o CRP de quem o atende.
create policy dados_psicologo_select on public.dados_psicologo for select using (
  perfil_id = auth.uid()
  or exists (
    select 1 from public.consultas c
    where c.psicologo_id = dados_psicologo.perfil_id
      and c.paciente_id  = auth.uid()
  )
);
create policy dados_psicologo_write on public.dados_psicologo for all
  using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());

-- DISPONIBILIDADES: slots sao necessarios pro agendamento (nao sao
-- sensiveis); escrita so do proprio psicologo.
create policy disponibilidades_select on public.disponibilidades for select
  to authenticated using (true);
create policy disponibilidades_write on public.disponibilidades for all
  using (public.e_psicologo() and psicologo_id = auth.uid())
  with check (public.e_psicologo() and psicologo_id = auth.uid());

-- SOLICITACOES
create policy solicitacoes_paciente_select on public.solicitacoes for select
  using (paciente_id = auth.uid());
create policy solicitacoes_paciente_insert on public.solicitacoes for insert
  with check (
    public.e_paciente()
    and paciente_id = auth.uid()
    and status = 'pending'
    and exists (select 1 from public.perfis p
                where p.id = solicitacoes.psicologo_id and p.papel = 'psicologo')
  );
create policy solicitacoes_psicologo_select on public.solicitacoes for select
  using (public.e_psicologo() and psicologo_id = auth.uid());
create policy solicitacoes_psicologo_update on public.solicitacoes for update
  using (public.e_psicologo() and psicologo_id = auth.uid() and status = 'pending')
  with check (public.e_psicologo() and psicologo_id = auth.uid()
              and status in ('approved','rejected'));
-- Paciente cancela a propria solicitacao pendente (fluxo do prototipo).
create policy solicitacoes_paciente_cancel on public.solicitacoes for update
  using (paciente_id = auth.uid() and status = 'pending')
  with check (paciente_id = auth.uid() and status = 'cancelled');

-- CONSULTAS
create policy consultas_paciente_select on public.consultas for select
  using (paciente_id = auth.uid());
create policy consultas_psicologo_all on public.consultas for all
  using (public.e_psicologo() and psicologo_id = auth.uid())
  with check (public.e_psicologo() and psicologo_id = auth.uid());

-- NOTAS: somente o psicologo dono.
-- Paciente nao tem nenhuma politica = acesso negado por padrao.
create policy notas_psicologo_all on public.notas for all
  using (public.e_psicologo() and psicologo_id = auth.uid())
  with check (public.e_psicologo() and psicologo_id = auth.uid());

-- LOGS_ACESSO: RLS ligado e zero politicas = ninguem le/escreve direto.
-- Escrita so pelo backend com service_role (que tem BYPASSRLS).

-- View do paciente: proprias consultas sem campos internos (observacao).
-- RLS continua valendo (security_invoker).
create view public.minhas_consultas with (security_invoker = true) as
select id, psicologo_id, data, horario, duracao_min, modalidade, status
from public.consultas
where paciente_id = auth.uid();

grant select on public.minhas_consultas to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------------
-- 12) STORAGE (buckets privados)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- avatars: caminho <uid>/arquivo
create policy avatars_read_own on storage.objects for select
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy avatars_insert_own on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy avatars_update_own on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy avatars_delete_own on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);


-- =====================================================================
-- FIM DA PROPOSTA. Notas de aplicacao:
-- 1) O Supabase ja da GRANT padrao (anon/authenticated/service_role)
--    nas tabelas criadas pelo papel postgres; se quiser explicito,
--    descomente:
-- grant select, insert, update, delete on all tables in schema public to authenticated;
-- 2) Logs de acesso: backend (service_role) insert em logs_acesso;
--    nunca logar conteudo clinico, so metadados.
-- 3) Remocao de conta (LGPD): apagar auth.users via backend; o CASCADE
--    limpa as tabelas; falta limpar storage (job/trigger a definir).
-- =====================================================================
