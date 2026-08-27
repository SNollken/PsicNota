# Plano: separação do CSS por página (PsicNota)

Status: PLANO (nada executado). Produzido pelo Wrench em 26/08/2026.

## Diagnóstico

base.css: 1278 linhas / 22,9KB, mistura design system + estilos de 8+ páginas.

Páginas REAIS (conteúdo de verdade):
- login.html, home.html (raiz, seleção) -> auth.css (auto-contido)
- cadastro.html -> cadastro.css (auto-contido)
- esqueci-senha.html -> estilo inline (placeholder "em construção")
- perfil.html -> perfil.css + menu.css (auto-contido, NÃO usa base.css)
- profissional/agenda.html -> agenda.css + base.css
- profissional/relatorios.html -> base.css + relatorios.css (novo, untracked)
- paciente/agenda-paciente.html -> agenda.css + base.css + agenda-paciente.css
- index.html -> redirect puro para login.html

Páginas PLACEHOLDER (63 linhas, "em construção", usam .construction-box):
paciente/home, paciente/laudos, paciente/psicologo, profissional/home,
profissional/consulta, profissional/historico, profissional/pacientes,
profissional/relatorio-view.
Todas linkam só base.css.

Arquivos ÓRFÃOS (nenhum HTML referencia):
- CSS: app.css, landing.css, pacientes.css, agenda-psicologo.css
- JS: laudos.js, historico.js, consulta.js, pacientes.js, relatorio-view.js, agenda-psicologo.js

Problemas encontrados:
1. Tokens :root duplicados em 5 lugares (base, auth, cadastro, perfil 2x, agenda),
   com valores levemente diferentes (ex.: --blue-50: #f4fbfe no agenda vs #E4F6FC no base).
2. auth.css já define .auth-shell/.auth-frame/.auth-panel -> o bloco .auth-* do
   base.css (linhas 740-841) é código morto (login/home nem linkam base.css).
3. BUG: .construction-box/.construction-wrap NÃO estão definidas em CSS nenhum ->
   as 8 páginas placeholder renderizam sem estilo.
4. app.css duplica componentes que já estão no base.css (.content-card, .card-heading).

## Mapeamento base.css -> destino

FICA NO NÚCLEO (core/base.css, compartilhado por 2+ páginas):
- reset, svg, [hidden], .sr-only
- .app-shell, .main-content, .mobile-menu
- .topbar, .page-heading, .eyebrow, h1, .topbar-actions,
  .account-chip, .account-avatar, .mini-avatar, .account-copy
- .panel, .content-card, .section, .card-heading,
  .section-heading, .section-icon, .section-heading-copy
- .fields-grid, .form-grid, .field, input/select/textarea, .field-error-msg
- .button*, .form-actions, .action-row
- .badge*
- .two-columns
- .summary-* (perfil + agenda usam)
- .toast
- media queries responsivas globais
- NOVO: .construction-box/.construction-wrap (correção do bug)

VAI PARA CSS DE PÁGINA:
- .patient-search, .patient-card, .patient-photo, .patient-initials,
  .patient-meta, .patient-view -> dashboard/pacientes.css
- .modal-*, .empty-state -> dashboard/agenda.css (só agenda usa hoje)
- .report-document, .report-head, .report-logo, .report-title,
  .report-meta, .report-block*, @media print -> relatorios/relatorio-view.css (novo)
- .timeline-* -> dashboard/historico.css (novo; historico.js órfão já usa)
- .note-area, .note-mood-field, .note-toolbar, .info-grid, .info-item
  -> dashboard/consulta.css (novo; futura consulta.html)

SAI DO base.css (código morto, histórico preserva):
- bloco .auth-* (740-841): duplicado do auth.css
- bloco .landing-* (843-883): nada usa
- bloco .home-grid/.home-card/.home-icon/.home-badge (885-963): nada usa
- bloco .data-table/.table-scroll/.data-table-empty (523-591): nada usa

## Estrutura final proposta

assets/css/
  core/
    tokens.css          NOVO — única fonte das variáveis
    base.css            MOVIDO+ENXUTO — design system compartilhado,
                        mantém @import ../menu/menu.css
  auth/
    auth.css            MOVIDO (login.html + home.html raiz)
    cadastro.css        MOVIDO (cadastro.html)
  dashboard/
    agenda.css          MOVIDO (recebe .modal-* e .empty-state)
    agenda-paciente.css MOVIDO
    agenda-psicologo.css MOVIDO (órfão, em desenvolvimento)
    pacientes.css       MOVIDO (recebe .patient-*; referenciado por
                        agenda-paciente.html e futura pacientes.html)
    perfil.css          MOVIDO (auto-contido + tokens.css)
    historico.css       NOVO (.timeline-*)
    consulta.css        NOVO (.note-*, .info-*)
  relatorios/
    relatorios.css      MOVIDO (editor; commitar antes, está untracked)
    relatorio-view.css  NOVO (.report-* + @media print)
  landing.css           fica na raiz (futura landing pública)

EXCLUIR: app.css (conteúdo duplicado do core, zero referências).

## HTMLs a atualizar (href dos links)

- login.html            -> assets/css/auth/auth.css
- home.html             -> assets/css/auth/auth.css
- cadastro.html         -> assets/css/auth/cadastro.css
- perfil.html           -> core/tokens.css + dashboard/perfil.css (mantém menu.css)
- profissional/agenda.html       -> core/tokens + core/base + dashboard/agenda.css
- profissional/relatorios.html   -> core/tokens + core/base + relatorios/relatorios.css
- profissional/consulta.html     -> core/* + dashboard/consulta.css
- profissional/historico.html    -> core/* + dashboard/historico.css
- profissional/pacientes.html    -> core/* + dashboard/pacientes.css
- profissional/home.html         -> core/*
- profissional/relatorio-view.html -> core/* + relatorios/relatorio-view.css
- paciente/home.html, paciente/laudos.html, paciente/psicologo.html -> core/*
- paciente/agenda-paciente.html  -> core/* + dashboard/agenda.css +
                                    dashboard/agenda-paciente.css + dashboard/pacientes.css
- index.html, esqueci-senha.html -> nada muda

## Ordem de execução (quando aprovado)

1. Commitar o estado atual (git status sujo: agenda em andamento + relatorios.css untracked).
2. Criar core/tokens.css; trocar os :root duplicados por <link> do tokens.
3. Criar pastas auth/, dashboard/, relatorios/ e git mv os CSS existentes.
4. Extrair blocos de página do base.css para os novos arquivos
   (historico.css, consulta.css, relatorio-view.css; pacientes.css += .patient-*;
   agenda.css += .modal/.empty-state).
5. Remover blocos mortos do base.css (.auth-*, .landing-*, .home-*, .data-table).
6. Adicionar .construction-box ao core/base.css.
7. Atualizar os <link> em todos os HTMLs da lista acima.
8. Verificação visual página por página (antes/depois).

## Riscos

- Consolidar tokens pode mudar levemente a aparência da agenda
  (--blue-50 difere entre agenda.css e base.css). Teste visual obrigatório.
- O @import do menu.css no base.css precisa sobreviver até todos os HTMLs
  linkarem menu.css explicitamente (ou manter o @import no core de vez).
- relatorios.css é trabalho em andamento não commitado: commitar antes de mover.
