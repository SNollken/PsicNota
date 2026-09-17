-- =====================================================================
-- PSICNOTA — SEED DE DESENVOLVIMENTO (DEV APENAS, NUNCA em produção)
--
-- 1 psicóloga + 2 pacientes, tudo preenchido:
--   * perfis completos (psicóloga + pacientes)
--   * dados profissionais + disponibilidades da psicóloga
--   * cada paciente: 1 consulta realizada, 1 consulta confirmada e
--     1 solicitação pendente (o "pendente" do app: o paciente escolhe o
--     slot e a psicóloga aprova/recusa na agenda)
--   * psicóloga: 1 nota rápida e 1 relatório final por paciente
--
-- Projeto alvo: gjfqslgoplpqeqewytdn (o mesmo de assets/js/supabase-client.js)
-- Pré-requisitos:
--   1) schema-base aplicado (schema-proposto.sql do histórico)
--   2) supabase/migrations/20260916000001_recria_helpers_de_papel_publico.sql
--   3) supabase/migrations/20260916100000_recria_tabela_relatorios.sql
-- Como rodar: Supabase Dashboard > SQL Editor > colar tudo > Run.
-- Idempotente: pode rodar de novo que os dados são re-sincronizados.
-- As contas de auth.users (criadas pelo app) não são tocadas; os UUIDs
-- são resolvidos por e-mail.
--
-- LOGIN (a tela de login monta o e-mail com @psicnota.test):
--   usuário: psicologo   senha: 123
--   usuário: paciente    senha: 123
--   usuário: paciente2   senha: 123
-- =====================================================================

begin;

do $$
declare
  psi  uuid := (select id from auth.users where email = 'psicologo@psicnota.test');
  pac1 uuid := (select id from auth.users where email = 'paciente@psicnota.test');
  pac2 uuid := (select id from auth.users where email = 'paciente2@psicnota.test');
