begin;
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  p uuid := gen_random_uuid();
begin
  insert into auth.users (id,email,raw_user_meta_data) values
    (a,a::text || '@psicnota.test',jsonb_build_object('papel','psicologo')),
    (b,b::text || '@psicnota.test',jsonb_build_object('papel','psicologo'));
  perform set_config('qa.a',a::text,true);
  perform set_config('qa.b',b::text,true);
  perform set_config('qa.p',p::text,true);
  perform set_config('qa.original',(select codigo from public.codigos_psicologo where psicologo_id=a),true);
  perform set_config('qa.custom','QA-' || upper(substr(a::text,1,8)),true);
  insert into auth.users (id,email,raw_user_meta_data) values
    (p,p::text || '@psicnota.test',jsonb_build_object('papel','paciente','codigo_convite',current_setting('qa.original')));
end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('qa.a'),true);
do $$
begin
  if public.personalizar_codigo_psicologo(' ' || lower(current_setting('qa.custom')) || ' ') <> current_setting('qa.custom') then raise exception 'Normalização incorreta'; end if;
  if public.obter_codigo_psicologo() <> current_setting('qa.custom') then raise exception 'Código não persistido'; end if;
  if public.personalizar_codigo_psicologo(current_setting('qa.custom')) <> current_setting('qa.custom') then raise exception 'Salvar mesmo código falhou'; end if;
  if not exists(select 1 from public.vinculos_paciente where paciente_id=current_setting('qa.p')::uuid) then raise exception 'Vínculo antigo perdido'; end if;
  begin
    perform public.personalizar_codigo_psicologo('a b');
    raise exception 'Formato inválido aceito';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.personalizar_codigo_psicologo('PN-999999999');
    raise exception 'Código reservado aceito';
  exception when invalid_parameter_value then null; end;
  begin
    update public.codigos_psicologo set codigo='ALTERADO' where psicologo_id=current_setting('qa.a')::uuid;
    raise exception 'Cliente pode alterar tabela diretamente';
  exception when insufficient_privilege then null; end;
end;
$$;
select set_config('request.jwt.claim.sub',current_setting('qa.b'),true);
do $$
begin
  begin
    perform public.personalizar_codigo_psicologo(current_setting('qa.custom'));
    raise exception 'Código duplicado aceito';
  exception when unique_violation then null; end;
  if public.obter_codigo_psicologo() = current_setting('qa.custom') then raise exception 'Código de outra conta alterado'; end if;
end;
$$;
select set_config('request.jwt.claim.sub',current_setting('qa.p'),true);
do $$
begin
  begin
    perform public.personalizar_codigo_psicologo('PACIENTE');
    raise exception 'Paciente pode personalizar';
  exception when insufficient_privilege then null; end;
end;
$$;
set local role anon;
do $$
begin
  begin
    perform public.personalizar_codigo_psicologo('ANONIMO');
    raise exception 'Anônimo pode personalizar';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
do $$
declare
  novo uuid := gen_random_uuid();
begin
  begin
    insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),gen_random_uuid()::text || '@psicnota.test',jsonb_build_object('papel','paciente','codigo_convite',current_setting('qa.original')));
    raise exception 'Código anterior ainda aceita cadastro';
  exception when raise_exception then
    if sqlerrm <> 'Código do psicólogo inválido' then raise; end if;
  end;
  insert into auth.users(id,email,raw_user_meta_data) values(novo,novo::text || '@psicnota.test',jsonb_build_object('papel','paciente','codigo_convite',lower(current_setting('qa.custom'))));
  if not exists(select 1 from public.vinculos_paciente where paciente_id=novo and psicologo_id=current_setting('qa.a')::uuid) then raise exception 'Novo código vinculou errado'; end if;
end;
$$;
rollback;
