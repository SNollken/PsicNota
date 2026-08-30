# Plano: CSS por página (PsicNota) — VERSÃO 2

Status: APROVADO pela Sofia (autorização total, TASK 8). Substitui a versão 1
(plano de núcleo compartilhado, nunca executado). Execução pelo Wrench em 27/08/2026.

## Regra central (decisão da Sofia)

1 HTML = 1 CSS próprio. O nome do CSS é IDÊNTICO ao do HTML, só com `.css` no
final. `assets/css/base.css` DEIXA DE EXISTIR. Duplicação entre os CSS é
aceitável; compartilhamento não.

## Estrutura final

A estrutura dentro de `assets/css/` espelha a estrutura dos HTMLs (resolve a
colisão de nomes: existe home.html na raiz, em paciente/ e em psicologo/).

```
assets/css/
  index.css                 NOVO  (index.html, redirect — só estiliza o fallback)
  login.css                 NOVO  (vem do auth.css, sem a seção Home/landing)
  home.css                  NOVO  (cópia do auth.css, inclui .home-actions/.secondary-button)
  cadastro.css              MANTIDO (já era auto-contido, já tinha nome/lugar certo)
  esqueci-senha.css         NOVO  (extraído do <style> inline do HTML)
  perfil.css                MANTIDO (já era auto-contido, já tinha nome/lugar certo)
  paciente/
    home.css                NOVO  (placeholder "em construção")
    laudos.css              NOVO  (placeholder)
    psicologo.css           NOVO  (placeholder)
    agenda-paciente.css     MOVIDO+MESCLADO (agenda-psicologo.css + menu.css + blocos do
                            ex-base.css + conteúdo original, nesta ordem de cascata)
  psicologo/
    home.css                NOVO  (placeholder)
    consulta.css            NOVO  (placeholder)
    historico.css           NOVO  (placeholder)
    pacientes.css           NOVO  (placeholder)
    relatorio-view.css      NOVO  (placeholder)
    agenda-psicologo.css              MOVIDO+MESCLADO (agenda-psicologo.css + menu.css + blocos do
                            ex-base.css usados pela página, nesta ordem de cascata)
    relatorios.css          MOVIDO+MESCLADO (menu.css + blocos do ex-base.css
                            + conteúdo original do relatorios.css)

EXCLUÍDOS: assets/css/base.css, assets/css/auth.css, assets/css/agenda-psicologo.css,
assets/css/agenda-paciente.css (raiz), assets/css/relatorios.css (raiz).
```

Login/cadastro/esqueci-senha ainda estão na raiz do site, então ficam na raiz
do assets/css/ também (a pasta auth/ é tarefa do Scout depois).

## Estratégia das mesclagens (preservar o rendering atual)

As 3 páginas que linkavam vários CSS tinham cascata real nesta ordem:

- psicologo/agenda-psicologo.html: agenda-psicologo.css → menu.css (via @import do base) → base.css
- paciente/agenda-paciente.html: agenda-psicologo.css → menu.css → base.css → agenda-paciente.css
- psicologo/relatorios.html: menu.css → base.css → relatorios.css

Os CSS únicos novos concatenam exatamente esses conteúdos nessa ordem, para o
resultado visual não mudar. Do ex-base.css entram só os blocos que a página usa:

- CORE: :root, reset, .app-shell/.main-content/.mobile-menu, topbar/.eyebrow/h1/
  .account-chip, .summary-*, .panel/.section/.card-heading, .fields-grid/.field/
  input/select/textarea, .button*/.form-actions, .mini-*, .notice-*, .two-columns,
  .badge*/.save-status
- agenda do psicólogo: CORE + .toast + media queries globais
- agenda do paciente: CORE + .toast + .patient-view + media queries globais
- relatórios: CORE + seção RELATÓRIOS (.report-list/.report-card, .mood-*,
  .attach-*, .report-document/.report-block* — o relatorios.js injeta essas
  classes dinamicamente) + .toast + media queries globais

Blocos do ex-base.css que NENHUMA página real usa (.doc-*, .patient-search/
.patient-card, .timeline-*, .note-area/.info-*, @media print) saem de
circulação junto com o base.css. Ficam preservados no histórico do git.

## Correções incluídas

1. BUG dos placeholders: os estilos `.construction-wrap`/`.construction-box`
   existiam inline em <style> nos 8 HTMLs placeholder (o diagnóstico da v1 dizia
   que não existiam em lugar nenhum; na prática existiam inline). Agora moram no
   CSS próprio de cada placeholder e os <style> inline foram removidos.
2. esqueci-senha.html: <style> inline extraído para esqueci-senha.css.
3. Código morto da v1 (.landing-*, .home-grid, .data-table): verificado que já
   NÃO existiam mais no base.css (foram removidos antes). Nada a propagar.
4. Cabeçalhos de comentário que citavam o base.css foram atualizados nos
   arquivos mesclados e no próprio menu.css.

## Páginas e seus CSS (17 páginas)

| HTML | CSS próprio |
|---|---|
| index.html | assets/css/index.css |
| login.html | assets/css/login.css |
| home.html | assets/css/home.css |
| cadastro.html | assets/css/cadastro.css |
| esqueci-senha.html | assets/css/esqueci-senha.css |
| perfil.html | assets/css/perfil.css (+ link do menu.css) |
| paciente/home.html | assets/css/paciente/home.css |
| paciente/laudos.html | assets/css/paciente/laudos.css |
| paciente/psicologo.html | assets/css/paciente/psicologo.css |
| paciente/agenda-paciente.html | assets/css/paciente/agenda-paciente.css |
| psicologo/home.html | assets/css/psicologo/home.css |
| psicologo/consulta.html | assets/css/psicologo/consulta.css |
| psicologo/historico.html | assets/css/psicologo/historico.css |
| psicologo/pacientes.html | assets/css/paciente… psicologo/pacientes.css |
| psicologo/agenda-psicologo.html | assets/css/psicologo/agenda-psicologo.css |
| psicologo/relatorios.html | assets/css/psicologo/relatorios.css |
| psicologo/relatorio-view.html | assets/css/psicologo/relatorio-view.css |

Os 8 placeholders e o esqueci-senha usam `@import "../../menu/menu.css"` (ou
link direto, no perfil) porque usam o componente `<psic-menu>`/sidebar do
menu.css.

## Verificação executada

- Script de resolução de <link>: todos os hrefs de stylesheet resolvem para
  arquivo existente, página por página.
- Nenhum HTML/JS/CSS restante referencia base.css ou auth.css.
- Nenhum <style> inline restante nos placeholders/esqueci-senha.
- Servidor HTTP local: todas as páginas e CSS respondem 200 (sem 404).
- Inspeção visual das páginas principais no navegador.

## Fora do escopo (outras tasks)

- Pasta auth/ (Scout), commit (Hawk), arquivos órfãos app.css/landing.css/
  pacientes.css/agenda-psicologo.css e JS órfãos (decisão futura).