begin
  if psi is null or pac1 is null or pac2 is null then
    raise exception 'Contas de auth.users não encontradas. Crie os logins psicologo@/paciente@/paciente2@psicnota.test antes de rodar esta seed.';
  end if;

  -- -----------------------------------------------------------------
  -- 1) PERFIS COMPLETOS
  -- -----------------------------------------------------------------
  update public.perfis set
    nome_completo            = 'Helena Vasconcelos',
    pronomes                 = 'ela/dela',
    genero                   = 'feminino',
    cidade                   = 'Brasília',
    estado                   = 'DF',
    formato_preferido        = 'ambos',
    periodo_preferido        = 'manhã',
    lembretes_consulta       = true,
    notificacoes_email       = true,
    data_nascimento          = date '1985-03-12',
    telefone                 = '(61) 99999-0001',
    lgpd_consentimento_versao = '1.0',
    atualizado_em            = now()
  where id = psi;

  update public.perfis set
    nome_completo            = 'Mariana Lopes',
    pronomes                 = 'ela/dela',
    genero                   = 'feminino',
    cidade                   = 'Brasília',
    estado                   = 'DF',
    formato_preferido        = 'online',
    periodo_preferido        = 'manhã',
    lembretes_consulta       = true,
    notificacoes_email       = true,
    data_nascimento          = date '1998-07-24',
    telefone                 = '(61) 99999-0002',
    lgpd_consentimento_versao = '1.0',
    atualizado_em            = now()
  where id = pac1;

  update public.perfis set
    nome_completo            = 'Carlos Eduardo Menezes',
    pronomes                 = 'ele/dele',
    genero                   = 'masculino',
    cidade                   = 'Brasília',
    estado                   = 'DF',
    formato_preferido        = 'presencial',
    periodo_preferido        = 'tarde',
    lembretes_consulta       = true,
    notificacoes_email       = false,
    data_nascimento          = date '1991-11-05',
    telefone                 = '(61) 99999-0003',
    lgpd_consentimento_versao = '1.0',
    atualizado_em            = now()
  where id = pac2;

  -- -----------------------------------------------------------------
  -- 2) DADOS PROFISSIONAIS DA PSICÓLOGA (CRP fictício)
  -- -----------------------------------------------------------------
  insert into public.dados_psicologo
    (perfil_id, crp_numero, crp_uf, especialidade, formato_atendimento,
     sobre_mim, abordagem_terapeutica, publico_atendido, areas_atuacao)
  values
    (psi, '01/12345', 'DF',
     'Terapia Cognitivo-Comportamental', 'ambos',
     'Psicóloga clínica com 12 anos de experiência no atendimento de adolescentes e adultos. Trabalho com foco em ansiedade, depressão e autoestima, em um espaço de acolhimento e escuta sem julgamentos.',
     'Terapia Cognitivo-Comportamental (TCC)',
     'Adolescentes e adultos',
     array['Ansiedade','Depressão','Autoestima','Burnout','Estresse'])
  on conflict (perfil_id) do update set
    crp_numero             = excluded.crp_numero,
    crp_uf                 = excluded.crp_uf,
    especialidade          = excluded.especialidade,
    formato_atendimento    = excluded.formato_atendimento,
    sobre_mim              = excluded.sobre_mim,
    abordagem_terapeutica  = excluded.abordagem_terapeutica,
    publico_atendido       = excluded.publico_atendido,
    areas_atuacao          = excluded.areas_atuacao;

  -- -----------------------------------------------------------------
  -- 3) DISPONIBILIDADES SEMANAIS (0 = domingo)
  --    seg: 09h 10h 14h 15h | ter: 09h 10h | qua: 09h 10h 11h 14h
  --    sex: 09h 10h 14h
  -- -----------------------------------------------------------------
  delete from public.disponibilidades where psicologo_id = psi;

  insert into public.disponibilidades (psicologo_id, dia_semana, horario)
  select psi, d.dia::smallint, d.horario::time
  from (values
    (1, '09:00'), (1, '10:00'), (1, '14:00'), (1, '15:00'),
    (2, '09:00'), (2, '10:00'),
    (3, '09:00'), (3, '10:00'), (3, '11:00'), (3, '14:00'),
    (5, '09:00'), (5, '10:00'), (5, '14:00')
  ) as d(dia, horario)
  on conflict (psicologo_id, dia_semana, horario) do nothing;

  -- -----------------------------------------------------------------
  -- 4) SOLICITAÇÕES PENDENTES (uma por paciente; a psicóloga
  --    aprova/recusa na agenda — é o "pendente" do app)
  -- -----------------------------------------------------------------
  insert into public.solicitacoes
    (id, psicologo_id, paciente_id, data_desejada, horario, duracao_min,
     modalidade, observacao, status, solicitado_em, revisado_em, motivo_recusa)
  values
    ('a2222222-2222-4222-8222-222222222222', psi, pac1,
     '2026-09-25', '10:00', 50, 'online',
     'O horário das 10h da sexta encaixa melhor na minha rotina de trabalho.',
     'pending', '2026-09-15T19:40:00-03:00', null, null),
    ('a3333333-3333-4333-8333-333333333333', psi, pac2,
     '2026-09-28', '15:00', 50, 'presencial',
     'Tenho folga na segunda à tarde; fica mais fácil comparecer presencialmente.',
     'pending', '2026-09-15T20:05:00-03:00', null, null)
  on conflict (id) do update set
    psicologo_id  = excluded.psicologo_id,
    paciente_id   = excluded.paciente_id,
    data_desejada = excluded.data_desejada,
    horario       = excluded.horario,
    duracao_min   = excluded.duracao_min,
    modalidade    = excluded.modalidade,
    observacao    = excluded.observacao,
    status        = excluded.status,
    solicitado_em = excluded.solicitado_em,
    revisado_em   = excluded.revisado_em,
    motivo_recusa = excluded.motivo_recusa;

  -- -----------------------------------------------------------------
  -- 5) CONSULTAS: 1 realizada + 1 confirmada por paciente (datas
  --    respeitam as disponibilidades; slots únicos por psicóloga)
  -- -----------------------------------------------------------------
  insert into public.consultas
    (id, psicologo_id, paciente_id, data, horario, duracao_min, modalidade,
     status, observacao, origem, solicitacao_id)
  values
    -- Mariana: realizada
    ('c1111111-1111-4111-8111-111111111111', psi, pac1,
     '2026-09-01', '09:00', 50, 'online', 'completed',
     'Sessão semanal de acompanhamento.', 'psychologist', null),
    -- Mariana: confirmada
    ('c2222222-2222-4222-8222-222222222222', psi, pac1,
     '2026-09-22', '09:00', 50, 'online', 'confirmed',
     'Sessão semanal de acompanhamento.', 'psychologist', null),
    -- Carlos: realizada
    ('c3333333-3333-4333-8333-333333333333', psi, pac2,
     '2026-09-02', '14:00', 50, 'presencial', 'completed',
     'Retorno após pausa; avaliar frequência do atendimento.', 'psychologist', null),
    -- Carlos: confirmada
    ('c4444444-4444-4444-8444-444444444444', psi, pac2,
     '2026-09-23', '10:00', 50, 'presencial', 'confirmed',
     'Retorno após pausa; avaliar frequência do atendimento.', 'psychologist', null)
  on conflict (id) do update set
    psicologo_id = excluded.psicologo_id,
    paciente_id  = excluded.paciente_id,
    data         = excluded.data,
    horario      = excluded.horario,
    duracao_min  = excluded.duracao_min,
    modalidade   = excluded.modalidade,
    status       = excluded.status,
    observacao   = excluded.observacao,
    origem       = excluded.origem;

  -- -----------------------------------------------------------------
  -- 6) NOTAS RÁPIDAS (uma por paciente, na consulta realizada; só
  --    a psicóloga vê — LGPD)
  -- -----------------------------------------------------------------
  insert into public.notas (consulta_id, psicologo_id, conteudo, humor)
  values
    ('c1111111-1111-4111-8111-111111111111', psi,
     'Paciente chegou pontual. Relatou semana difícil no trabalho, com episódios de ansiedade antecipatória antes das reuniões. Trabalhamos técnicas de respiração diafragmática e reestruturação cognitiva dos pensamentos catastróficos. Demonstrou boa adesão aos exercícios propostos na sessão anterior.',
     'bem'),
    ('c3333333-3333-4333-8333-333333333333', psi,
     'Primeira sessão após a pausa. Paciente relatou esgotamento no trabalho e conflitos familiares recentes. Acolhi a demanda e iniciamos o mapeamento de gatilhos de estresse. Demonstra abertura ao processo terapêutico, embora ainda resista a falar sobre as próprias emoções.',
     'neutro')
  on conflict (consulta_id) do update set
    conteudo = excluded.conteudo,
    humor    = excluded.humor;

  -- -----------------------------------------------------------------
  -- 7) RELATÓRIOS (um final por paciente, vinculado à consulta
  --    realizada; só a psicóloga vê — LGPD)
  -- -----------------------------------------------------------------
  insert into public.relatorios
    (id, psicologo_id, paciente_id, consulta_id, humor, status,
     bloco_queixa, bloco_intervencao, bloco_evolucao, bloco_encaminhamentos,
     texto_livre, atualizado_em)
  values
    ('d1111111-1111-4111-8111-111111111111', psi, pac1,
     'c1111111-1111-4111-8111-111111111111', 'bem', 'final',
     'Ansiedade antecipatória antes de reuniões de trabalho, com pensamentos catastróficos sobre o próprio desempenho.',
     'Psicoeducação sobre o ciclo da ansiedade, respiração diafragmática e reestruturação cognitiva dos pensamentos catastróficos; registro de pensamentos disfuncionais como tarefa.',
     'Boa adesão às tarefas e melhora parcial na regulação da ansiedade; ainda há dificuldade para dormir em dias de maior pressão.',
     'Manter higiene do sono e o registro diário de pensamentos; revisar os exercícios na próxima sessão.',
     'Sessão produtiva; paciente demonstrou confiança no plano estabelecido.', now()),
    ('d2222222-2222-4222-8222-222222222222', psi, pac2,
     'c3333333-3333-4333-8333-333333333333', 'neutro', 'final',
     'Esgotamento relacionado ao trabalho e conflitos familiares recentes.',
     'Acolhimento da demanda, mapeamento de gatilhos de estresse e introdução de registros de situação, emoção e comportamento.',
     'Abertura ao processo terapêutico em construção; resistência inicial a falar sobre emoções, com leve melhora ao final da sessão.',
     'Manter os registros de estresse por uma semana e trazer exemplos concretos para a próxima sessão.',
     'Paciente assíduo; vale monitorar a frequência do atendimento para sustentar o vínculo.', now())
  on conflict (id) do update set
    psicologo_id          = excluded.psicologo_id,
    paciente_id           = excluded.paciente_id,
    consulta_id           = excluded.consulta_id,
    humor                 = excluded.humor,
    status                = excluded.status,
    bloco_queixa          = excluded.bloco_queixa,
    bloco_intervencao     = excluded.bloco_intervencao,
    bloco_evolucao        = excluded.bloco_evolucao,
    bloco_encaminhamentos = excluded.bloco_encaminhamentos,
    texto_livre           = excluded.texto_livre,
    atualizado_em         = now();
end $$;

commit;

-- ---------------------------------------------------------------------
-- REMOVER A SEED (opcional; descomente para limpar os dados clínicos
-- criados por ela — perfis e auth.users são preservados)
-- ---------------------------------------------------------------------
-- begin;
-- delete from public.relatorios      where psicologo_id in (select id from auth.users where email like '%@psicnota.test');
-- delete from public.notas            where psicologo_id in (select id from auth.users where email like '%@psicnota.test');
-- delete from public.consultas        where psicologo_id in (select id from auth.users where email like '%@psicnota.test');
-- delete from public.solicitacoes     where psicologo_id in (select id from auth.users where email like '%@psicnota.test');
-- delete from public.disponibilidades where psicologo_id in (select id from auth.users where email like '%@psicnota.test');
-- commit;
