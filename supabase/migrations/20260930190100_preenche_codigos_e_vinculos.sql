insert into public.codigos_psicologo (psicologo_id)
select id from public.perfis where papel = 'psicologo'
on conflict (psicologo_id) do nothing;

insert into public.vinculos_paciente (paciente_id, psicologo_id)
select convite.paciente_id, convite.psicologo_id
from public.convites_paciente convite
join public.perfis paciente on paciente.id = convite.paciente_id and paciente.papel = 'paciente'
join public.perfis psicologo on psicologo.id = convite.psicologo_id and psicologo.papel = 'psicologo'
where convite.paciente_id is not null
on conflict (paciente_id) do nothing;
