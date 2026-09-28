-- Aplicado ao projeto PsicNota em 2026-09-28, após a agenda futura
-- de quartas-feiras às 10h ter sido registrada.
-- Apaga consultas anteriores a 2026-09-28 e documentos a elas vinculados,
-- preservando quatro entradas semanais de demonstração em setembro.
begin;
do $$
declare
  v_paciente uuid;
  v_psicologo uuid;
begin
  select id into strict v_paciente
  from public.perfis where nome_completo = 'Mariana Lopes' and papel = 'paciente';
  select distinct psicologo_id into strict v_psicologo
  from public.consultas
  where paciente_id = v_paciente
    and observacao = 'Horário semanal fixo (quarta-feira às 10h).'
  limit 1;

  if exists (select 1 from public.consultas
             where paciente_id = v_paciente and data = date '2026-09-02'
               and horario = time '10:00'
               and observacao = 'Horário semanal fixo (quarta-feira às 10h).') then
    raise exception 'Histórico semanal já aplicado; nenhum registro alterado.';
  end if;

  delete from public.relatorios r using public.consultas c
  where r.consulta_id = c.id and c.psicologo_id = v_psicologo
    and c.data < date '2026-09-28';
  delete from public.consultas
  where psicologo_id = v_psicologo and data < date '2026-09-28';
  delete from public.solicitacoes
  where psicologo_id = v_psicologo and data_desejada < date '2026-09-28';

  insert into public.consultas
    (psicologo_id, paciente_id, data, horario, duracao_min, modalidade,
     status, observacao, origem)
  select v_psicologo, v_paciente, dia::date, time '10:00', 50, 'online',
         'completed', 'Horário semanal fixo (quarta-feira às 10h).', 'psychologist'
  from generate_series(date '2026-09-02', date '2026-09-23', interval '7 days') as dias(dia);
end $$;
commit;
