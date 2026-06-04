# AGENTS.md - jb-http-activity

Projeto: Custom Activity genérica para chamadas HTTP no Journey Builder do Salesforce Marketing Cloud.
Substitui o nó de HTTP Request do WeFlow (N8N) durante a migração de broker de Wetalkie para SFMC na Prefeitura do Rio.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 LTS |
| Backend | Express 4.x |
| HTTP client | Axios 1.x |
| JWT | jsonwebtoken 9.x |
| Frontend | Vue.js 3 + Vite 5 |
| Comunicação iframe↔JB | Postmonger 1.x |
| Hospedagem | GKE (cluster `application` em `us-central1`) |
| CI/CD | GitHub Actions → GHCR → ArgoCD |
| Secrets | Infisical (SuperApp: `infisical-superapp.squirrel-regulus.ts.net`) |
| Logs | BigQuery streaming insert direto (`rj-crm-registry.jb_http_activity.logs`) |
| Logs (store) | In-memory circular buffer (`server/lib/logStore.js`) + `GET /logs` |
| BigQuery client | `@google-cloud/bigquery` via ADC (Workload Identity) |

---

## Repositório

- **Origem:** `G:\Outros computadores\Meu laptop\Documentos\Coding Repositories\jb-http-activity`
- **GitHub:** `https://github.com/prefeitura-rio/jb-http-activity.git`

---

## Estrutura

```
jb-http-activity/
├── server/                    # Express backend
│   ├── index.js               # Entry point: serve /dist + registra rotas
│   ├── middleware/
│   │   └── jwtVerify.js       # Valida JWT do SFMC antes do /execute
│   ├── routes/
│   │   ├── execute.js         # Core: faz chamada HTTP + retorna outArgs
│   │   ├── validate.js        # Lifecycle JB
│   │   ├── publish.js         # Lifecycle JB
│   │   ├── save.js            # Lifecycle JB
│   │   ├── stop.js            # Lifecycle JB
│   │   └── logs.js            # GET /logs — retorna logs do logStore
│   └── lib/
│       ├── httpClient.js      # Wrapper Axios
│       ├── authHandler.js     # None / Bearer / OAuth2 client_credentials
│       ├── expressionParser.js# UPPER(x), ROUND(x,2), IF(cond,v,f), etc (16 funções)
│       ├── responseMapper.js  # Orquestra expressionParser + dot notation
│       ├── structuredLogger.js# stdout JSON → Cloud Logging → BigQuery
│       ├── logStore.js        # Circular buffer em memória (100 entradas)
│       └── bigQueryLogger.js  # Streaming insert direto no BigQuery
├── src/                       # Vue.js 3 (Vite)
│   ├── main.js
│   ├── App.vue
│   ├── dev/
│   │   └── postmonger-mock.js # Mock do Postmonger para dev local
│   └── components/
│       ├── ActivityName.vue
│       ├── tabs/
│       │   ├── TabRequest.vue
│       │   ├── TabAuth.vue
│       │   └── TabResponse.vue
│       └── shared/
│           ├── KeyValueEditor.vue
│           ├── VariablePicker.vue
│           ├── BodyEditor.vue
│           ├── ResponseMapping.vue
│           └── FunctionHelperModal.vue
├── public/
│   ├── config.json
│   ├── postmonger.js
│   └── icons/
│       ├── icon.png
│       └── iconSmall.png
├── test/
│   ├── execute.test.js           # expressionParser + responseMapper (40 testes)
│   ├── authHandler.test.js       # None, Bearer, OAuth2 (12 testes)
│   ├── httpClient.test.js        # shouldRetry (10 testes)
│   ├── bigQueryLogger.test.js    # batching e fallback (5 testes)
│   └── execute.integration.test.js  # Endpoint /execute mockado (4 testes)
├── k8s/
│   ├── staging/
│   │   ├── resources.yaml         # Deployment + Service + PDB (1 réplica)
│   │   ├── infisical-secret.yaml   # envSlug: staging
│   │   └── kustomization.yaml
│   └── prod/
│       ├── resources.yaml         # Deployment + Service + PDB + KEDA (2 réplicas)
│       ├── infisical-secret.yaml   # envSlug: prod
│       └── kustomization.yaml
├── .github/workflows/
│   ├── deploy-staging.yaml    # staging branch → k8s/staging/
│   └── deploy-production.yaml # main branch → k8s/prod/
├── Dockerfile
├── package.json
└── vite.config.js
```

