# Deploy PsicNota no Render — Plano

## Resumo

Projeto 100% HTML/CSS/JS estático. Sem package.json, sem build step, sem framework.
Deploy como **Static Site** no Render via GitHub (SNollken/PsicNota, branch main).

---

## 1. Composio + Render: O que existe (e o que NÃO existe)

### Ferramentas Composio para Render (4 tools)

| Tool | O que faz |
|------|-----------|
| RENDER_LIST_SERVICES | Lista serviços (filtra por type: static_site, web_service, etc.) |
| RENDER_RETRIEVE_SERVICE | Detalhes de um serviço existente por ID |
| RENDER_LIST_ROUTES | Lista regras de redirect/rewrite |
| RENDER_ADD_ROUTE | Adiciona redirect/rewrite num serviço |

**Conclusão: Composio NÃO tem ferramenta para CRIAR serviço no Render.**
Só gerencia serviços já existentes. A integração é limitada.

> ⚠️ A conexão Render no Composio sequer está ativa (has_active_connection: false).
> Mesmo que estivesse, não há RENDER_CREATE_SERVICE.

---

## 2. Alternativa real: Render MCP Server (já disponível)

O Render tem um MCP server oficial que já está documentado no skill `render-mcp`.
Ele tem **24 tools**, incluindo:

- `create_static_site` ← exatamente o que precisamos
- `update_static_site`
- `create_web_service`, `create_cron_job`
- `list_workspaces`, `select_workspace`
- `list_deploys`, `get_deploy`, `list_logs`, etc.

### Setup do Render MCP (se ainda não estiver configurado neste PC)

1. Gerar API key em https://dashboard.render.com/account/api-keys
2. Adicionar ao config.yaml do Hermes:
```yaml
mcp_servers:
  render:
    enabled: true
    url: https://mcp.render.com/mcp
    headers:
      Authorization: Bearer <SUA_API_KEY>
3. `/reload-mcp` ou reiniciar Hermes
4. Verificar: `hermes mcp test render` → 24 tools
```

---

## 3. Parâmetros para criar o Static Site no Render

### Via API REST (`POST https://api.render.com/v1/services`)

```json
{
  "type": "static_site",
  "name": "psicnota",
  "ownerId": "<WORKSPACE_ID>",
  "repo": "https://github.com/SNollken/PsicNota",
  "branch": "main",
  "autoDeploy": "yes",
  "serviceDetails": {
    "publishPath": ".",
    "buildCommand": "",
    "headers": [],
    "redirects": []
  }
}
```

### Campos obrigatórios

| Campo | Tipo | Valor para PsicNota |
|-------|------|---------------------|
| type | string | `"static_site"` |
| name | string | `"psicnota"` (ou outro nome único no workspace) |
| ownerId | string | ID do workspace Render (configuração → Settings) |

### Campos recomendados

| Campo | Tipo | Valor para PsicNota |
|-------|------|---------------------|
| repo | string | `"https://github.com/SNollken/PsicNota"` |
| branch | string | `"main"` |
| autoDeploy | string | `"yes"` (deploy automático a cada push) |
| serviceDetails.publishPath | string | `"."` (raiz do repo — onde ficam os .html) |
| serviceDetails.buildCommand | string | `""` (vazio — não tem build step) |

### O que NÃO precisa

- **buildCommand**: vazio. Não tem npm, nem compilação. O Render só copia os arquivos pro CDN.
- **rootDir**: usar publishPath em vez de rootDir para static sites.
- **envVars**: não precisa. Dados ficam em localStorage do browser.
- **image**: não usa Docker.

### Workspace ID

Obter em: Render Dashboard → Settings do workspace → "ID do workspace".
Precisa do `ownerId` E do `workspaceId` (para o MCP, são o mesmo valor).

Já sabemos do Blaze Event Hub que o workspace ID é `tea-d97ehgl7vvec73c2161g`.
Confirmar se o PsicNota vai no mesmo workspace ou em outro.

---

## 4. Estrutura do projeto (confirmada)

```
PsicNota/
├── index.html              ← redirect para auth/login.html
├── home.html               ← página "em construção"
├── auth/
│   ├── login.html
│   ├── cadastro.html
│   └── esqueci-senha.html
├── paciente/
│   ├── home.html
│   ├── agenda-paciente.html
│   ├── perfil.html
│   ├── laudos.html
│   └── psicologo.html
├── psicologo/
│   ├── home.html
│   ├── agenda-psicologo.html
│   ├── consulta.html
│   ├── historico.html
│   ├── pacientes.html
│   ├── perfil.html
│   ├── relatorios.html
│   └── relatorio-view.html
├── assets/
│   ├── css/        (stylesheets por página)
│   ├── js/         (scripts por página + shared-data.js)
│   ├── img/        (logos, avatares)
│   └── menu/       (menu.html include)
├── .gitignore
└── README.md
```

