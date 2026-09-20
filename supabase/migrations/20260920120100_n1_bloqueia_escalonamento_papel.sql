-- N1 — Bloqueia escalonamento de privilégio via perfis.papel
--
-- A policy perfis_update (do schema-base) é:
--   using (id = auth.uid()) with check (id = auth.uid())
-- Sem restrição de coluna, qualquer paciente pode executar:
--   update perfis set papel = 'psicologo' where id = auth.uid()
-- e virar psicólogo instantaneamente.
--
-- Defesa em duas camadas:
--
-- 1) REVOKE UPDATE na coluna 'papel' para authenticated e anon.
--    Isso bloqueia a nível de privilege — nem chega na policy.
--    service_role mantém o grant (Supabase dá superuser-like ao service_role,
--    então ele continua podendo alterar papel via API admin).
--
-- 2) Trigger BEFORE UPDATE como cinto-e-suspensórios: mesmo que um grant
--    futuro reintroduza o privilégio por engano, o trigger impede a mudança.
--    O trigger NÃO bloqueia o service_role do Supabase porque este roda
--    como superuser (ou owner das tabelas), que pode desabilitar triggers.
--    Para admin legítimo via SQL direto: SET session_replication_role = 'replica'
--    desabilita triggers, ou ALTER TABLE ... DISABLE TRIGGER antes do update.
--
-- Nota: REVOKE é a defesa primária. O trigger é redundância intencional.

-- Camada 1: revogar UPDATE na coluna papel
-- (o GRANT original do schema-base deu UPDATE em todas as colunas;
--  precisamos revogar só a coluna 'papel')
revoke update (papel) on public.perfis from authenticated, anon;

-- Camada 2: trigger que impede mudança de papel
-- Nota: se precisar de um admin-panel web que muda papel,
-- criar uma function SECURITY DEFINER com checagem de role em vez de remover o trigger.
create or replace function public.bloqueia_mudanca_papel()
returns trigger
language plpgsql
as $$
begin
  if OLD.papel is distinct from NEW.papel then
    raise exception 'Alteração do campo papel não é permitida'
      using hint = 'Use service_role ou desabilite o trigger para migrações administrativas.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_bloqueia_mudanca_papel on public.perfis;

create trigger trg_bloqueia_mudanca_papel
  before update on public.perfis
  for each row
  execute function public.bloqueia_mudanca_papel();