---

## Comandos

```bash
npm start              # Servidor completo (build + serve)
npm run dev:server     # Backend com nodemon (hot reload)
npm run dev:client     # Frontend com Vite HMR (porta 5173)
npm run build          # Build do Vue.js → /dist
npm test               # Testes com mocha
npx c8 npm test        # Testes com cobertura
```

---

## Postmonger Events (crítico para o funcionamento)

| Evento | Direção | Descrição |
|---|---|---|
| `ready` | Activity → JB | Avisa que o iframe carregou |
| `initActivity` | JB → Activity | Envia config salva (ou default do config.json) |
| `updateActivity` | Activity → JB | Envia payload atualizado com schema de outArguments |
| `requestSchema` | Activity → JB | Solicita schema da DE entry source |
| `requestedSchema` | JB → Activity | Retorna schema da DE |
| `requestEndpoints` | Activity → JB | Solicita REST host |
| `requestedEndpoints` | JB → Activity | Retorna REST host |
| `requestInteractionDefaults` | Activity → JB | Solicita defaults da jornada |
| `requestedInteractionDefaults` | JB → Activity | Retorna defaults |
| `clickedNext` | JB → Activity | Operador clicou em Salvar |
| `clickedBack` | JB → Activity | Operador clicou em Voltar |

**Regra:** `trigger('updateActivity', payload)` **deve** incluir `schema.arguments.execute.outArguments` com todos os outArguments dinâmicos + built-ins. Sem isso, os campos não aparecem nas atividades seguintes do JB.

---

## Expressões de Transformação (expressionParser)

16 funções suportadas:

| Função | Descrição | Exemplo |
|---|---|---|
| `UPPER(v)` | Maiúsculas | `UPPER(nome)` → `"JOÃO"` |
| `LOWER(v)` | Minúsculas | `LOWER(nome)` → `"joão"` |
| `PROPER(v)` | Capitaliza | `PROPER(nome)` → `"João"` |
| `TRIM(v)` | Remove espaços | `TRIM(nome)` → `"João"` |
| `LEN(v)` | Tamanho | `LEN(cpf)` → `11` |
| `SUBSTR(v,i,n)` | Substring | `SUBSTR(cpf,0,3)` → `"123"` |
| `CONCAT(a,b)` | Concatena | `CONCAT("R$",v)` → `"R$1500"` |
| `ROUND(v,n)` | Arredonda | `ROUND(v,2)` → `1500.01` |
| `ABS(v)` | Valor absoluto | `ABS(v)` → `1500` |
| `NUMBER(v)` | Para número | `NUMBER("1500")` → `1500` |
| `TEXT(v)` | Para texto | `TEXT(1500)` → `"1500"` |
| `FORMAT(v,fmt)` | Formata | `FORMAT(d,"DD/MM")` → `"15/05"` |
| `JSONSTR(v)` | Objeto → JSON | `JSONSTR(obj)` → `'{"v":1}'` |
| `IF(c,t,f)` | Condicional | `IF(s=="x","sim","não")` |
| `DEFAULT(v,fb)` | Padrão se nulo | `DEFAULT(x,"—")` |
| `COALESCE(v1,v2)` | Primeiro não nulo | `COALESCE(a,b,"sem")` |

