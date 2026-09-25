# PsicNota

O PsicNota é uma aplicação web para organizar a relação entre psicólogos e pacientes. O paciente consulta horários e solicita uma consulta; o psicólogo administra disponibilidades, avalia solicitações e acompanha consultas, notas e relatórios pelas telas do projeto.

## Funcionalidades

- Cadastro de pacientes e psicólogos, entrada com e-mail ou nome de usuário e senha, e solicitação de recuperação de senha pelo Supabase Auth.
- Perfil e agenda do paciente, com consulta de horários e envio de solicitações.
- Perfil, disponibilidades e agenda do psicólogo, com aprovação ou recusa de solicitações. A aprovação cria uma consulta no banco por meio de uma função do Supabase.
- Telas do psicólogo para pacientes, consultas, notas e relatórios, incluindo histórico e visualização de relatórios.

## Tecnologias

HTML, CSS e JavaScript no navegador; biblioteca `@supabase/supabase-js` v2 carregada por CDN; Supabase Auth e banco de dados; Node.js para os testes. Não há processo de build nem `package.json` no repositório.

## Organização

```text
auth/                 Cadastro, login e recuperação de senha
paciente/             Telas de início, agenda e perfil do paciente
psicologo/            Telas de início, agenda, disponibilidades, perfis,
                     pacientes, consultas, notas e relatórios
assets/css/           Estilos gerais e por área
assets/js/            Comportamento das páginas, cliente Supabase e dados compartilhados
assets/menu/          Menu compartilhado
assets/img/           Imagens e identidade visual
supabase/migrations/  Migrações SQL versionadas
supabase/seed.sql     Dados de exemplo para desenvolvimento
tests/                Testes Node.js e roteiro de navegador
index.html            Landing page pública (única entrada em `/`)
```

## Executar localmente

1. Clone o repositório e entre na pasta:

   ```bash
   git clone https://github.com/SNollken/PsicNota.git
   cd PsicNota
   ```

2. Inicie um servidor HTTP estático na raiz (Python 3 é uma opção):

   ```bash
   python -m http.server 8899
   ```

3. Abra `http://127.0.0.1:8899/` ou `http://127.0.0.1:8899/auth/login.html` no navegador. É necessário acesso à internet para carregar a biblioteca pelo CDN e acessar o Supabase.

O arquivo `assets/js/supabase-client.js` já aponta para um projeto Supabase e contém uma chave **publicável**. Para usar outro projeto, altere `SUPABASE_URL` e `SUPABASE_KEY` nesse arquivo e prepare nele o esquema, as políticas e as funções exigidas pelas páginas. A pasta `supabase/migrations/` contém alterações versionadas, mas este repositório não inclui o esquema inicial completo citado em `supabase/seed.sql`; por isso, as migrações e a seed isoladas não bastam para criar um projeto novo do zero. A seed é apenas para desenvolvimento, exige contas de teste previamente criadas e não deve ser aplicada em produção.

## Fluxo básico

1. Na página de cadastro, escolha paciente ou psicólogo e crie a conta; o perfil correspondente é usado para direcionar a entrada.
2. Entre em `auth/login.html`. O login aceita e-mail ou nome de usuário; neste último caso, o código acrescenta `@psicnota.test`.
3. Como psicólogo, configure disponibilidades e acompanhe as solicitações pela agenda. É possível aprovar ou recusar uma solicitação; após a aprovação, a consulta fica registrada.
4. Como paciente, acesse a agenda, escolha um horário disponível e envie a solicitação. Acompanhe as informações nas telas do paciente.

## Testes

Os testes automatizados em `tests/*.test.js` usam o executor nativo do Node.js e podem ser executados na raiz com:

```bash
node --test tests/*.test.js
```

O roteiro de navegador `tests/roteiro-cdp.mjs` é separado: usa Puppeteer, acessa o servidor na porta `8899` e depende de contas e dados de teste no Supabase. As instruções e os pré-requisitos específicos estão no início desse arquivo. Ele interage com dados reais do projeto configurado, portanto use um ambiente de desenvolvimento apropriado.
