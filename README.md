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

1. Na página de cadastro, escolha paciente ou psicólogo e preencha os dados. Pacientes precisam do código fixo enviado pelo psicólogo. Para psicólogos, CRP, UF, área de atuação e formato de atendimento são obrigatórios. A senha deve ter pelo menos 8 caracteres e o aceite dos textos do cadastro começa desmarcado.
2. Com confirmação de e-mail desativada no Supabase, o cadastro abre a sessão e direciona ao painel automaticamente. O primeiro acesso do psicólogo oferece links para completar o perfil e configurar os horários. Se a confirmação estiver ativada, a página orienta a verificar o e-mail e entrar depois.
3. Para voltar à conta, entre em `auth/login.html`. O login aceita e-mail ou os usuários existentes `psicologo`, `paciente` e `paciente2`; para esses usuários, o código acrescenta `@psicnota.test`.
4. Cada psicólogo recebe automaticamente um código único, como `PN-27`. Em Meu perfil → Convidar pacientes, o código pode ser personalizado e compartilhado por link; não vence e aceita vários cadastros. O paciente fica vinculado ao psicólogo ao se cadastrar. Psicólogos existentes também recebem seu código. Ao personalizar, use de 3 a 24 letras, números ou hífens; códigos repetidos e o formato automático PN-N são reservados. A troca invalida o link anterior sem alterar os pacientes já vinculados. Convites temporários antigos ainda não usados continuam válidos até o vencimento original.
5. Como psicólogo, configure disponibilidades e acompanhe as solicitações pela agenda. É possível aprovar ou recusar uma solicitação; após a aprovação, a consulta fica registrada.
6. Como paciente, acesse a agenda, escolha um horário disponível e envie a solicitação. Acompanhe as informações nas telas do paciente.

Os links de Termos de Uso e Política de Privacidade abrem páginas com lorem ipsum, solicitado como conteúdo provisório. Substitua esses textos quando as versões oficiais estiverem disponíveis.

## Testes

Os testes automatizados em `tests/*.test.js` usam o executor nativo do Node.js e podem ser executados na raiz com:

```bash
node --test tests/*.test.js
```

O roteiro de navegador `tests/roteiro-cdp.mjs` é separado: usa Puppeteer, acessa o servidor na porta `8899` e depende de contas e dados de teste no Supabase. As instruções e os pré-requisitos específicos estão no início desse arquivo. Ele interage com dados reais do projeto configurado, portanto use um ambiente de desenvolvimento apropriado.

### Verificação do código fixo no banco

`supabase/tests/codigo_fixo_psicologo.sql` verifica criação automática, reutilização, códigos inválidos e isolamento entre contas em uma transação terminada em ROLLBACK. Execute em um banco com o esquema do projeto e as três migrações `20260930190000`, `20260930190100` e `20260930190200` aplicadas. O teste não mantém contas nem vínculos sintéticos, mas a sequência dos códigos pode avançar; os códigos não dependem de uma numeração sem intervalos.

`supabase/tests/codigo_personalizado_psicologo.sql` verifica a personalização, duplicidade, formato, autorização e cadastro com o código novo após a migração `20260930200000`.

## Anotações por voz nos relatórios

No editor de relatórios, o microfone grava até 5 minutos (máximo 10 MB). Ao parar, o áudio é transcrito em português com `gpt-4o-transcribe`. É possível ouvir a gravação, corrigir a transcrição e inserir o texto no cursor do relatório. O texto inserido participa do mesmo salvamento automático de rascunhos. Uma transcrição pendente precisa ser inserida ou descartada antes de salvar ou trocar a consulta.

O áudio fica temporariamente na memória da página; não é salvo no banco ou no Storage do PsicNota. Ele é enviado ao Supabase e à OpenAI para processamento. A página informa isso antes de gravar. A saída não gera observações clínicas nem um relatório novo: apenas transcreve a fala, sujeita à revisão profissional. Fechar a página descarta o áudio; se houver falha de transcrição, é possível tentar novamente enquanto a página permanece aberta.

Configuração do servidor:

1. Configure o secret `OPENAI_API_KEY` em [Edge Function Secrets do projeto](https://supabase.com/dashboard/project/gjfqslgoplpqeqewytdn/functions/secrets). Use uma chave de API OpenAI com faturamento habilitado; a assinatura do ChatGPT não substitui esse acesso. Nunca coloque a chave no frontend ou no Git.
2. Publique `supabase/functions/transcribe-report/index.ts` com `verify_jwt = true`, conforme `supabase/config.toml`. A função também valida a sessão com Auth e exige `perfis.papel = 'psicologo'` usando as permissões do próprio usuário.
3. Verifique o `GET /functions/v1/transcribe-report` autenticado: deve retornar `{"ready":true}`. A falta do secret retorna 503 e a interface explica que a transcrição não foi ativada, antes de solicitar o microfone.
4. Faça uma gravação curta com voz real e confira o texto. O endpoint aceita WebM, MP4 e WAV, e não registra áudio ou texto em logs. O faturamento e a política de retenção do provedor dependem da conta OpenAI configurada.

A gravação exige HTTPS (ou localhost), permissão de microfone e MediaRecorder com WebM/MP4. Testes locais com resposta de transcrição simulada verificam a interface, mas não comprovam a qualidade do reconhecimento real.

Teste do endpoint (requer Deno):

```bash
deno check supabase/functions/transcribe-report/index.ts
deno test --allow-env tests/transcribe-report.test.ts
```

Teste da interface (Playwright disponível no projeto ou via `PLAYWRIGHT_PATH`, e Chrome instalado):

```bash
node tests/report-voice.browser.cjs
```

Esse teste usa áudio sintético do Chromium com MediaRecorder real e simula apenas as respostas do provedor. Verifica gravação, liberação do microfone, bloqueio de salvamento durante o fluxo, revisão, inserção segura de texto, tentativa após falha e layout em desktop/celular. As capturas são salvas em `QA_OUT` ou na pasta temporária do sistema.
