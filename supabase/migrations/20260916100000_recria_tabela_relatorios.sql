-- Recria a tabela public.relatorios, removida do MVP em 2847ddd a pedido
-- do escopo, mas necessaria para os dados de demonstracao.
-- Estrutura identica a do historico (git show 2847ddd~1:docs/schema-proposto.sql).
-- Diferenca proposta: a RLS nao depende de public.e_psicologo()/private.e_psicologo()
-- (helpers em movimento por migrations paralelas) -- a checagem de papel e inline.

create table if not exists public.relatorios (
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
  status                text not null default 'rascunho' check (status in ('rascunho','final')),
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);

create index if not exists relatorios_psicologo_idx on public.relatorios (psicologo_id, atualizado_em desc);
create index if not exists relatorios_paciente_idx  on public.relatorios (paciente_id);
create index if not exists relatorios_consulta_idx  on public.relatorios (consulta_id);

drop trigger if exists trg_relatorios_updated on public.relatorios;
create trigger trg_relatorios_updated
  before update on public.relatorios
  for each row execute function public.set_updated_at();

alter table public.relatorios enable row level security;

drop policy if exists relatorios_psicologo_all on public.relatorios;
create policy relatorios_psicologo_all on public.relatorios
  to authenticated
  for all
  using (
    psicologo_id = auth.uid()
    and exists (
      select 1 from public.perfis p
      where p.id = auth.uid() and p.papel = 'psicologo'
    )
  )
  with check (
    psicologo_id = auth.uid()
    and exists (
      select 1 from public.perfis p
      where p.id = auth.uid() and p.papel = 'psicologo'
    )
  );

grant select, insert, update, delete on public.relatorios to authenticated;
