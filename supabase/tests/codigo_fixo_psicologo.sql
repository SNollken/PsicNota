begin;

do $$

declare

  psicologo_a uuid := gen_random_uuid();

  psicologo_b uuid := gen_random_uuid();

  paciente_a uuid := gen_random_uuid();

  paciente_b uuid := gen_random_uuid();

  codigo_a text;

  paciente_legado uuid := gen_random_uuid();

  codigo_legado text := upper(gen_random_uuid()::text);

begin

  insert into auth.users (id, email, raw_user_meta_data) values

    (psicologo_a, psicologo_a::text || '@psicnota.test', jsonb_build_object('papel','psicologo','nome_completo','QA Código A')),

    (psicologo_b, psicologo_b::text || '@psicnota.test', jsonb_build_object('papel','psicologo','nome_completo','QA Código B'));

  select codigo into codigo_a from public.codigos_psicologo where psicologo_id=psicologo_a;

  if codigo_a is null or codigo_a !~ '^PN-[0-9]+$' then raise exception 'Código não criado automaticamente'; end if;

  if codigo_a = (select codigo from public.codigos_psicologo where psicologo_id=psicologo_b) then raise exception 'Códigos repetidos'; end if;

  update public.codigos_psicologo set criado_em = '2000-01-01' where psicologo_id = psicologo_a;

  insert into auth.users (id,email,raw_user_meta_data) values

    (paciente_a,paciente_a::text || '@psicnota.test',jsonb_build_object('papel','paciente','nome_completo','QA Paciente A','codigo_convite',lower(codigo_a))),

    (paciente_b,paciente_b::text || '@psicnota.test',jsonb_build_object('papel','paciente','nome_completo','QA Paciente B','codigo_convite',codigo_a));

  if (select count(*) from public.vinculos_paciente where psicologo_id=psicologo_a) <> 2 then raise exception 'Código não reutilizável'; end if;

  insert into public.convites_paciente(codigo,psicologo_id) values(codigo_legado,psicologo_a);

  insert into auth.users(id,email,raw_user_meta_data) values(paciente_legado,paciente_legado::text || '@psicnota.test',jsonb_build_object('papel','paciente','codigo_convite',codigo_legado));

  if not exists(select 1 from public.vinculos_paciente where paciente_id=paciente_legado and psicologo_id=psicologo_a) then raise exception 'Convite legado perdeu vínculo'; end if;

  begin

    insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'invalid-code@psicnota.test',jsonb_build_object('papel','paciente','codigo_convite','INVALIDO'));

    raise exception 'Cadastro sem código foi aceito';

  exception when raise_exception then

    if sqlerrm <> 'Código do psicólogo inválido' then raise; end if;

  end;

  begin

    insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'invalid-role@psicnota.test',jsonb_build_object('papel','outro'));

    raise exception 'Papel inválido burlou código';

  exception when raise_exception then

    if sqlerrm <> 'Código do psicólogo inválido' then raise; end if;

  end;

  perform set_config('qa.psicologo_a',psicologo_a::text,true);

  perform set_config('qa.psicologo_b',psicologo_b::text,true);

  perform set_config('qa.paciente_a',paciente_a::text,true);

  perform set_config('qa.paciente_b',paciente_b::text,true);

  perform set_config('qa.codigo_a',codigo_a,true);

end;

$$;

set local role authenticated;

select set_config('request.jwt.claim.sub',current_setting('qa.psicologo_a'),true);

do $$

begin

  if public.obter_codigo_psicologo() <> current_setting('qa.codigo_a') or public.criar_convite_paciente() <> current_setting('qa.codigo_a') then raise exception 'Consulta alterou código'; end if;

  if (select count(*) from public.perfis where id in (current_setting('qa.paciente_a')::uuid,current_setting('qa.paciente_b')::uuid)) <> 2 then raise exception 'Psicólogo não vê pacientes vinculados'; end if;

  if (select count(*) from public.codigos_psicologo) <> 1 then raise exception 'Código de outro psicólogo exposto'; end if;

  begin

    update public.vinculos_paciente set psicologo_id=current_setting('qa.psicologo_b')::uuid where paciente_id=current_setting('qa.paciente_a')::uuid;

    raise exception 'Vínculo alterável pelo cliente';

  exception when insufficient_privilege then null;

  end;

end;

$$;

select set_config('request.jwt.claim.sub',current_setting('qa.psicologo_b'),true);

do $$

begin

  if exists(select 1 from public.perfis where id in (current_setting('qa.paciente_a')::uuid,current_setting('qa.paciente_b')::uuid)) then raise exception 'Pacientes expostos a outro psicólogo'; end if;

  if exists(select 1 from public.vinculos_paciente where psicologo_id=current_setting('qa.psicologo_a')::uuid) then raise exception 'Vínculo de outro psicólogo exposto'; end if;

end;

$$;

select set_config('request.jwt.claim.sub',current_setting('qa.paciente_a'),true);

do $$

begin

  if exists(select 1 from public.codigos_psicologo) then raise exception 'Paciente vê códigos profissionais'; end if;

  begin

    perform public.obter_codigo_psicologo();

    raise exception 'Paciente consultou código por RPC';

  exception when raise_exception then

    if sqlerrm <> 'Apenas psicólogos podem consultar seu código' then raise; end if;

  end;

end;

$$;

set local role anon;

do $$

begin

  begin

    perform public.obter_codigo_psicologo();

    raise exception 'RPC acessível sem autenticação';

  exception when insufficient_privilege then null;

  end;

  begin

    perform 1 from public.codigos_psicologo;

    raise exception 'Tabela acessível sem autenticação';

  exception when insufficient_privilege then null;

  end;

end;

$$;

reset role;

rollback;

