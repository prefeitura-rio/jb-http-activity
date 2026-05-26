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
| Hospedagem | GCP Cloud Run |
| CI/CD | GitLab CI → Artifact Registry → Cloud Run |
| Secrets | GCP Secret Manager |
| Logs | Cloud Logging → BigQuery → Looker Studio |

---

## Repositório

- **Origem:** `G:\Outros computadores\Meu laptop\Documentos\Coding Repositories\jb-http-activity`
- **GitLab:** `git@gitlab.prefeitura.rio:czrm/jb-http-activity.git`

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
│   │   └── stop.js            # Lifecycle JB
│   └── lib/
│       ├── httpClient.js      # Wrapper Axios
│       ├── authHandler.js     # None / Bearer / OAuth2 client_credentials
│       ├── expressionParser.js# UPPER(x), ROUND(x,2), IF(cond,v,f), etc (16 funções)
│       ├── responseMapper.js  # Orquestra expressionParser + dot notation
│       └── structuredLogger.js# stdout JSON → Cloud Logging → BigQuery
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
│       │   ├── TabResponse.vue
│       │   └── TabLogs.vue
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
│   └── execute.test.js
├── Dockerfile
├── .gitlab-ci.yml
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

### ADR-002: Logs no BigQuery (sem DE no SFMC)

**Decisão:** Todo log é feito como JSON estruturado no stdout do Cloud Run → Cloud Logging → BigQuery via sink. Não há Data Extension de log nem Server-to-Server API. Isso elimina dependência de credenciais SFMC adicionais e reduz complexidade.

### ADR-003: expressionParser no backend (não no frontend)

**Decisão:** As expressões de transformação são enviadas como string e processadas pelo backend (`server/lib/expressionParser.js`). O frontend apenas exibe o resultado do teste. Isso mantém o parser em um único lugar e evita duplicação de lógica.

### ADR-004: Postmonger mock para dev local

**Decisão:** Um `src/dev/postmonger-mock.js` simula os eventos do Journey Builder em ambiente de desenvolvimento, permitindo testar a UI completa sem conexão com SFMC. Carregado apenas quando `import.meta.env.DEV === true`.

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

### Frontend
- [ ] Postmonger mock funcional em dev
- [ ] Aba Request: método, URL, headers, params, body, content-type, opções avançadas
- [ ] Aba Auth: None, Bearer, OAuth2 formulários + "Testar conexão"
- [ ] Aba Response: built-ins, expressões, FunctionHelperModal, teste com preview
- [ ] Aba Logs: exibe último erro
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
3. **ngrok** — expor local para SFMC Sandbox
4. **E2E** — jornada real no SFMC Sandbox

---

## Deploy

```bash
# Manual
gcloud run deploy jb-http-activity \
  --image IMAGE \
  --region us-east1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets JWT_SECRET=jb-http-activity-jwt:latest \
  --memory 256Mi --cpu 1 --min-instances 0 --max-instances 10 --timeout 120

# Sink BigQuery (1 vez)
gcloud logging sinks create jb-http-activity-bq-sink \
  bigquery.googleapis.com/projects/PROJECT_ID/datasets/jb_http_activity_logs \
  --log-filter="resource.type=cloud_run_revision AND resource.labels.service_name=jb-http-activity"
```

---

## SFMC Setup

1. Setup → Installed Packages → New → `jb-http-activity`
2. Add Component → Journey Builder Activity
   - Endpoint URL: URL do Cloud Run
   - Category: Custom
3. Copiar **Unique Key** → `public/config.json > configurationArguments.applicationExtensionKey`
4. Copiar **App Signing Secret** → GCP Secret Manager como `jb-http-activity-jwt`

---

## Convenções

- Commits: `feat:` / `fix:` / `refactor:` (sem prefixo de task)
- Branch: `main` para produção, `dev` para desenvolvimento
- Código: sem comentários desnecessários, variáveis em camelCase, português para textos de UI
- Versionamento semântico seguindo o release do SFMC