**Sintaxe do parser:**
```
expressão  = função | dotNotation | literal
função     = NOME "(" arg ("," arg)* ")"
arg        = expressão | stringLiteral | numberLiteral | booleanLiteral
```

---

## outArguments

### Built-in (sempre presentes)

| outArgument | Tipo | Descrição |
|---|---|---|
| `httpStatusCode` | number | Código HTTP real da API |
| `httpStatusClass` | text | Classe do status: "2xx", "4xx", "5xx" |
| `httpSuccess` | boolean | true se status 200-299 |

### Configuráveis (dinâmicos via Postmonger)

Definidos pelo operador na aba Response via expressões de transformação. O schema é enviado dinamicamente via `trigger('updateActivity', payload)`.

---

## Configuração do /execute

```json
{
  "inArguments": [
    { "activityName": "" },
    { "method": "GET" },
    { "url": "" },
    { "headers": "[]" },
    { "queryParams": "[]" },
    { "body": "" },
    { "auth": "{}" },
    { "responseMapping": "[]" },
    { "treatErrorsAsOutput": false },
    { "timeout": 30000 },
    { "retryCount": 0 },
    { "retryDelay": 1000 }
  ]
}
```

---

## ADRs (Architecture Decision Records)

### ADR-001: Tratar erros HTTP como saída

**Decisão:** Toggle `treatErrorsAsOutput`. Quando OFF, 4xx/5xx falham a activity. Quando ON, o servidor retorna 200 ao JB com `httpStatusCode` e `httpSuccess=false` nos outArguments, permitindo roteamento via Decision Split nativo.

### ADR-002: Logs no BigQuery via streaming insert direto

**Decisão:** O `@google-cloud/bigquery` faz streaming insert direto na tabela `rj-crm-registry.jb_http_activity.logs` usando ADC (Application Default Credentials). O GKE usa Workload Identity para assumir a service account `jb-http-activity-sa`. Não há Data Extension de log nem dependência de Cloud Logging sink.

**Fallback:** Se o BigQuery falhar, o log cai no `structuredLogger` (stdout).

### ADR-003: expressionParser no backend (não no frontend)

**Decisão:** As expressões de transformação são enviadas como string e processadas pelo backend (`server/lib/expressionParser.js`). O frontend apenas exibe o resultado do teste. Isso mantém o parser em um único lugar e evita duplicação de lógica.

### ADR-004: Postmonger mock para dev local

**Decisão:** Um `src/dev/postmonger-mock.js` simula os eventos do Journey Builder em ambiente de desenvolvimento, permitindo testar a UI completa sem conexão com SFMC. Carregado apenas quando `import.meta.env.DEV === true`.

### ADR-005: Logs em memória para feedback imediato na UI

**Decisão:** Um `logStore.js` circular buffer (100 entradas) armazena os últimos logs de execução do `/execute`. A rota `GET /logs` expõe os logs para debug manual via curl. A UI (TabResponse) exibe o preview detalhado do teste em tempo real, sem depender do logStore.

**Limitação:** Os logs são voláteis (perdidos no restart) e não persistem histórico completo. O log histórico está no BigQuery.

---

## Variáveis de Ambiente

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `JWT_SECRET` | Sim | — | App Signing Secret do SFMC (via Infisical) |
| `JWT_DISABLED` | Não | `false` | `true` para pular validação JWT em dev |
| `PORT` | Não | `3000` | Porta do servidor HTTP |
| `NODE_ENV` | Não | `development` | Ambiente (usado como campo `environment` no BigQuery) |
| `BIGQUERY_DATASET` | Não | `jb_http_activity` | Dataset no BigQuery |
| `BIGQUERY_TABLE` | Não | `logs` | Tabela no BigQuery |

---

## Code Review Checklist

