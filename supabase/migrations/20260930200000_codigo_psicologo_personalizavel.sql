-- Mantém os códigos distribuídos e libera sua alteração apenas por RPC do dono.
alter table public.codigos_psicologo alter column codigo drop expression;
alter table public.codigos_psicologo alter column codigo set not null;
alter table public.codigos_psicologo add constraint codigo_psicologo_formato
  check (codigo ~ '^[A-Z0-9][A-Z0-9-]{2,23}$');

create function public.preencher_codigo_psicologo()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.codigo is null then new.codigo := 'PN-' || new.numero::text; end if;
  return new;
end;
$$;
revoke all on function public.preencher_codigo_psicologo() from public, anon, authenticated;
create trigger preencher_codigo_psicologo before insert on public.codigos_psicologo
for each row execute function public.preencher_codigo_psicologo();

create function public.personalizar_codigo_psicologo(novo_codigo text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  codigo_normalizado text := upper(trim(coalesce(novo_codigo, '')));
  codigo_atual text;
begin
  if not exists (select 1 from public.perfis where id = auth.uid() and papel = 'psicologo') then
    raise exception using errcode = '42501', message = 'Apenas psicólogos podem alterar seu código';
  end if;
  if codigo_normalizado !~ '^[A-Z0-9][A-Z0-9-]{2,23}$' then
    raise exception using errcode = '22023', message = 'Use de 3 a 24 letras, números ou hífens, começando com letra ou número';
  end if;
  select codigo into codigo_atual from public.codigos_psicologo
    where psicologo_id = auth.uid() for update;
  if codigo_atual is null then
    raise exception 'Código profissional indisponível';
  end if;
  if codigo_normalizado = codigo_atual then return codigo_atual; end if;
  -- PN-N pertence à sequência automática; impede colisões com contas futuras.
  if codigo_normalizado ~ '^PN-[0-9]+$' then
    raise exception using errcode = '22023', message = 'Escolha um código diferente do formato reservado PN seguido de números';
  end if;
  update public.codigos_psicologo set codigo = codigo_normalizado
    where psicologo_id = auth.uid();
  return codigo_normalizado;
end;
$$;
revoke all on function public.personalizar_codigo_psicologo(text) from public, anon;
grant execute on function public.personalizar_codigo_psicologo(text) to authenticated;
