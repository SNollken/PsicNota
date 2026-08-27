# Plano: Reorganização dos HTMLs do PsicNota em pastas

Status: PLANO (nada foi executado). Levantamento feito lendo o repo C:\Coding\PsicNota.

## Decisão (resumo)
Criar UMA pasta nova, `auth/`, e mover as 3 páginas de autenticação pra dentro dela.
Todo o resto fica como está: `paciente/` e `profissional/` já são pastas por papel, e
`index.html`, `home.html`, `perfil.html` permanecem na raiz. É o plano de menor risco
que realmente desafoga a raiz (que hoje tem 6 HTMLs soltos).

## Estrutura final proposta
```
PsicNota/
├── index.html               (entrada, redireciona pro login)      FICA
├── home.html                (landing pública, em construção)      FICA
├── perfil.html              (perfil, comum aos dois papéis)       FICA
├── auth/                    <- PASTA NOVA
│   ├── login.html           <- MOVER
│   ├── cadastro.html        <- MOVER
│   └── esqueci-senha.html   <- MOVER
├── paciente/                (área do paciente)                    FICA
│   ├── home.html
│   ├── agenda-paciente.html
│   ├── laudos.html
│   └── psicologo.html
├── profissional/            (área do profissional)                FICA
│   ├── home.html
│   ├── agenda.html
│   ├── consulta.html
│   ├── historico.html
│   ├── pacientes.html
│   ├── relatorios.html
│   └── relatorio-view.html
└── assets/                  (css, js, img, menu)                  FICA
```

## O que mover (3 arquivos)
1. login.html         -> auth/login.html
2. cadastro.html      -> auth/cadastro.html
3. esqueci-senha.html -> auth/esqueci-senha.html

## Links e referências a atualizar

### A. Dentro dos 3 arquivos movidos: caminho de asset (assets/ -> ../assets/)

auth/login.html
- L11  assets/css/auth.css          -> ../assets/css/auth.css
- L17  assets/img/logo_psicnota.png -> ../assets/img/logo_psicnota.png
- L135 assets/js/login.js           -> ../assets/js/login.js
- L16  href="index.html"            -> ../index.html   (logo/brand)
- (L88 esqueci-senha.html e L124 cadastro.html NÃO mudam: mesma pasta)

auth/cadastro.html
- L36  assets/css/cadastro.css      -> ../assets/css/cadastro.css
- L64  assets/img/logo_psicnota.png -> ../assets/img/logo_psicnota.png
- L865 assets/js/cadastro.js        -> ../assets/js/cadastro.js
- L59  href="index.html"            -> ../index.html   (logo/brand)
- (L848 login.html NÃO muda: mesma pasta)

auth/esqueci-senha.html
- L29  assets/img/logo_psicnota.png -> ../assets/img/logo_psicnota.png
- (L32 login.html NÃO muda: mesma pasta. Página não carrega css/js externo.)

### B. Páginas da raiz que apontam para auth

index.html (3 pontos)
- L7   meta refresh url=login.html            -> url=auth/login.html
- L8   window.location.replace("login.html")  -> ("auth/login.html")
- L11  <a href="login.html">                  -> auth/login.html

home.html
- L41  href="cadastro.html"  -> auth/cadastro.html
- L42  href="login.html"     -> auth/login.html

### C. Página de subpasta que aponta para login (logout)

profissional/agenda.html
- L52  href="../login.html"  -> ../auth/login.html

### D. Navegação feita por JS

assets/js/login.js
- L130 "profissional/home.html" : "paciente/home.html"
       -> "../profissional/home.html" : "../paciente/home.html"
       (o login.js passa a rodar dentro de auth/login.html; precisa do ../ pra alcançar a raiz)

assets/js/perfil.js
- L112 "login.html" -> "auth/login.html"
       (o perfil.js roda na raiz, dentro de perfil.html)

assets/js/cadastro.js
- L267 "login.html" -> NÃO muda (cadastro e login ficam juntos em auth/)

### E. O que NÃO precisa de alteração (verificado)
- assets/menu/menu.js e menu.html: não referenciam nenhuma página de auth.
  O menu só aponta para agenda/relatorios/pacientes/laudos/perfil. Nada a mudar.
- assets/js/sidebar.js: usa apenas ../assets/img/. Nada a mudar.
- Demais JS (relatorios.js, consulta.js, pacientes.js, agenda.js, agenda-psicologo.js):
  só referenciam páginas DENTRO de profissional/ (consulta, historico, relatorios,
  relatorio-view). Nada a mudar.
- Todas as páginas de paciente/ e profissional/: seus links para ../perfil.html,
  home.html e páginas vizinhas continuam válidos. Nada a mudar
  (única exceção: o logout de profissional/agenda.html, item C acima).

## Esforço total
- 3 arquivos movidos
- 6 HTML editados: auth/login, auth/cadastro, auth/esqueci-senha, index, home, profissional/agenda
- 2 JS editados: login.js, perfil.js

## Ordem de execução (para quando for executar, NÃO agora)
1. mkdir auth
2. git mv login.html auth/ ; git mv cadastro.html auth/ ; git mv esqueci-senha.html auth/
3. aplicar os edits da seção A (nos 3 arquivos movidos)
4. aplicar os edits das seções B, C e D
5. rodar a verificação abaixo

## Como verificar depois de executar
1. abrir index.html          -> redireciona para auth/login.html
2. na tela de login: "Criar conta" -> auth/cadastro.html ;
   "Esqueci minha senha" -> auth/esqueci-senha.html
3. logar como psicólogo      -> vai para profissional/home.html ;
   logar como paciente        -> vai para paciente/home.html
4. em profissional/agenda.html, "Sair da conta" -> auth/login.html
5. no login/cadastro, clicar no logo (brand)   -> index.html (raiz)
6. console do navegador sem 404 de css/js/img

## Por que NÃO ir além (pasta dashboard/)
Enfiar paciente/ e profissional/ dentro de uma pasta dashboard/ obrigaria a editar o
menu.js (../perfil.html -> ../../perfil.html), o sidebar.js e as ~11 páginas que
carregam ../assets/menu/menu.js e ../assets/js/sidebar.js, além de todos os ../perfil.html
e ../login.html hardcoded. Seriam dezenas de edits e um nível a mais de aninhamento, sem
ganho de navegação (paciente e profissional já nomeiam os dois papéis claramente).
Não vale o risco agora. Se um dia quiser a pasta dashboard/, o custo é esse acima.