### Backend
- [ ] Express endpoints tratam erro com try/catch e retornam JSON
- [ ] `/execute` valida inArguments antes de usar (null safety)
- [ ] JWT verify aplicado em todas as rotas de lifecycle
- [ ] `JWT_DISABLED=true` funcional para dev
- [ ] expressionParser testado com todas as 16 funções
- [ ] responseMapper cobre dot notation + expressões de transformação
- [ ] structuredLogger em formato JSON consistente
- [ ] Auth handler trata None, Bearer e OAuth2 client_credentials
- [ ] `treatErrorsAsOutput` respeitado na resposta do `/execute`
- [ ] Timeout configurável respeitado (1s-100s)
- [ ] Retry lógica: idempotente (mesmo activityId+definitionInstanceId = mesmo resultado)
- [ ] logStore.push() chamado em toda execução (sucesso e erro)
- [ ] bigQueryLogger.log() fire-and-forget chamado em toda execução
- [ ] `GET /logs?type=errors` retorna apenas execuções com falha

### Frontend
- [ ] Postmonger mock funcional em dev
- [ ] Aba Request: método, URL, headers, params, body, content-type, opções avançadas
- [ ] Aba Auth: None, Bearer, OAuth2 formulários + "Testar conexão"
- [ ] Aba Response: built-ins, expressões, FunctionHelperModal, teste com preview detalhado (timestamp, URL, duração, status, mapeamento)
- [ ] Schema de outArguments enviado via `trigger('updateActivity')`
- [ ] `clickedNext` → constrói payload e chama `updateActivity`
- [ ] Nome da atividade persiste e aparece no canvas

### Testes
- [ ] Teste de `/execute` com GET em API pública (jsonplaceholder)
- [ ] Teste de toggle `treatErrorsAsOutput` com API que retorna 404
- [ ] Teste de expressionParser (UPPER, ROUND, IF, PROPER, FORMAT)
- [ ] Cobertura mínima: 75%

---

## Testes (fases)

1. **Backend offline** — `npm test` + curl localhost:3000
2. **Frontend offline** — `npm run dev:client` + Postmonger mock
3. **ngrok** — expor local para SFMC Sandbox (dev local)
4. **E2E staging** — jornada no SFMC via package de staging com contatos internos
5. **E2E produção** — jornada real no SFMC

---

## Deploy

```bash
# GitHub Actions faz tudo automaticamente
# staging branch → k8s/staging/ → 1 réplica
#   git push origin staging
# main branch    → k8s/prod/    → 2 réplicas
#   git push origin main

# Fluxo recomendado:
# 1. Desenvolve em branch feature
# 2. Merge → staging → deploy automático no GKE staging
# 3. Testa via SFMC sandbox com Installed Package de staging e contatos internos
# 4. Merge staging → main → deploy automático no GKE produção

# Manual (emergência):
gcloud container clusters get-credentials application --zone=us-central1 --project=rj-crm-registry
kubectl set image deployment/jb-http-activity app=ghcr.io/prefeitura-rio/jb-http-activity:<tag> -n jb-http-activity
```

---

## SFMC Setup

1. Setup → Installed Packages → New → `jb-http-activity`
2. Add Component → Journey Builder Activity
   - Endpoint URL: URL do ingress GKE (ex: `https://jb-http-activity.pref.rio`)
   - Category: Custom
3. Copiar **Unique Key** → `public/config.json > configurationArguments.applicationExtensionKey`
4. Copiar **App Signing Secret** → Infisical (SuperApp) como `JWT_SECRET`

**Staging:** Para testar alterações antes de subir pra produção, crie um segundo Installed Package apontando pra URL de staging (ex: `jb-http-activity-staging.pref.rio`) com seu próprio App Signing Secret no `envSlug: staging` do Infisical.

---

## Convenções

- Commits: `feat:` / `fix:` / `refactor:` (sem prefixo de task)
- Branch: `main` para produção, `staging` para testes
- Código: sem comentários desnecessários, variáveis em camelCase, português para textos de UI
- Versionamento semântico seguindo o release do SFMC
