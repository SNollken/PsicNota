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
)
select
  solicitacao.psicologo_id,
  solicitacao.paciente_id,
  solicitacao.data_desejada,
  solicitacao.horario,
  solicitacao.duracao_min,
  solicitacao.modalidade,
  'confirmed',
  solicitacao.observacao,
  'patient_request',
  solicitacao.id
from public.solicitacoes as solicitacao
where solicitacao.status = 'approved'
  and not exists (
    select 1
    from public.consultas as consulta
    where consulta.solicitacao_id = solicitacao.id
  );
