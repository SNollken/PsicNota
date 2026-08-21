# GOAL — PsicNota: replicar 100% do layout/conteúdo do design do amigo

**Entrega (1 linha):** As 4 telas principais (Agenda Psicólogo, Agenda Paciente, Editar Perfil Psicólogo, Editar Perfil Paciente) com layout, estrutura e conteúdo 100% fiéis ao design do amigo (`.design-v2/figma/*.png`), mantendo a funcionalidade JS intacta. Paleta fica pra DEPOIS (ordem explícita da Sofia).

**Tier:** HEAVY (sempre). Justificativa: multi-arquivo (HTML+CSS de 4 telas compartilhando base.css/agenda.css/perfil.css), requisito visual "100% fiel", verification gate obrigatório.

**Fonte de verdade do design:** `.design-v2/figma/` (PNGs exportados do Figma do amigo), servidos em `http://127.0.0.1:8901/`.
- `Agenda Psicologo.png` → `profissional/agenda.html`
- `Agenda Paciente.png` → `paciente/agenda-paciente.html`
- `Editar Perfil Psicologo.png` → `perfil.html` (role psicólogo)
- `Editar Perfil Paciente.png` → `perfil.html` (role paciente)
- Popups: `Agenda Paciente Pop Up.png`, `Agenda Psicologo Pop Up.png`, `Editar Perfil */popups.png`

**NÃO é fonte:** `.design-v2/code/PsicNota` (clone velho do nosso próprio repo em f883da9).

## Success criteria

1. **SC1 — Fidelidade estrutural:** cada uma das 4 telas tem as MESMAS seções, ordem, componentes, labels/copy e proporções do PNG do design. Observável: comparação visual side-by-side (browser_vision) com veredito por seção; 0 seções faltando/sobrando por tela. Evidência: transcrição da comparação no notepad.
2. **SC2 — Funcionalidade intacta:** login com conta teste cai na tela certa; calendário renderiza; modal de nova consulta abre; formulários do perfil editam/salvam; 0 erros no console nas 4 páginas. Observável: browser console + interação. Evidência: saída do browser_console.
3. **SC3 — Zero link quebrado:** todo href/src interno resolve. Observável: script de link-check exit 0.
4. **SC4 — Reviewer fresh aprova:** subagente revisor independente (sem contexto da implementação) compara screenshot vs design e aprova. Observável: veredito no resultado do delegate_task.
5. **SC5 — Entregue:** commit em main + push. Observável: hash no `git log` + output do push.

## WHEN TO STOP
4 telas estruturalmente idênticas ao design com interações funcionando, SC1-SC5 com evidência, cleanup (servidores) feito. Paleta NÃO é critério nesta rodada.

## Constraints
- Manter todos os IDs/atributos que o JS usa (shared-data.js, agenda.js, agenda-paciente.js, perfil.js).
- Não mexer em login/cadastro/landing/relatórios/pacientes/histórico/consulta nesta rodada (só as 4 telas pedidas).
- Não alterar paleta agora (a Sofia disse: layout primeiro, paleta depois).
- 1 commit atômico no final + push.
