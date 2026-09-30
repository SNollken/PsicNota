create or replace function public.exigir_convite_paciente()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  codigo_informado text;
  psicologo_vinculado uuid;
begin
  if exists (select 1 from public.perfis where id = new.id and papel = 'paciente') then
    codigo_informado := upper(trim(coalesce(new.raw_user_meta_data ->> 'codigo_convite', '')));
    select psicologo_id into psicologo_vinculado
      from public.codigos_psicologo where codigo = codigo_informado;
    if psicologo_vinculado is null then
      update public.convites_paciente
         set paciente_id = new.id
       where codigo = codigo_informado and paciente_id is null and expira_em > now()
       returning psicologo_id into psicologo_vinculado;
    end if;
    if psicologo_vinculado is null then
      raise exception 'Código do psicólogo inválido';
    end if;
    insert into public.vinculos_paciente (paciente_id, psicologo_id)
    values (new.id, psicologo_vinculado);
  end if;
  return new;
end;
$$;
revoke all on function public.exigir_convite_paciente() from public, anon, authenticated;

create or replace function public.criar_convite_paciente()
returns text language sql security definer set search_path = ''
as $$ select public.obter_codigo_psicologo(); $$;
revoke all on function public.criar_convite_paciente() from public, anon;
grant execute on function public.criar_convite_paciente() to authenticated;

create policy perfis_select_codigo_vinculado on public.perfis
for select to authenticated using (
  papel = 'paciente' and (select private.e_psicologo()) and exists (
    select 1 from public.vinculos_paciente v
    where v.psicologo_id = (select auth.uid()) and v.paciente_id = perfis.id
  )
);

create policy avatars_read_codigo_vinculado on storage.objects
for select to authenticated using (
  bucket_id = 'avatars' and (select private.e_psicologo()) and exists (
    select 1 from public.vinculos_paciente v
    where v.psicologo_id = (select auth.uid())
      and v.paciente_id::text = (storage.foldername(name))[1]
  )
);
