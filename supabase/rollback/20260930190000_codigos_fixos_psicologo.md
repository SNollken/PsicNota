# Reversão dos códigos fixos

Reverter por uma nova migração para frente, sem apagar tabelas ou vínculos.
1. Restaurar as funções criar_convite_paciente e exigir_convite_paciente da migração 20260930160000.
2. Remover apenas as policies perfis_select_codigo_vinculado e avatars_read_codigo_vinculado e o trigger atribuir_codigo_psicologo.
3. Restaurar a interface de convites temporários do commit anterior à alteração.
4. Manter codigos_psicologo e vinculos_paciente para preservar os dados e permitir retomar a implementação.

O preenchimento dos códigos e dos vínculos é aditivo e não será apagado na reversão. Os códigos fixos já distribuídos deixam de ser aceitos após restaurar a função antiga; por isso, prefira corrigir a implementação com uma nova migração.