- **Sem package.json** — projeto puro HTML/CSS/JS
- **Sem build step** — publish directory = raiz (`.`)
- **19 páginas HTML** no total
- **localStorage** para dados (sem backend)

---

## 5. Fluxo de deploy proposto

### Opção A: Via Render MCP (recomendada — automatizável do Hermes)

```
1. list_workspaces → pegar ownerId
2. create_static_site(name="psicnota", repo="https://github.com/SNollken/PsicNota", branch="main", publishPath=".", autoDeploy="yes")
3. Aguardar deploy (~30s para site estático)
4. Verificar URL gerada: psicnota.onrender.com
5. curl -s -o /dev/null -w "%{http_code}" https://psicnota.onrender.com/ → 200
```

### Opção B: Via API REST (curl)

```bash
curl --request POST \
  --url https://api.render.com/v1/services \
  --header 'Authorization: Bearer <API_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{
    "type": "static_site",
    "name": "psicnota",
    "ownerId": "<WORKSPACE_ID>",
    "repo": "https://github.com/SNollken/PsicNota",
    "branch": "main",
    "autoDeploy": "yes",
    "serviceDetails": {
      "publishPath": "."
    }
  }'
```

### Opção C: Via Dashboard (manual, 2 clicks)

1. https://dashboard.render.com → New → Static Site
2. Conectar GitHub → SNollken/PsicNota
3. Branch: main, Build: (vazio), Publish: .
4. Create Static Site → pronto

---

## 6. Pré-requisitos antes de fazer o deploy

- [ ] Repo PSICNOTA deve estar público ou Render deve ter acesso ao GitHub (install GitHub App)
- [x] Ter um workspace Render — confirmado: mesmo do Blaze Event Hub (`tea-d97ehgl7vvec73c2161g`)
- [ ] API key do Render (se usar MCP ou API REST) — **PENDENTE** (ver nota em `.maestri/nota-render-key-pendente.md`)
- [ ] Configurar Redirect Rules depois do deploy:
  - `/` → `/auth/login.html` (o index.html já faz meta refresh, mas redirect é mais limpo)
  - SPA fallback se necessário

### Status da busca pela API key (2026-09-01)

| Fonte consultada | Resultado |
|-----------------|-----------|
| `~/.secrets/render_api_key.txt` | Arquivo nao existe |
| Var de ambiente `RENDER_API_KEY` | Nao definida |
| Hermes config.yaml (mcp_servers) | Sem Render MCP configurado |
| Composio connections (render) | `has_active_connection: false` |

**Proximo passo:** Gerar key em https://dashboard.render.com/account/api-keys e salvar em `.secrets/render_api_key.txt`.

---

## 7. O que o Composio PODE fazer depois do deploy

Uma vez que o serviço exista no Render, o Composio pode:
- Listar o serviço: `RENDER_LIST_SERVICES(type="static_site")`
- Ver detalhes: `RENDER_RETRIEVE_SERVICE(serviceId="srv-...")`
- Adicionar redirects: `RENDER_ADD_ROUTE(serviceId, type="redirect", source="/", destination="/auth/login.html")`
- Listar rotas: `RENDER_LIST_ROUTES(serviceId)`

Mas **não pode criar, deletar, ou fazer deploy** — essas funções ficam com o Render MCP ou API direta.

---

## 8. Recomendação

| Caminho | Esforço | Automação |
|---------|---------|-----------|
| Render MCP (`create_static_site`) | Baixo | Total — pode rodar do Hermes |
| API REST (curl) | Baixo | Total — uma chamada curl |
| Composio | **Impossível** | Não tem CREATE |
| Dashboard | Mínimo | Manual, 2 min |

**Recomendação: usar o Render MCP** que já está documentado no skill `render-mcp`.
Se o MCP não estiver configurado neste PC, a API REST com curl é equivalente.

---

*Pesquisa feita em 2026-09-01. Fontes: Render API Docs (api-docs.render.com), Render Docs (render.com/docs/static-sites), Composio tool search (4 tools para Render), skill render-mcp (24 tools).*
