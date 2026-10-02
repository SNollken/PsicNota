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

## Edição de perfil

Os perfis de paciente e psicólogo permitem editar os dados e salvar automaticamente ao sair de um campo de texto ou selecionar uma opção, com popup de confirmação após a gravação. Estado, UF do CRP, formato de atendimento, área de atuação, gênero e pronomes usam seletores. O telefone no cadastro e nos perfis tem seleção de país/DDI, incluindo Japão (+81), e é gravado com o código internacional. Telefones brasileiros antigos continuam sendo lidos como +55. A alteração de e-mail usa o Supabase Auth; quando houver confirmação pendente, o perfil mantém o e-mail confirmado e orienta a confirmar a troca.

## Testes

Os testes automatizados em `tests/*.test.js` usam o executor nativo do Node.js e podem ser executados na raiz com:

```bash
node --test tests/*.test.js
```

O roteiro de navegador `tests/roteiro-cdp.mjs` é separado: usa Puppeteer, acessa o servidor na porta `8899` e depende de contas e dados de teste no Supabase. As instruções e os pré-requisitos específicos estão no início desse arquivo. Ele interage com dados reais do projeto configurado, portanto use um ambiente de desenvolvimento apropriado.

### Verificação do código fixo no banco

`supabase/tests/codigo_fixo_psicologo.sql` verifica criação automática, reutilização, códigos inválidos e isolamento entre contas em uma transação terminada em ROLLBACK. Execute em um banco com o esquema do projeto e as três migrações `20260930190000`, `20260930190100` e `20260930190200` aplicadas. O teste não mantém contas nem vínculos sintéticos, mas a sequência dos códigos pode avançar; os códigos não dependem de uma numeração sem intervalos.

`supabase/tests/codigo_personalizado_psicologo.sql` verifica a personalização, duplicidade, formato, autorização e cadastro com o código novo após a migração `20260930200000`.

## Anotações por voz locais nos relatórios

O microfone do editor grava até 5 minutos (máximo 10 MB). Ao parar, Whisper Small multilíngue transcreve em português no próprio navegador, usando CPU/WebAssembly em um Web Worker. Você pode ouvir o áudio, corrigir o texto e inseri-lo no cursor do relatório. A inserção dispara o salvamento automático de rascunhos existente. Uma gravação pendente precisa ser inserida ou descartada antes de salvar ou trocar a consulta.

O áudio e os dados enviados ao worker permanecem no dispositivo. Não há chamada de transcrição para Supabase, OpenAI ou outro servidor, e não é necessária chave de API. O relatório escrito continua seguindo o salvamento normal do aplicativo no Supabase. O áudio fica apenas na memória da página; fechar ou descartar a gravação remove essa cópia.

No primeiro uso, o navegador baixa cerca de 250 MB de pesos e configuração de `Xenova/whisper-small` do Hugging Face, na revisão fixa `2d67713f236afa48a18992566e7647f6ca848e13`, e os armazena no Cache Storage quando disponível. Apenas downloads GET desses arquivos são feitos, sem áudio. Os arquivos de execução estão versionados em `assets/vendor/transformers/`: Transformers.js 3.8.1 e ONNX Runtime Web 1.22.0-dev.20250409-89f8206ba4, com licenças e hashes. Após o modelo estar carregado, a inferência funciona sem conexão. Limpar os dados do navegador exige baixar novamente. Isso não transforma a autenticação ou o restante do aplicativo em um aplicativo offline.

A interface mostra o progresso do download e permite cancelar carregamento/processamento. Após uma falha ou cancelamento da inferência, o áudio permanece disponível para tentar novamente. Não existe fallback de transcrição em nuvem. A antiga Edge Function `transcribe-report` retorna 410 e não lê nem encaminha áudio.

É necessário HTTPS (ou localhost), permissão de microfone, MediaRecorder WebM/MP4, WebAssembly e Web Workers. O tempo de processamento varia com o dispositivo; o primeiro uso leva mais tempo e aparelhos com pouca memória podem não conseguir executar o modelo. A transcrição precisa ser revisada pelo profissional.

Testes da interface com resposta local simulada (Playwright + Chrome):

```bash
node tests/report-voice.browser.cjs
```

Esse teste usa áudio sintético e MediaRecorder real, verificando gravação, liberação do microfone, bloqueio de salvamento, revisão, inserção segura, erro/tentativa e layout em desktop/celular. As capturas vão para `QA_OUT` ou para a pasta temporária.

Verificação da função desativada (Deno):

```bash
deno test tests/transcribe-report.test.ts
```
