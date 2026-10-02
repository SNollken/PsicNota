-- Suporte a OAuth Google no PsicNota
-- 1. Se papel for nulo (login/cadastro inicial via Google), não cria perfil parcial prematuro
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  p_papel text := new.raw_user_meta_data->>'papel';
begin
  -- ponytail: se veio de OAuth sem papel definido, o cadastro sera concluido via concluir_cadastro_oauth
  if p_papel is null then
    return new;
  end if;

  insert into public.perfis (id, papel, nome_completo, data_nascimento, telefone, email)
  values (
    new.id,
    case when p_papel = 'psicologo' then 'psicologo' else 'paciente' end,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nome_completo'), ''), 'Usuário'),
    case
      when nullif(new.raw_user_meta_data->>'data_nascimento', '') is null then null
      when new.raw_user_meta_data->>'data_nascimento' ~ '^\d{2}/\d{2}/\d{4}$'
        then to_date(new.raw_user_meta_data->>'data_nascimento', 'DD/MM/YYYY')
      else (new.raw_user_meta_data->>'data_nascimento')::date
    end,
    nullif(new.raw_user_meta_data->>'telefone', ''),
    new.email
  );

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

-- 2. RPC para concluir o cadastro de usuários autenticados via OAuth
create or replace function public.concluir_cadastro_oauth(
  p_papel text,
  p_nome_completo text,
  p_data_nascimento date,
  p_telefone text default null,
  p_codigo_convite text default null,
  p_crp_numero text default null,
  p_crp_uf text default null,
  p_especialidade text default null,
  p_formato_atendimento text default 'ambos'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_psicologo_id uuid;
  v_codigo_limpo text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if exists (select 1 from public.perfis where id = v_uid) then
    raise exception 'Perfil já cadastrado';
  end if;

  if p_papel not in ('psicologo', 'paciente') then
    raise exception 'Papel inválido';
  end if;

  select email into v_email from auth.users where id = v_uid;

  if p_papel = 'paciente' then
    v_codigo_limpo := upper(trim(coalesce(p_codigo_convite, '')));
    if v_codigo_limpo = '' then
      raise exception 'Código do psicólogo inválido';
    end if;

    select psicologo_id into v_psicologo_id
      from public.codigos_psicologo where codigo = v_codigo_limpo;

    if v_psicologo_id is null then
      update public.convites_paciente
         set paciente_id = v_uid
       where codigo = v_codigo_limpo and paciente_id is null and expira_em > now()
       returning psicologo_id into v_psicologo_id;
    end if;

    if v_psicologo_id is null then
      raise exception 'Código do psicólogo inválido';
    end if;

    insert into public.perfis (id, papel, nome_completo, data_nascimento, telefone, email)
    values (v_uid, 'paciente', trim(p_nome_completo), p_data_nascimento, nullif(trim(p_telefone), ''), v_email);

    insert into public.vinculos_paciente (paciente_id, psicologo_id)
    values (v_uid, v_psicologo_id);

  elsif p_papel = 'psicologo' then
    if nullif(trim(p_crp_numero), '') is null or nullif(trim(p_crp_uf), '') is null then
      raise exception 'Dados de CRP obrigatórios';
    end if;

    insert into public.perfis (id, papel, nome_completo, data_nascimento, telefone, email)
    values (v_uid, 'psicologo', trim(p_nome_completo), p_data_nascimento, nullif(trim(p_telefone), ''), v_email);

    insert into public.dados_psicologo (perfil_id, crp_numero, crp_uf, especialidade, formato_atendimento)
    values (
      v_uid,
      trim(p_crp_numero),
      upper(trim(p_crp_uf)),
      nullif(trim(p_especialidade), ''),
      coalesce(nullif(trim(p_formato_atendimento), ''), 'ambos')
    );
  end if;

  return jsonb_build_object('ok', true, 'papel', p_papel);
end;
$$;

revoke all on function public.concluir_cadastro_oauth from public, anon;
grant execute on function public.concluir_cadastro_oauth to authenticated;
