-- Permite ao paciente cancelar apenas uma consulta futura da propria agenda.
create or replace function public.cancelar_consulta_paciente(p_consulta_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    return false;
  end if;

  update public.consultas as consulta
  set status = 'cancelled',
      atualizado_em = pg_catalog.now()
  where consulta.id = p_consulta_id
    and consulta.paciente_id = auth.uid()
    and consulta.status in ('scheduled', 'confirmed')
    and ((consulta.data + consulta.horario) at time zone 'America/Sao_Paulo') > pg_catalog.now();

  return found;
end;
$function$;

revoke all on function public.cancelar_consulta_paciente(uuid) from public, anon;
grant execute on function public.cancelar_consulta_paciente(uuid) to authenticated;