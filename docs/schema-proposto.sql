-- =====================================================================
-- PSICNOTA - SCHEMA PROPOSTO v1 (Supabase PostgreSQL 17)
-- Status: PROPOSTA. NAO EXECUTAR sem revisao da Sofia.
-- Projeto: gjfqslgoplpqeqewytdn (regiao sa-east-1)
-- Data: 2026-08-26
--
-- Modelo de dados derivado do prototipo (assets/js/shared-data.js,
-- cadastro.js, agenda-psicologo.js, agenda-paciente.js, relatorios.js,
-- laudos.js, perfil.js, pacientes.js).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) EXTENSOES
-- ---------------------------------------------------------------------
create extension if not exists btree_gist;  -- preparacao p/ restricao de sobreposicao de horarios
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
  motivo_recusa text,
  consulta_id   uuid  -- FK criada apos a tabela consultas (referencia mutua)
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

-- fecha a referencia mutua
alter table public.solicitacoes
  add constraint solicitacoes_consulta_fk
  foreign key (consulta_id) references public.consultas (id) on delete set null;

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
-- 6) RELATORIOS (pos-consulta; blocos estruturados + texto livre)
--    LGPD: paciente NUNCA ve.
-- ---------------------------------------------------------------------
create table public.relatorios (
  id                    uuid primary key default gen_random_uuid(),
  psicologo_id          uuid not null references public.perfis (id) on delete cascade,
  paciente_id           uuid not null references public.perfis (id) on delete cascade,
  consulta_id           uuid references public.consultas (id) on delete set null,
  humor                 text check (humor in ('muito-bem','bem','neutro','mal','muito-mal')),
  bloco_queixa          text not null default '',
  bloco_intervencao     text not null default '',
  bloco_evolucao        text not null default '',
  bloco_encaminhamentos text not null default '',
  texto_livre           text not null default '',
  status                text not null default 'draft' check (status in ('draft','final')),
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);

create index relatorios_psicologo_idx on public.relatorios (psicologo_id, atualizado_em desc);
create index relatorios_paciente_idx  on public.relatorios (paciente_id);
create index relatorios_consulta_idx  on public.relatorios (consulta_id);

-- ---------------------------------------------------------------------
-- 7) ANEXOS DE RELATORIO (arquivos no storage; aqui so metadados)
-- ---------------------------------------------------------------------
create table public.anexos_relatorio (
  id            uuid primary key default gen_random_uuid(),
  relatorio_id  uuid not null references public.relatorios (id) on delete cascade,
  psicologo_id  uuid not null references public.perfis (id) on delete cascade,
  storage_path  text not null,
  nome_arquivo  text not null,
  tamanho_bytes bigint check (tamanho_bytes is null or tamanho_bytes >= 0),
  mime_type     text,
  adicionado_em timestamptz not null default now()
);

create index anexos_relatorio_idx on public.anexos_relatorio (relatorio_id);

-- ---------------------------------------------------------------------
-- 8) DOCUMENTOS (laudos e receitas em uma tabela so, discriminados por
--    tipo; o PDF sai do template do psicologo)
-- ---------------------------------------------------------------------
create table public.documentos (
  id                     uuid primary key default gen_random_uuid(),
  psicologo_id           uuid not null references public.perfis (id) on delete cascade,
  paciente_id            uuid not null references public.perfis (id) on delete cascade,
  tipo                   text not null check (tipo in ('laudo','receita')),
  titulo                 text not null,
  storage_path           text not null,
  liberado_para_paciente boolean not null default false,
  liberado_em            timestamptz,
  criado_em              timestamptz not null default now()
);

create index documentos_paciente_idx on public.documentos (paciente_id)
  where liberado_para_paciente;
create index documentos_psicologo_idx on public.documentos (psicologo_id, criado_em desc);

-- Template de PDF do psicologo
create table public.templates_documento (
  psicologo_id  uuid primary key references public.perfis (id) on delete cascade,
  storage_path  text not null,
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 9) LOGS DE ACESSO (accountability LGPD; so metadados, nunca conteudo)
--    Escrita apenas via service_role/backend; nenhum usuario le direto.
-- ---------------------------------------------------------------------
create table public.logs_acesso (
  id          bigint generated always as identity primary key,
  ator_id     uuid references public.perfis (id) on delete set null,
  tabela_alvo text not null,
  registro_id uuid,
  acao        text not null check (acao in ('select','insert','update','delete')),
  ip          inet,
  user_agent  text,
  criado_em   timestamptz not null default now()
);

create index logs_acesso_ator_idx on public.logs_acesso (ator_id, criado_em desc);
create index logs_acesso_alvo_idx on public.logs_acesso (tabela_alvo, registro_id);

