-- Aplicado ao projeto PsicNota em 2026-09-28.
-- Operação única: reorganiza a agenda futura e reserva quartas às 10h
-- para a conta Mariana Lopes (identificada como Mário pela usuária).
-- Não executar novamente para ampliar o período: novas datas requerem outro script.
begin;
do $$
declare
  v_paciente uuid;
  v_psicologo uuid;
begin
  select id into strict v_paciente
  from public.perfis where nome_completo = 'Mariana Lopes' and papel = 'paciente';
  select distinct psicologo_id into strict v_psicologo
  from public.consultas where paciente_id = v_paciente limit 1;

  if exists (select 1 from public.consultas
             where psicologo_id = v_psicologo and paciente_id = v_paciente
               and observacao = 'Horário semanal fixo (quarta-feira às 10h).'
               and data >= date '2026-09-30') then
    raise exception 'Reorganização já aplicada; nenhum registro alterado.';
  end if;

  update public.consultas
     set status = 'cancelled', atualizado_em = now()
   where psicologo_id = v_psicologo and data >= date '2026-09-28'
     and status in ('scheduled', 'confirmed');

  update public.solicitacoes
     set status = 'rejected', revisado_em = now(),
         motivo_recusa = 'Agenda reorganizada para horário semanal fixo.'
   where psicologo_id = v_psicologo and data_desejada >= date '2026-09-28'
     and status = 'pending';

  insert into public.consultas
    (psicologo_id, paciente_id, data, horario, duracao_min, modalidade,
     status, observacao, origem)
  select v_psicologo, v_paciente, dia::date, time '10:00', 50, 'online',
         'confirmed', 'Horário semanal fixo (quarta-feira às 10h).', 'psychologist'
  from generate_series(date '2026-09-30', date '2028-09-27', interval '7 days') as dias(dia);
end $$;
commit;
