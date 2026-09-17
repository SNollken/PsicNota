-- Aprova uma solicitacao e cria a consulta confirmada na mesma transacao.
-- O lock por horario impede duas aprovacoes concorrentes para o mesmo psicologo.

create or replace function public.aprovar_solicitacao(solicitacao_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  pedido public.solicitacoes;
  consulta_id uuid;
begin
  if not private.e_psicologo() then
    raise exception 'Apenas o psicologo responsavel pode aprovar solicitacoes';
  end if;

  select *
  into pedido
  from public.solicitacoes
  where id = solicitacao_id
    and psicologo_id = auth.uid()
  for update;

  if not found or pedido.status <> 'pending' then
    raise exception 'Solicitacao indisponivel para aprovacao';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      pedido.psicologo_id::text || pedido.data_desejada::text || pedido.horario::text,
      0
    )
  );

  if exists (
    select 1
    from public.consultas
    where psicologo_id = pedido.psicologo_id
      and data = pedido.data_desejada
      and horario = pedido.horario
      and status in ('scheduled', 'confirmed')
  ) then
    raise exception 'Horario ja possui consulta confirmada' using errcode = '23505';
  end if;

  update public.solicitacoes
  set status = 'approved',
      revisado_em = now()
  where id = pedido.id;

  update public.solicitacoes
  set status = 'rejected',
      revisado_em = now(),
      motivo_recusa = 'Horario preenchido por uma solicitacao anterior.'
  where psicologo_id = pedido.psicologo_id
    and data_desejada = pedido.data_desejada
    and horario = pedido.horario
    and status = 'pending'
    and id <> pedido.id;

  insert into public.consultas (
    psicologo_id,
    paciente_id,
    data,
    horario,
    duracao_min,
    modalidade,
    status,
    observacao,
    origem,
    solicitacao_id
  ) values (
    pedido.psicologo_id,
    pedido.paciente_id,
    pedido.data_desejada,
    pedido.horario,
    pedido.duracao_min,
    pedido.modalidade,
    'confirmed',
    pedido.observacao,
    'patient_request',
    pedido.id
  ) returning id into consulta_id;

  return consulta_id;
end;
$$;

revoke all on function public.aprovar_solicitacao(uuid) from public, anon;
grant execute on function public.aprovar_solicitacao(uuid) to authenticated;