-- ---------------------------------------------------------------------
-- 10) TRIGGERS
-- ---------------------------------------------------------------------
create trigger trg_perfis_updated     before update on public.perfis     for each row execute function public.set_updated_at();
create trigger trg_consultas_updated  before update on public.consultas  for each row execute function public.set_updated_at();
create trigger trg_notas_updated      before update on public.notas      for each row execute function public.set_updated_at();
create trigger trg_relatorios_updated before update on public.relatorios for each row execute function public.set_updated_at();

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
    coalesce(nullif(trim(new.raw_user_meta_data->>'nome_completo'), ''), 'Usuario'),
    nullif(new.raw_user_meta_data->>'data_nascimento', '')::date,
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
-- 11) RLS - MULTI-TENANT
--     Tenant = psicologo (cada consultorio e isolado).
--     Psicologo: tudo que tem psicologo_id = auth.uid().
--     Paciente: so as proprias linhas; notas/relatorios/anexos NUNCA.
-- ---------------------------------------------------------------------
alter table public.perfis              enable row level security;
alter table public.dados_psicologo     enable row level security;
alter table public.disponibilidades    enable row level security;
alter table public.solicitacoes        enable row level security;
alter table public.consultas           enable row level security;
alter table public.notas               enable row level security;
alter table public.relatorios          enable row level security;
alter table public.anexos_relatorio    enable row level security;
alter table public.documentos          enable row level security;
alter table public.templates_documento enable row level security;
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
  using (auth.role() = 'authenticated');
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
  with check (public.e_psicologo() and psicologo_id = auth.uid());
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

-- NOTAS / RELATORIOS / ANEXOS / TEMPLATES: somente o psicologo dono.
-- Paciente nao tem nenhuma politica = acesso negado por padrao.
create policy notas_psicologo_all on public.notas for all
  using (public.e_psicologo() and psicologo_id = auth.uid())
  with check (public.e_psicologo() and psicologo_id = auth.uid());

create policy relatorios_psicologo_all on public.relatorios for all
  using (public.e_psicologo() and psicologo_id = auth.uid())
  with check (public.e_psicologo() and psicologo_id = auth.uid());

create policy anexos_psicologo_all on public.anexos_relatorio for all
  using (public.e_psicologo() and psicologo_id = auth.uid())
  with check (public.e_psicologo() and psicologo_id = auth.uid());

create policy templates_psicologo_all on public.templates_documento for all
  using (psicologo_id = auth.uid())
  with check (psicologo_id = auth.uid());

-- DOCUMENTOS (laudos/receitas): psicologo gerencia; paciente so ve o que
-- foi liberado explicitamente.
create policy documentos_psicologo_all on public.documentos for all
  using (public.e_psicologo() and psicologo_id = auth.uid())
  with check (public.e_psicologo() and psicologo_id = auth.uid());
create policy documentos_paciente_select on public.documentos for select
  using (paciente_id = auth.uid() and liberado_para_paciente);

-- LOGS_ACESSO: RLS ligado e zero politicas = ninguem le/escreve direto.
-- Escrita so pelo backend com service_role (que tem BYPASSRLS).

-- View do paciente: proprias consultas sem campos internos (observacao).
-- RLS continua valendo (security_invoker).
create view public.minhas_consultas with (security_invoker = true) as
select id, psicologo_id, data, horario, duracao_min, modalidade, status
from public.consultas
where paciente_id = auth.uid();

grant select on public.minhas_consultas to authenticated;

-- ---------------------------------------------------------------------
-- 12) STORAGE (buckets privados)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars',     'avatars',     false),
       ('anexos',      'anexos',      false),
       ('documentos',  'documentos',  false)
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

-- anexos de relatorio: psicologo/<uid>/...
create policy anexos_psicologo_all on storage.objects for all
  using (bucket_id = 'anexos' and public.e_psicologo()
         and auth.uid()::text = (storage.foldername(name))[2])
  with check (bucket_id = 'anexos' and public.e_psicologo()
         and auth.uid()::text = (storage.foldername(name))[2]);

-- documentos: psicologo gerencia; paciente baixa apenas o liberado
create policy documentos_psicologo_all on storage.objects for all
  using (bucket_id = 'documentos' and public.e_psicologo()
         and auth.uid()::text = (storage.foldername(name))[2])
  with check (bucket_id = 'documentos' and public.e_psicologo()
         and auth.uid()::text = (storage.foldername(name))[2]);
create policy documentos_paciente_read on storage.objects for select
  using (bucket_id = 'documentos' and exists (
    select 1 from public.documentos d
    where d.storage_path = storage.objects.name
      and d.paciente_id = auth.uid()
      and d.liberado_para_paciente
  ));

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
