# jb-http-activity

Custom Activity para Salesforce Marketing Cloud Journey Builder que funciona como um nó genérico de chamadas HTTP — equivalente ao nó de requisição HTTP do WeFlow (N8N) na plataforma Wetalkie.

---

## Índice

1. [Contexto e Motivação](#1-contexto-e-motivação)
2. [Visão Geral](#2-visão-geral)
3. [Arquitetura](#3-arquitetura)
4. [Estrutura do Repositório](#4-estrutura-do-repositório)
5. [Stack Técnica](#5-stack-técnica)
6. [UI — Telas e Wireframes](#6-ui--telas-e-wireframes)
7. [Fluxo de Execução](#7-fluxo-de-execução)
8. [config.json e Data Binding](#8-configjson-e-data-binding)
9. [outArguments Dinâmicos](#9-outarguments-dinâmicos)
10. [Segurança — JWT](#10-segurança--jwt)
11. [Autenticação com APIs Externas](#11-autenticação-com-apis-externas)
12. [Deploy — GCP Cloud Run](#12-deploy--gcp-cloud-run)
13. [SFMC — Installed Package](#13-sfmc--installed-package)
14. [Logging e Dashboard](#14-logging-e-dashboard)
15. [Estratégia de Testes e Validação](#15-estratégia-de-testes-e-validação)
17. [Desenvolvimento Local](#17-desenvolvimento-local)
18. [Fases de Implementação](#18-fases-de-implementação)
19. [Limitações e Considerações](#19-limitações-e-considerações)
20. [Exemplo — Case Dívida Ativa](#20-exemplo--case-dívida-ativa)
21. [Referências](#21-referências)

---

## 1. Contexto e Motivação

### Cenário atual (Wetalkie / WeFlow)

A Prefeitura do Rio utiliza a plataforma **Wetalkie** como broker de WhatsApp. O produto **WeFlow** — uma derivação do N8N — permite construir fluxos de automação com nós de chamadas HTTP, elementos de decisão baseados em retorno de API e lógica de URA digital pós-interação com HSMs.

**Exemplo em produção — Case Dívida Ativa PGM:**

```
[HSM disparado]
      │
      ▼
[WeFlow: GET api.pgm.rio/divida/{CPF}]   ← consulta dívida
      │
      ▼ response: { valor, status, codigo }
      │
[WeFlow: POST api.pgm.rio/boleto]        ← gera boleto
      │
      ▼ response: { codigoBoleto, urlBoleto }
      │
[Envia WhatsApp com link do boleto]
```

O nó HTTP do WeFlow suporta:
- Todos os métodos HTTP (GET, POST, PUT, PATCH, DELETE)
- Headers dinâmicos com interpolação de variáveis
- Body JSON com variáveis do contexto do fluxo
- Autenticação Bearer e OAuth 2.0
- Extração de campos do response para uso nos nós seguintes

### Migração para SFMC

A Prefeitura migrará o broker de WhatsApp para o **Salesforce Marketing Cloud**, utilizando o **Journey Builder** como orquestrador das jornadas. O Journey Builder não possui nativamente um nó equivalente ao HTTP Request do WeFlow.

As alternativas avaliadas e descartadas foram:

| Alternativa | Motivo da descartagem |
|---|---|
| `sfmc-postman.com` | SaaS pago (€100/mês), código fechado, dependência de terceiro |
| CloudPage com AMPscript | Não escala — uma CloudPage por chamada de API, retorno de dados limitado |
| repos `salesforce-marketingcloud/sfmc-postman` e `forcedotcom/postman-salesforce-apis` | Coleções Postman para teste de APIs do SFMC, não são Custom Activities |
| `beau32/JB-Restful-Activity` | Conceito correto, mas sem qualidade de produção, UI básica, sem manutenção |

**Decisão:** desenvolver a `jb-http-activity` como Custom Activity própria, hospedada no GCP da Prefeitura.

---

## 2. Visão Geral

A `jb-http-activity` é uma aplicação **Node.js/Express + Vue.js 3** registrada como **Custom Activity** no SFMC via Installed Package. Aparece no canvas do Journey Builder como um nó arrastável e configurável.

**O que faz:**
- Aceita qualquer método HTTP (GET, POST, PUT, PATCH, DELETE)
- Permite configurar URL, headers, query params e body com variáveis do contato
- Suporta autenticação None, Bearer Token e OAuth 2.0 Client Credentials
- Expõe o **HTTP status code** como `outArgument` built-in (`httpStatusCode`, `httpStatusClass`, `httpSuccess`) — sem configuração adicional
- Extrai campos do response JSON via dot notation e os expõe como `outArguments` configuráveis
- Modo **"Tratar erros HTTP como saída"**: respostas 4xx/5xx não interrompem o fluxo — o status code é roteado via Decision Split nativo
- Os `outArguments` ficam disponíveis para as atividades seguintes da jornada via data binding do Journey Builder

**O que não faz:**
- Não substitui o Decision Split nativo do JB (os outArguments alimentam o split nativo)
- Não armazena dados permanentemente (stateless por design)
- Não suporta autenticação via certificado mTLS

---

## 3. Arquitetura

### Diagrama geral

```
┌─────────────────────────────────────────────────────────────────┐
│                  SALESFORCE MARKETING CLOUD                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    JOURNEY BUILDER                       │  │
│  │                                                          │  │
│  │  [Entry: DE com CPF]                                     │  │
│  │         │                                                │  │
│  │         ▼                                                │  │
│  │  ┌─────────────────┐   (1) POST /execute                 │  │
│  │  │ 🔗 Consulta PGM │ ─────────────────────────────────► │  │
│  │  │  POST           │ ◄──────────────────────────────── │  │
│  │  │  api.pgm.rio/.. │   (2) { codigoBoleto, status }     │  │
│  │  └─────────────────┘                                     │  │
│  │         │                                                │  │
│  │         ▼                                                │  │
│  │  [Decision Split nativo]                                 │  │
│  │  status = "ativa" ?                                      │  │
│  │    │ Sim          │ Não                                  │  │
│  │    ▼              ▼                                      │  │
│  │  [Gera Boleto]  [Msg: sem dívida]                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS (porta 443)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GCP CLOUD RUN                                │
│              jb-http-activity                                   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Express     │  │  JWT Verify  │  │  httpClient (Axios)   │ │
│  │  Server      │─►│  Middleware  │─►│  + responseMapper     │ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
│                                               │                 │
│  ┌──────────────────────────────┐             │ HTTPS           │
│  │  Vue.js 3 (Vite) — /dist    │             ▼                 │
│  │  Servido como iframe no JB  │    ┌────────────────────┐     │
│  └──────────────────────────────┘   │  APIs Externas     │     │
│                                     │  PGM, Data Rio,    │     │
│  ┌──────────────────────────────┐   │  qualquer endpoint │     │
│  │  GCP Secret Manager         │   └────────────────────┘     │
│  │  JWT_SECRET                 │                               │
│  └──────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes

| Componente | Responsabilidade |
|---|---|
| **Express Server** | Serve os arquivos estáticos do Vue.js e os endpoints do ciclo de vida da Custom Activity |
| **JWT Verify Middleware** | Valida a assinatura JWT enviada pelo SFMC em cada requisição ao `/execute` |
| **httpClient (Axios)** | Executa a chamada HTTP para a API externa com os parâmetros configurados |
| **expressionParser** | Interpreta expressões de transformação como `UPPER(x)`, `ROUND(x,2)`, `IF(cond,v,f)` |
| **responseMapper** | Orquestra expressionParser + extração de campos via dot notation para outArguments |
| **structuredLogger** | Loga cada execução em formato JSON estruturado no stdout → Cloud Logging → BigQuery |
| **Vue.js 3 (iframe)** | Interface de configuração do nó, carregada dentro do Journey Builder via iframe |
| **Postmonger** | Biblioteca de comunicação entre o iframe (Vue) e o Journey Builder |

---

## 4. Estrutura do Repositório

```
jb-http-activity/
├── server/
│   ├── index.js                   # Express: serve /dist + registra rotas
│   ├── middleware/
│   │   └── jwtVerify.js           # Valida JWT do SFMC antes do /execute
│   ├── routes/
│   │   ├── execute.js             # Core: faz chamada HTTP + retorna outArgs
│   │   ├── validate.js            # Lifecycle JB: valida config pré-publish
│   │   ├── publish.js             # Lifecycle JB: journey publicada
│   │   ├── save.js                # Lifecycle JB: activity salva
│   │   └── stop.js                # Lifecycle JB: journey parada
│   └── lib/
│       ├── httpClient.js          # Wrapper Axios (todos os métodos HTTP)
│       ├── authHandler.js         # None / Bearer / OAuth2 client_credentials
│       ├── expressionParser.js    # Transforma expressões como UPPER(x), ROUND(x,2), IF(cond, v, f)
│       └── responseMapper.js      # Orquestra expressionParser + extração de campos via dot notation
│       └── structuredLogger.js    # Log estruturado JSON para Cloud Logging / BigQuery
│
├── src/                           # Vue.js 3 (Vite)
│   ├── main.js                    # Inicialização do app Vue
│   ├── App.vue                    # Componente raiz (tabs + nome da atividade)
│   └── components/
│       ├── ActivityName.vue       # Campo de nome do nó (exibido no canvas)
│       ├── tabs/
│       │   ├── TabRequest.vue     # Aba: método, URL, headers, params, body
│       │   ├── TabAuth.vue        # Aba: autenticação
│       │   ├── TabResponse.vue    # Aba: mapeamento de outArguments + teste
│       │   └── TabLogs.vue        # Aba: último erro registrado
│       └── shared/
│           ├── KeyValueEditor.vue # Tabela dinâmica chave/valor (headers/params)
│           ├── VariablePicker.vue # Dropdown de variáveis disponíveis no JB
│           ├── BodyEditor.vue     # Textarea JSON com validação e helper
│           ├── ResponseMapping.vue # Tabela de mapeamento expressão → outArgument
│           └── FunctionHelperModal.vue # Modal de ajuda com funções de transformação
│
├── public/
│   ├── config.json                # Definição da Custom Activity para o SFMC
│   ├── postmonger.js              # Lib de comunicação iframe ↔ Journey Builder
│   └── icons/
│       ├── icon.png               # Ícone grande (exibido no painel lateral)
│       └── iconSmall.png          # Ícone pequeno (exibido no canvas)
│
├── Dockerfile
├── .gitlab-ci.yml                 # Build → Artifact Registry → Cloud Run
├── .env.example
├── package.json
└── vite.config.js
```

---

## 5. Stack Técnica

| Camada | Tecnologia | Versão |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Backend framework | Express | 4.x |
| HTTP client | Axios | 1.x |
| JWT | jsonwebtoken | 9.x |
| Frontend framework | Vue.js | 3.x |
| Build tool | Vite | 5.x |
| Hospedagem | GCP Cloud Run | — |
| CI/CD | GitLab CI | — |
| Registry de imagens | GCP Artifact Registry | — |
| Secrets | GCP Secret Manager | — |
| Comunicação iframe↔JB | Postmonger | 1.x |

---

## 6. UI — Telas e Wireframes

A UI é uma Single Page Application Vue.js carregada como **iframe** no painel lateral de configuração do Journey Builder. Largura fixa de ~480px.

> Os mockups visuais foram gerados por IA (Gemini 3.1 Flash Image Preview) a partir dos wireframes abaixo.  
> 📁 `.opencode/docs/discovery/images/`

### Estrutura geral

```
┌─────────────────────────────────────────────┐
│  Nome da atividade                          │
│  ┌─────────────────────────────────────┐    │
│  │ Consulta PGM – Dívida Ativa         │    │
│  └─────────────────────────────────────┘    │
│─────────────────────────────────────────────│
│  [Request] [Auth] [Response] [Logs]         │
│─────────────────────────────────────────────│
│  ...conteúdo da aba ativa...                │
└─────────────────────────────────────────────┘
```

![Mockup - Activity Header](.opencode/docs/discovery/images/mockup_01_Activity-Header.jpg)

---

### Aba 1 — Request

```
┌─────────────────────────────────────────────┐
│  Método                                     │
│  ┌────────────────────┐                     │
│  │ POST            ▾  │                     │
│  └────────────────────┘                     │
│  GET / POST / PUT / PATCH / DELETE          │
│                                             │
│  URL  ⓘ                                    │
│  ┌─────────────────────────────────────┐    │
│  │ https://api.pgm.rio/divida/         │    │
│  │ {{Contact.Attribute.DE.CPF}}        │    │
│  └─────────────────────────────────────┘    │
│  [ + Inserir variável ▾ ]                   │
│                                             │
│  Headers                                    │
│  ┌──────────────────┬──────────────────┐    │
│  │ Chave            │ Valor            │    │
│  ├──────────────────┼──────────────────┤    │
│  │ Content-Type     │ application/json │ 🗑 │
│  ├──────────────────┼──────────────────┤    │
│  │ x-api-key        │ {{Attr.DE.KEY}}  │ 🗑 │
│  └──────────────────┴──────────────────┘    │
│  [ + Adicionar Header ]                     │
│                                             │
│  Query Params                               │
│  ┌──────────────────┬──────────────────┐    │
│  │ Chave            │ Valor            │    │
│  ├──────────────────┼──────────────────┤    │
│  │ formato          │ json             │ 🗑 │
│  └──────────────────┴──────────────────┘    │
│  [ + Adicionar Param ]                      │
│                                             │
│  Body  (visível apenas em POST/PUT/PATCH)   │
│  Content-Type                               │
│  ┌────────────────────────────────────┐     │
│  │ application/json                ▾  │     │
│  └────────────────────────────────────┘     │
│  application/json / form-urlencoded /       │
│  multipart/form-data                        │
│  ┌─────────────────────────────────────┐    │
│  │ {                                   │    │
│  │   "cpf": "{{Attr.DE.CPF}}",         │    │
│  │   "canal": "whatsapp"               │    │
│  │ }                                   │    │
│  └─────────────────────────────────────┘    │
│  [ + Inserir variável ▾ ]   ⚠ JSON inválido │
│                                             │
│  Opções avançadas ▾                         │
│  ┌─────────────────────────────────────┐    │
│  │  Timeout (ms)        ┌──────────┐   │    │
│  │                      │  30000   │   │    │
│  │                      └──────────┘   │    │
│  │  Tentativas          ┌──────────┐   │    │
│  │                      │    2     │   │    │
│  │                      └──────────┘   │    │
│  │  Delay entre tent.   ┌──────────┐   │    │
│  │  (ms)                │   2000   │   │    │
│  │                      └──────────┘   │    │
│  │                                     │    │
│  │  Tratar erros HTTP como saída  ◉   │    │
│  │  ⓘ Quando ativo, respostas 4xx e   │    │
│  │  5xx não interrompem o fluxo.       │    │
│  │  Use o Decision Split nativo com    │    │
│  │  httpStatusCode para rotear.        │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

![Mockup - Aba Request](.opencode/docs/discovery/images/mockup_02_Aba-Request.jpg)

**Dropdown "Inserir variável"** — exibe variáveis disponíveis no contexto do JB:

```
┌─────────────────────────────────────┐
│ 🔍 Buscar variável...               │
├─────────────────────────────────────┤
│ ▸ Dados do Contato                  │
│   {{Contact.Key}}                   │
│   {{Contact.Attribute.DE.CPF}}      │
│   {{Contact.Attribute.DE.NOME}}     │
│   {{Contact.Attribute.DE.TELEFONE}} │
├─────────────────────────────────────┤
│ ▸ Contexto da Jornada               │
│   {{Context.IsTest}}                │
│   {{Context.DefinitionId}}          │
├─────────────────────────────────────┤
│ ▸ Atividades anteriores             │
│   {{Interaction.HTTP-1.codigoBol.}} │
│   {{Interaction.HTTP-1.statusDiv.}} │
└─────────────────────────────────────┘
```

---

### Aba 2 — Auth

**OAuth 2.0 Client Credentials:**

```
┌─────────────────────────────────────────────┐
│  Tipo de Autenticação                       │
│  ┌────────────────────────────────────┐     │
│  │ OAuth 2.0 – Client Credentials  ▾ │     │
│  └────────────────────────────────────┘     │
│                                             │
│  Token URL                                  │
│  ┌─────────────────────────────────────┐    │
│  │ https://auth.pgm.rio/oauth/token    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Client ID                                  │
│  ┌─────────────────────────────────────┐    │
│  │ czrm-client-id                      │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Client Secret                              │
│  ┌─────────────────────────────────────┐    │
│  │ ••••••••••••••••••••                │ 👁 │
│  └─────────────────────────────────────┘    │
│                                             │
│  Scope  (opcional)                          │
│  ┌─────────────────────────────────────┐    │
│  │ divida:read boleto:write            │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [ 🔁 Testar conexão ]                      │
│  ✅ Token obtido com sucesso                 │
└─────────────────────────────────────────────┘
```

![Mockup - Aba Auth](.opencode/docs/discovery/images/mockup_03_Aba-Auth.jpg)

**Bearer Token:**

```
┌─────────────────────────────────────────────┐
│  Tipo de Autenticação                       │
│  ┌────────────────────────────────────┐     │
│  │ Bearer Token                    ▾ │     │
│  └────────────────────────────────────┘     │
│                                             │
│  Token                                      │
│  ┌─────────────────────────────────────┐    │
│  │ {{Contact.Attribute.DE.TOKEN}}      │    │
│  └─────────────────────────────────────┘    │
│  Pode ser valor fixo ou variável do contato │
└─────────────────────────────────────────────┘
```

---

### Aba 3 — Response

```
┌─────────────────────────────────────────────┐
│  ── Variáveis built-in (sempre disponíveis) │
│  ⓘ Geradas automaticamente, sem configurar  │
│  ┌─────────────────────────────────────┐    │
│  │ httpStatusCode  (number) ex: 200    │    │
│  │ httpStatusClass (text)   ex: "2xx"  │    │
│  │ httpSuccess     (boolean) ex: true  │    │
│  └─────────────────────────────────────┘    │
│  {{Interaction.HTTP-1.httpStatusCode}}      │
│  {{Interaction.HTTP-1.httpStatusClass}}     │
│  {{Interaction.HTTP-1.httpSuccess}}         │
│                                             │
│  ── Mapeamento de campos do response ──────  │
│  ⓘ Use dot notation ou funções de           │
│  transformação. [ ? Ver funções ]            │
│                                             │
│  ┌────────────────────┬──────────────┬────┐ │
│  │ Expressão          │ Nome da var. │Ti po│ │
│  ├────────────────────┼──────────────┼────┤ │
│  │ boleto.codigo      │ codigoBoleto │text│🗑│
│  ├────────────────────┼──────────────┼────┤ │
│  │ boleto.url         │ urlBoleto    │text│🗑│
│  ├────────────────────┼──────────────┼────┤ │
│  │ PROPER(cliente.nom)│ nomeCapital  │text│🗑│
│  ├────────────────────┼──────────────┼────┤ │
│  │ ROUND(divida.valor)│ valorFormat  │num.│🗑│
│  ├────────────────────┼──────────────┼────┤ │
│  │ IF(status=="ATIVA")│ statusLabel  │text│🗑│
│  │ ,"Em debito","Regu"│              │    │ │
│  │ lar")              │              │    │ │
│  ├────────────────────┼──────────────┼────┤ │
│  │ error.code         │ errorCode    │text│🗑│
│  └────────────────────┴──────────────┴────┘ │
│  [ + Adicionar campo ]                      │
│                                             │
│  ── Todas as variáveis geradas ────────────  │
│  Use nas atividades seguintes:              │
│                                             │
│  {{Interaction.HTTP-1.httpStatusCode}}      │
│  {{Interaction.HTTP-1.httpStatusClass}}     │
│  {{Interaction.HTTP-1.httpSuccess}}         │
│  {{Interaction.HTTP-1.codigoBoleto}}        │
│  {{Interaction.HTTP-1.urlBoleto}}           │
│  {{Interaction.HTTP-1.valorFormat}}         │
│  {{Interaction.HTTP-1.nomeCapital}}         │
│  {{Interaction.HTTP-1.statusLabel}}         │
│  {{Interaction.HTTP-1.errorCode}}           │
│                                             │
│  [ 📋 Copiar todas ]                        │
│                                             │
│  ── Testar request ────────────────────────  │
│  [ ▶ Executar com dados de teste ]          │
│                                             │
│  Response de teste:                         │
│  ┌─────────────────────────────────────┐    │
│  │ 200 OK  •  247ms                    │    │
│  │ {                                   │    │
│  │   "boleto": {                       │    │
│  │     "codigo": "03399.18391...",     │    │
│  │     "url": "https://pgm.rio/..."    │    │
│  │   },                                │    │
│  │   "divida": {                       │    │
│  │     "valor": 1500.00,               │    │
│  │     "status": "ativa"               │    │
│  │   },                                │    │
│  │   "cliente": { "nome": "joao" }    │    │
│  │ }                                   │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ✅ codigoBoleto  → "03399.18391..."        │
│  ✅ urlBoleto     → "https://pgm.rio/..."   │
│  ✅ nomeCapital   → "Joao"                  │
│  ✅ valorFormat   → 1500.00                 │
│  ✅ errorCode     → ""                      │
└─────────────────────────────────────────────┘
```

![Mockup - Aba Response](.opencode/docs/discovery/images/mockup_04_Aba-Response.jpg)

### Function Helper Modal

Acionado pelo link "[ ? Ver funções ]" na aba Response:

```
┌─────────────────────────────────────────────┐
│  Funções de Transformação                   │
│─────────────────────────────────────────────│
│                                             │
│  Digite expressões na coluna "Expressão"    │
│  para transformar valores do response.      │
│  Ex: ROUND(valor,2) → 1500.01              │
│                                             │
│  ── Texto ────────────────────────────────  │
│  UPPER(v)          → caixa alta             │
│  LOWER(v)          → caixa baixa            │
│  PROPER(v)         → primeira maiúscula     │
│  TRIM(v)           → sem espaços extras     │
│  LEN(v)            → tamanho da string      │
│  SUBSTR(v, i, n)   → substring              │
│  CONCAT(a, b, ...) → concatenar             │
│                                             │
│  ── Número ──────────────────────────────   │
│  ROUND(v, n)       → arredondar casas       │
│  ABS(v)            → valor absoluto          │
│  NUMBER(v)         → converter para número  │
│                                             │
│  ── Lógica ───────────────────────────────  │
│  IF(cond, t, f)    → se/senão              │
│  DEFAULT(v, fb)    → valor padrão se nulo   │
│  COALESCE(v1, v2)  → primeiro não nulo      │
│                                             │
│  ── Formatação ──────────────────────────    │
│  FORMAT(v, fmt)    → formatar string         │
│  TEXT(v)           → converter para texto    │
│  JSONSTR(v)        → objeto para JSON        │
│                                             │
│  [ Fechar ]                                 │
└─────────────────────────────────────────────┘
```

![Mockup - Function Helper Modal](.opencode/docs/discovery/images/mockup_05_FunctionHelperModal.jpg)

---

### Aba 4 — Logs

```
┌─────────────────────────────────────────────┐
│  ⚠ Último erro registrado                  │
│  ┌─────────────────────────────────────┐    │
│  │ 2026-05-25 14:23:01                 │    │
│  │ 503 Service Unavailable             │    │
│  │ api.pgm.rio/divida – timeout 30s    │    │
│  │                                     │    │
│  │ ContactKey: 00Q5g000001XyZA         │    │
│  │ ActivityId: 933c2de1-f8c9-...       │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Configuração de retry ativa:               │
│  2 tentativas • 2000ms de delay             │
└─────────────────────────────────────────────┘
```

![Mockup - Aba Logs](.opencode/docs/discovery/images/mockup_06_Aba-Logs.jpg)

---

### Nó no Canvas do Journey Builder

Após configurado, o nó exibe preview automático:

```
┌──────────────────────┐
│  🔗                  │
│  Consulta PGM        │  ← nome definido pelo operador
│                      │
│  POST                │
│  api.pgm.rio/divida  │  ← URL truncada (gerada automaticamente)
│                      │
│  7 variáveis         │  ← 3 built-in + 4 mapeadas pelo operador
└──────────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Decision Split            │
│  httpStatusCode = 200      │  ← usando built-in
└────────────────────────────┘
    │ Sim          │ Não
    ▼              ▼
[Gera Boleto]  [Decision Split]
               httpStatusCode = 404
    │              │
   Sim            Não
```

![Mockup - No Canvas](.opencode/docs/discovery/images/mockup_07_No-Canvas.jpg)

---

## 7. Fluxo de Execução

Passo a passo do que acontece quando um contato passa pelo nó no Journey Builder:

```
(1)  Contato entra na Custom Activity no JB

(2)  JB resolve os inArguments via data binding:
     {{Contact.Attribute.DE.CPF}} → "123.456.789-00"
     {{Contact.Attribute.DE.TOKEN}} → "eyJhbGci..."

(3)  JB faz POST para:
     https://jb-http-activity-xxxx.run.app/execute
     Body: {
       "inArguments": [
         { "method": "POST" },
         { "url": "https://api.pgm.rio/divida/123.456.789-00" },
         { "headers": [...] },
         { "body": "{\"cpf\":\"123.456.789-00\"}" },
         { "auth": { "type": "bearer", "token": "eyJhbGci..." } },
         { "responseMapping": [...] }
       ],
       "activityId": "933c2de1-...",
       "definitionInstanceId": "3303ad80-..."
     }

(4)  Servidor verifica JWT da requisição

(5)  authHandler resolve autenticação:
     - Bearer: adiciona header Authorization: Bearer <token>
     - OAuth2: POST para tokenUrl → obtém access_token → adiciona header

(6)  httpClient faz chamada para API externa:
     POST https://api.pgm.rio/divida/123.456.789-00
     Headers: { Authorization: "Bearer eyJ...", Content-Type: "..." }
     Body: { "cpf": "123.456.789-00", "canal": "whatsapp" }

(7)  API externa retorna (exemplo sucesso):
     200 OK
     { "boleto": { "codigo": "03399...", "url": "https://..." },
       "divida": { "valor": 1500.00, "status": "ativa" } }

     Ou (exemplo erro despadronizado):
     422 Unprocessable Entity
     { "error": { "code": "CPF_INVALIDO", "message": "..." } }

(8)  Servidor verifica toggle "Tratar erros HTTP como saída":
     - Toggle OFF + status 4xx/5xx → retorna 500 ao JB
                                    → JB remove contato do fluxo ❌
     - Toggle ON  + qualquer status → sempre retorna 200 ao JB ✅

(9)  responseMapper monta outArguments:

     Built-in (sempre presentes):
     httpStatusCode  → 422
     httpStatusClass → "4xx"
     httpSuccess     → false

     Mapeados pelo operador (dot notation sobre o body):
     "error.code" → errorCode → "CPF_INVALIDO"
     (campos do body de sucesso retornam null/vazio em caso de erro)

(10) Servidor retorna para o JB:
     200 OK
     {
       "httpStatusCode": 422,
       "httpStatusClass": "4xx",
       "httpSuccess": false,
       "errorCode": "CPF_INVALIDO",
       "codigoBoleto": null,
       "statusDivida": null
     }

(11) JB armazena outArguments no contexto da jornada

(12) Decision Split nativo roteia por httpStatusCode:
     {{Interaction.HTTP-1.httpStatusCode}} = 200 → Sucesso
     {{Interaction.HTTP-1.httpStatusCode}} = 422 → CPF inválido
     {{Interaction.HTTP-1.httpSuccess}} = false  → Qualquer erro
```

---

## 8. config.json e Data Binding

O `config.json` é o arquivo que define a Custom Activity para o SFMC. Fica em `/public/config.json` e é servido pelo Express como rota estática.

```json
{
  "workflowApiVersion": "1.1",
  "metaData": {
    "icon": "icons/icon.png",
    "iconSmall": "icons/iconSmall.png",
    "category": "custom",
    "isConfigured": false
  },
  "type": "REST",
  "lang": {
    "en-US": {
      "name": "HTTP Request",
      "description": "Generic HTTP request node for Journey Builder"
    }
  },
  "arguments": {
    "execute": {
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
      ],
      "outArguments": [],
      "timeout": 30000,
      "retryCount": 2,
      "retryDelay": 2000,
      "concurrentRequests": 5,
      "url": "https://jb-http-activity-xxxx.run.app/execute",
      "verb": "POST",
      "useJwt": true
    }
  },
  "configurationArguments": {
    "applicationExtensionKey": "SUBSTITUIR_PELA_ACTIVITY_KEY_DO_SFMC",
    "save": {
      "url": "https://jb-http-activity-xxxx.run.app/save",
      "verb": "POST",
      "useJwt": true
    },
    "validate": {
      "url": "https://jb-http-activity-xxxx.run.app/validate",
      "verb": "POST",
      "useJwt": true
    },
    "publish": {
      "url": "https://jb-http-activity-xxxx.run.app/publish",
      "verb": "POST",
      "useJwt": true
    },
    "stop": {
      "url": "https://jb-http-activity-xxxx.run.app/stop",
      "verb": "POST",
      "useJwt": true
    }
  },
  "userInterfaces": {
    "configurationSupportsReadOnlyMode": true,
    "configInspector": {
      "size": "scm-lg",
      "emptyIframe": false
    }
  },
  "schema": {
    "arguments": {
      "execute": {
        "outArguments": []
      }
    }
  }
}
```

### Data Binding — sintaxe suportada

| Expressão | Descrição |
|---|---|
| `{{Contact.Key}}` | Subscriber Key do contato |
| `{{Contact.Attribute.NomeDaDE.Campo}}` | Campo de qualquer Data Extension vinculada |
| `{{Contact.Default.Email}}` | Email padrão do contato |
| `{{Interaction.HTTP-1.nomeDoOutArg}}` | outArgument de atividade anterior |
| `{{Context.IsTest}}` | `true` se a jornada estiver em modo teste |
| `{{Context.DefinitionId}}` | ID da definição da jornada |

O JB resolve todas as expressões `{{...}}` **antes** de chamar o `/execute`, então o servidor sempre recebe os valores finais já interpolados.

---

## 9. outArguments Dinâmicos

O maior desafio técnico da implementação. O JB precisa conhecer os `outArguments` em **design time** (quando o marketer está montando a jornada) para disponibilizá-los nos nós seguintes.

### Estratégia

O `schema` da atividade é enviado dinamicamente via Postmonger no momento em que o operador salva a configuração do nó:

**`customActivity.js` (lógica Postmonger):**

```javascript
// Quando o operador clica em "Salvar" no JB
connection.on('clickedNext', function() {
  const responseMapping = store.getResponseMapping()

  // Constrói o schema de outArguments com base no que o operador configurou
  const outArguments = responseMapping.map(mapping => ({
    [mapping.outputName]: {
      dataType: mapping.type,       // 'text' | 'number' | 'boolean' | 'date'
      direction: 'out',
      isNullable: true,
      access: 'visible'
    }
  }))

  const payload = {
    metaData: { isConfigured: true },
    arguments: {
      execute: {
        inArguments: buildInArguments(store.getConfig()),
        outArguments: []
      }
    },
    schema: {
      arguments: {
        execute: { outArguments }
      }
    }
  }

  connection.trigger('updateActivity', payload)
})
```

### outArguments built-in (sempre gerados automaticamente)

Independente do que o operador configurar na aba Response, estes três campos são **sempre** retornados pelo servidor:

| outArgument | Tipo JB | Descrição | Exemplo |
|---|---|---|---|
| `httpStatusCode` | `number` | Código HTTP real da API externa | `200`, `404`, `503` |
| `httpStatusClass` | `text` | Classe do status HTTP | `"2xx"`, `"4xx"`, `"5xx"` |
| `httpSuccess` | `boolean` | `true` se status entre 200–299 | `true` / `false` |

Uso típico no Decision Split nativo após o nó:

```
httpStatusCode = 200           → Sucesso
httpStatusCode = 404           → Recurso não encontrado
httpStatusCode = 422           → Erro de validação (ex: CPF inválido)
httpStatusClass = "5xx"        → Falha do servidor externo
httpSuccess = false            → Qualquer erro (agrupado)
```

### Toggle "Tratar erros HTTP como saída"

Controla o comportamento quando a API externa retorna 4xx ou 5xx:

| Toggle | Comportamento 4xx/5xx | Caso de uso |
|---|---|---|
| **OFF** (default) | Servidor retorna erro ao JB → contato sai do fluxo | Quando erros são excepcionais e não precisam de tratamento |
| **ON** | Servidor retorna 200 ao JB + `httpStatusCode` nos outArgs | Quando a API retorna erros esperados que precisam de roteamento |

> **Equivalente ao "Nunca Gerar Erro" do WeFlow/N8N.** Permite mapear o código de retorno da API em um Decision Split após o nó, inclusive quando as APIs são despadronizadas (ex: retornam 200 com corpo de erro, ou 422 para casos de negócio esperados).

### Tipos suportados pelo Journey Builder

| Tipo no JB | Usado quando |
|---|---|
| `text` | Strings, IDs, códigos, URLs |
| `number` | Valores numéricos (inteiros e decimais) |
| `boolean` | Flags true/false |
| `date` | Datas — usar com cautela (bug histórico em Decision Splits nativos com comparação de datas) |

### Expressões de Transformação

Além da dot notation simples, a coluna "Expressão" aceita **funções de transformação** para manipular valores antes de expô-los como outArguments.

#### Funções suportadas

| Função | Descrição | Exemplo → Resultado |
|---|---|---|
| **UPPER(v)** | Maiúsculas | `UPPER(nome)` → `"JOÃO"` |
| **LOWER(v)** | Minúsculas | `LOWER(nome)` → `"joão"` |
| **PROPER(v)** | Capitaliza palavras | `PROPER(nome)` → `"João Da Silva"` |
| **TRIM(v)** | Remove espaços extras | `TRIM(nome)` → `"João"` |
| **LEN(v)** | Tamanho da string | `LEN(cpf)` → `11` |
| **SUBSTR(v, i, n)** | Substring | `SUBSTR(cpf,0,3)` → `"123"` |
| **CONCAT(a, b, ...)** | Concatena valores | `CONCAT("R$ ", valor)` → `"R$ 1500"` |
| **ROUND(v, n)** | Arredonda para n casas | `ROUND(valor, 2)` → `1500.01` |
| **ABS(v)** | Valor absoluto | `ABS(saldo)` → `1500` |
| **NUMBER(v)** | Converte para número | `NUMBER("1500")` → `1500` |
| **TEXT(v)** | Converte para texto | `TEXT(valor)` → `"1500"` |
| **FORMAT(v, fmt)** | Formata string/data | `FORMAT(data,"DD/MM")` → `"15/05"` |
| **JSONSTR(v)** | Serializa objeto como string JSON | `JSONSTR(divida)` → `{"valor":1500}` |
| **IF(cond, then, else)** | Condicional ternário | `IF(status=="ATIVA","Sim","Não")` → `"Sim"` |
| **DEFAULT(v, fallback)** | Valor padrão se nulo/indefinido | `DEFAULT(obs, "—")` → `"—"` |
| **COALESCE(v1, v2, ...)** | Primeiro valor não nulo | `COALESCE(email, telefone, "sem contato")` |

#### Sintaxe

```
expressão     = função | dotNotation | literal
função        = NOME_FUNÇÃO "(" argumento ("," argumento)* ")"
argumento     = expressão | stringLiteral | numberLiteral
dotNotation   = CAMPO ("." CAMPO)*
literal       = stringLiteral | numberLiteral | booleanLiteral
stringLiteral = '"' texto '"' | "'" texto "'"
numberLiteral = inteiro | decimal
booleanLiteral = true | false
```

#### Exemplos práticos

| Contexto | Expressão | Response | Resultado |
|---|---|---|---|
| Nome em maiúsculas para exibição | `UPPER(cliente.nome)` | `{"cliente":{"nome":"joão"}}` | `"JOÃO"` |
| Valor com 2 casas decimais | `ROUND(divida.valor, 2)` | `{"divida":{"valor":1500.009}}` | `1500.01` |
| Label legível para status | `IF(divida.status=="ATIVA","Em débito","Regular")` | `{"divida":{"status":"ATIVA"}}` | `"Em débito"` |
| Nome padronizado (capitalizado) | `PROPER(TRIM(cliente.nome))` | `{"cliente":{"nome":"  joão "}}` | `"João"` |
| Data formatada para WhatsApp | `FORMAT(dataVencimento, "DD/MM/YYYY")` | `{"dataVencimento":"2026-06-10"}` | `"10/06/2026"` |
| Valor padrão para campo opcional | `DEFAULT(observacao, "Sem observação")` | `{"observacao":null}` | `"Sem observação"` |
| Objeto completo como JSON | `JSONSTR(divida)` | `{"divida":{"valor":1500,"status":"ATIVA"}}` | `'{"valor":1500,"status":"ATIVA"}'` |
| Contato prioritário | `COALESCE(email, telefone, "sem contato")` | `{"telefone":"21999999999"}` | `"21999999999"` |

#### Implementação no backend

```javascript
// server/lib/expressionParser.js
// Processa expressões como:
//   "boleto.codigo"           → response.boleto.codigo
//   "UPPER(cliente.nome)"     → response.cliente.nome.toUpperCase()
//   "ROUND(divida.valor, 2)"  → Math.round(response.divida.valor * 100) / 100
//   "IF(status=='ATIVA','sim','não')" → condicional

function evaluateExpression(expression, responseData) {
  // 1. Se é dot notation pura (sem função), extrai direto
  if (!expression.includes('(')) {
    return getByDotNotation(expression, responseData)
  }

  // 2. Parseia função: NOME(args)
  const match = expression.match(/^(\w+)\((.+)\)$/)
  if (!match) return null

  const fnName = match[1].toLowerCase()
  const argsRaw = parseArguments(match[2])

  // 3. Resolve argumentos (recursivo: suporta COMPOSTO(
  const args = argsRaw.map(arg => {
    if (arg.includes('(')) return evaluateExpression(arg, responseData)
    if (isDotNotation(arg)) return getByDotNotation(arg, responseData)
    return parseLiteral(arg)
  })

  // 4. Executa a função
  return TRANSFORM_FUNCTIONS[fnName](...args)
}
```

### Limitação importante

Não é possível mapear um **objeto ou array inteiro** como outArgument — apenas valores escalares. Para um response com objetos aninhados, o operador mapeia cada campo individualmente via dot notation:

```
response:              outArgument:
boleto.codigo     →    codigoBoleto    (text)
boleto.url        →    urlBoleto       (text)
boleto.vencimento →    vencimentoBol   (date)
divida.valor      →    valorDivida     (number)
divida.status     →    statusDivida    (text)
```

---

## 10. Segurança — JWT

O SFMC assina **todas** as requisições para endpoints da Custom Activity com um JWT usando o **App Signing Secret** do Installed Package.

### Verificação no servidor

```javascript
// server/middleware/jwtVerify.js
const jwt = require('jsonwebtoken')

module.exports = function jwtVerify(req, res, next) {
  const body = req.body

  // O SFMC envia o JWT no campo jwtToken do body
  const token = body.jwtToken
  if (!token) {
    return res.status(401).json({ error: 'JWT ausente' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.jwtPayload = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'JWT inválido' })
  }
}
```

### Configuração no Cloud Run

O `JWT_SECRET` **não** é configurado como variável de ambiente plain text. É armazenado no **GCP Secret Manager** e montado no container:

```yaml
# .gitlab-ci.yml
deploy:
  script:
    - gcloud run deploy jb-http-activity
        --set-secrets JWT_SECRET=jb-http-activity-jwt:latest
```

---

## 11. Autenticação com APIs Externas

### Lógica do execute com status code

```javascript
// server/routes/execute.js (lógica central)
const response = await httpClient.request(config)

const statusCode  = response.status
const statusClass = `${Math.floor(statusCode / 100)}xx`
const isSuccess   = statusCode >= 200 && statusCode < 300

const outArgs = {
  // built-in — sempre presentes
  httpStatusCode:  statusCode,
  httpStatusClass: statusClass,
  httpSuccess:     isSuccess,

  // configurados pelo operador via responseMapper
  ...responseMapper.extract(response.data, config.responseMapping)
}

if (!config.treatErrorsAsOutput && !isSuccess) {
  // Toggle OFF: falha real — JB retira o contato do fluxo
  return res.status(500).json({ error: `HTTP ${statusCode} da API externa` })
}

// Toggle ON ou sucesso: retorna sempre 200 ao JB com todos os outArgs
return res.status(200).json(outArgs)
```

### Fluxo OAuth 2.0 Client Credentials

```javascript
// server/lib/authHandler.js
async function resolveAuth(authConfig) {
  if (authConfig.type === 'none') {
    return {}
  }

  if (authConfig.type === 'bearer') {
    return { Authorization: `Bearer ${authConfig.token}` }
  }

  if (authConfig.type === 'oauth2_client_credentials') {
    const { tokenUrl, clientId, clientSecret, scope } = authConfig

    const response = await axios.post(tokenUrl, null, {
      params: {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        ...(scope ? { scope } : {})
      }
    })

    return { Authorization: `Bearer ${response.data.access_token}` }
  }
}
```

> **Nota sobre cache de token OAuth2:** A implementação inicial fará um request de token a cada chamada `/execute`. Se o volume de contatos for alto, implementar cache em memória com expiração baseada no `expires_in` do response.

---

## 12. Deploy — GCP Cloud Run

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm ci --only=production

# Copia build do Vue.js
COPY dist/ ./dist/

# Copia servidor
COPY server/ ./server/
COPY public/ ./public/

EXPOSE 8080
ENV PORT=8080

CMD ["node", "server/index.js"]
```

### Pipeline GitLab CI/CD

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

variables:
  IMAGE: europe-west1-docker.pkg.dev/prefeitura-rj/czrm/jb-http-activity:$CI_COMMIT_SHA
  REGION: us-east1
  SERVICE: jb-http-activity

build:
  stage: build
  image: node:20-alpine
  script:
    - npm ci
    - npm run build        # Vite build → /dist
  artifacts:
    paths:
      - dist/

docker:
  stage: build
  needs: [build]
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker build -t $IMAGE .
    - docker push $IMAGE

deploy:
  stage: deploy
  image: google/cloud-sdk:alpine
  only:
    - main
  script:
    - gcloud run deploy $SERVICE
        --image $IMAGE
        --region $REGION
        --platform managed
        --allow-unauthenticated
        --set-secrets JWT_SECRET=jb-http-activity-jwt:latest
        --memory 256Mi
        --cpu 1
        --min-instances 0
        --max-instances 10
        --timeout 120
    # Sink Cloud Logging → BigQuery (idempotente)
    - gcloud logging sinks describe jb-http-activity-bq-sink --quiet 2>/dev/null ||
      gcloud logging sinks create jb-http-activity-bq-sink
        "bigquery.googleapis.com/projects/$PROJECT_ID/datasets/jb_http_activity_logs"
        --log-filter="resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE"
```

### Variáveis de ambiente

| Variável | Origem | Descrição |
|---|---|---|
| `JWT_SECRET` | GCP Secret Manager | App Signing Secret do Installed Package |
| `PORT` | Cloud Run (automático) | Porta do servidor (default 8080) |
| `NODE_ENV` | pipeline | `production` em produção |

---

## 13. SFMC — Installed Package

### Passo a passo de configuração

1. **Setup → Platform Tools → Apps → Installed Packages → New**

2. Preencher:
   - Nome: `jb-http-activity`
   - Descrição: `Custom Activity genérica para chamadas HTTP no Journey Builder`

3. **Add Component → Journey Builder Activity** (único componente necessário)
   - Name: `HTTP Request`
   - Key: *(gerado automaticamente — copiar para `config.json`)*
   - Description: `Nó genérico de chamadas HTTP`
   - Endpoint URL: `https://jb-http-activity-xxxx.run.app`
   - Category: `Custom` (ou `Flow Control`)
   - Copiar o **Unique Key** gerado → substituir em `config.json > configurationArguments.applicationExtensionKey`

4. **Copiar o App Signing Secret** da página principal do pacote → salvar no GCP Secret Manager como `jb-http-activity-jwt`

5. Salvar e verificar que a atividade aparece no Journey Builder canvas

---

## 14. Logging e Dashboard

A aplicação não armazena logs em banco próprio. O ecossistema **Cloud Logging + BigQuery + Looker Studio** oferece todo o ciclo de auditoria e visualização sem código extra.

### Fluxo de dados

```
[Contato passa pelo nó → /execute]
         │
         ▼
[Cloud Run: stdout com structured JSON]
  Ex: {"severity":"INFO","httpStatus":200,"duration":247,"url":"/divida","method":"POST","contactKey":"00Q5g..."}
         │
         ▼ automático (nativo do Cloud Run)
[Cloud Logging]
         │
         ▼ sink (configurado 1 vez)
[BigQuery — dataset jb_http_activity_logs]
         │
         ▼
[Looker Studio Dashboard]
```

### Estrutura de log (stdout da aplicação)

```javascript
// server/lib/structuredLogger.js
const logger = {
  info: (data) => {
    console.log(JSON.stringify({
      severity: 'INFO',
      timestamp: new Date().toISOString(),
      ...data
    }))
  },
  error: (data) => {
    console.error(JSON.stringify({
      severity: 'ERROR',
      timestamp: new Date().toISOString(),
      ...data
    }))
  }
}
```

Cada chamada ao `/execute` loga um JSON como:

```json
{
  "severity": "INFO",
  "timestamp": "2026-05-25T18:55:00.000Z",
  "journeyId": "d86d04f8-590e-4c88-b8a7-b5d80438a286",
  "contactKey": "00Q5g000001XyZA",
  "method": "POST",
  "url": "api.pgm.rio/divida/123",
  "httpStatus": 200,
  "durationMs": 247,
  "statusClass": "2xx",
  "success": true,
  "outArguments": {
    "codigoBoleto": "03399.18391",
    "statusDivida": "ATIVA"
  },
  "errorSummary": null
}
```

### Configuração do sink Cloud Logging → BigQuery

```bash
# Executar 1 vez após o deploy
gcloud logging sinks create jb-http-activity-bq-sink \
  bigquery.googleapis.com/projects/PROJECT_ID/datasets/jb_http_activity_logs \
  --log-filter="resource.type=cloud_run_revision AND resource.labels.service_name=jb-http-activity"
```

### Dashboard no Looker Studio

Após o sink estar ativo, o BigQuery popula automaticamente com os logs. O Looker Studio se conecta à tabela e monta:

```
┌─────────────────────────────────────────────┐
│  📊 Dashboard de Uso — jb-http-activity    │
│─────────────────────────────────────────────│
│                                             │
│  Chamadas totais          Últimos 30 dias    │
│  ┌──────────────────────────────────┐       │
│  │             12.847              │       │
│  └──────────────────────────────────┘       │
│                                             │
│  Status HTTP              Latência média    │
│  ┌────────────────────┐  ┌──────────────┐  │
│  │ 200     ██████ 87% │  │   247ms     │  │
│  │ 4xx     ██    12% │  └──────────────┘  │
│  │ 5xx     ▏     1%  │  P95: 890ms        │
│  └────────────────────┘                    │
│                                             │
│  Chamadas por endpoint (últimos 7 dias)    │
│  ┌──────────────────────────────────┐       │
│  │ api.pgm.rio/divida      8.902   │       │
│  │ api.pgm.rio/boleto      2.145   │       │
│  └──────────────────────────────────┘       │
│                                             │
│  Erros recentes                             │
│  ┌──────────────────────────────────┐       │
│  │ 25/05 14:23 503  api.pgm.rio     │       │
│  │ 25/05 14:22 404  api.pgm.rio     │       │
│  └──────────────────────────────────┘       │
└─────────────────────────────────────────────┘
```

### Custo estimado

| Serviço | Custo | Motivo |
|---|---|---|
| Cloud Logging | Grátis | 50GB/mês inclusos |
| BigQuery | ~$0/mês | 250MB/mês (~500k execuções) |
| Looker Studio | Grátis | |

**Total:** próximo de zero.

### Auditoria e compliance

Cada execução fica registrada com journeyId, contactKey e timestamp — permitindo rastrear o caminho de qualquer contato individual. Os dados no BigQuery são imutáveis (append-only) e retidos conforme política de retenção da tabela.

---

## 15. Estratégia de Testes e Validação

A validação é feita por camadas, eliminando dependências externas o máximo possível antes de envolver o SFMC real.

### Fase 1 — Backend Offline (sem SFMC, sem ngrok)

Servidor local em `http://localhost:3000`. Tudo testável com curl/PowerShell.

**Payload de teste para `/execute` (usando JSONPlaceholder como mock de API externa):**

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
  "inArguments": [
    { "method": "POST" },
    { "url": "https://jsonplaceholder.typicode.com/posts" },
    { "headers": [{"key":"Content-Type","value":"application/json"}] },
    { "body": "{\"title\":\"teste\",\"userId\":1}" },
    { "auth": {"type":"none"} },
    { "responseMapping": [
        {"expression":"id","outputName":"postId","type":"number"},
        {"expression":"UPPER(title)","outputName":"titleMaiusc","type":"text"}
    ]},
    { "treatErrorsAsOutput": false },
    { "timeout": 30000 }
  ]
}'
```

Em modo dev, desabilitar validação JWT via `JWT_DISABLED=true`.

**O que testar em cada módulo:**

| Módulo | Teste | Ferramenta |
|---|---|---|
| `POST /execute` | Enviar payload simulado, verificar outArguments | curl / `Invoke-RestMethod` |
| **expressionParser** | `UPPER(x)`, `ROUND(x,2)`, `IF(cond,v,f)`, `PROPER(x)`, `FORMAT(x,"DD/MM")` | Teste unitário (`npm test`) |
| **responseMapper** | Mockar response da API, verificar extração + transformação | Teste unitário |
| **authHandler** | Testar None, Bearer, OAuth2 Client Credentials | Teste unitário + curl |
| **JWT verify** | Sem JWT → 401; JWT inválido → 401; JWT válido → 200 | Script local |
| **structuredLogger** | Verificar stdout JSON estruturado | `npm test` |
| **httpClient** | GET em API pública (jsonplaceholder, viacep) | curl |
| **Endpoints lifecycle** | `POST /validate`, `/publish`, `/save`, `/stop` — 200 | curl |

### Fase 2 — Frontend Offline (Vue sem backend)

```bash
npm run dev:client  # → http://localhost:5173
```

**Mock do Postmonger** — substitui comunicação real com o JB por dados simulados:

```javascript
// src/dev/postmonger-mock.js
if (import.meta.env.DEV) {
  window.Postmonger = {
    Session: function() {
      let handlers = {}
      return {
        trigger: function(event, data) {
          console.log('[Mock] trigger:', event, data)
          if (event === 'ready') {
            setTimeout(() => {
              if (handlers.initActivity) handlers.initActivity({
                name: 'Minha Activity',
                metaData: { isConfigured: false },
                arguments: { execute: { inArguments: [] } }
              })
            }, 500)
            setTimeout(() => {
              if (handlers.requestedSchema) handlers.requestedSchema({
                schema: [
                  { key: 'Contact.Key' },
                  { key: 'Contact.Attribute.DE.CPF' },
                  { key: 'Contact.Attribute.DE.NOME' }
                ]
              })
            }, 800)
          }
        },
        on: function(event, cb) { handlers[event] = cb }
      }
    }
  }
}
```

**O que testar em cada componente:**

| Componente | Teste |
|---|---|
| **ActivityName.vue** | Input reflete valor, persiste no payload |
| **TabRequest.vue** | Dropdown método, URL, tabela headers/params, body, content-type, toggle |
| **KeyValueEditor.vue** | Adicionar/remover linhas, editar valores |
| **BodyEditor.vue** | Digitar JSON, validação, content-type dropdown |
| **TabAuth.vue** | Alternar None/Bearer/OAuth2, formulários |
| **TabResponse.vue** | Tabela de expressões, add/remover, FunctionHelperModal, botão de teste |
| **VariablePicker.vue** | Dropdown com dados mockados do Entry Source |

### Fase 3 — Integração Local + ngrok (sem GCP)

```bash
# Terminal 1
npm start  # → localhost:3000
# Terminal 2
ngrok http 3000  # → https://xxxx.ngrok.io
```

Registrar URL no **SFMC Sandbox**:

```
Setup → Installed Packages → jb-http-activity
  → editar Journey Builder Activity
  → Endpoint URL: https://xxxx.ngrok.io
```

> **Limitação:** ngrok free muda a URL a cada reinício. Para sessões longas de teste, usar plano pago (~$5/mês) ou subir Cloud Run de staging (1h de deploy).

### Fase 4 — Teste End-to-End (SFMC Sandbox)

Com a URL pública (ngrok ou Cloud Run) apontando para o SFMC:

1. **Criar Data Extension de teste** com campos: CPF, NOME, TELEFONE, TOKEN
2. **Inserir 1 registro** de teste
3. **Criar jornada** com Entry Source = DE de teste
4. **Arrastar a Custom Activity** para o canvas
5. **Configurar o nó** com método, URL, headers, mapeamento de response
6. **Adicionar Decision Split nativo** lendo `{{Interaction.HTTP-1.httpStatusCode}}`
7. **Adicionar atividade de saída** (ex: Update Contact, email de teste)
8. **Ativar jornada** em modo teste
9. **Verificar logs** (aba Logs da activity + Cloud Logging + BigQuery)

### Ordem recomendada

```
Fase 1 (backend offline) → testa 90% do backend
    ↓
Fase 2 (frontend offline) → paralelo com Fase 1
    ↓ ambos OK
Fase 3 (ngrok) → expõe local para o SFMC
    ↓
Fase 4 (SFMC Sandbox) → validação final
    ↓
Deploy Cloud Run + sink BigQuery
```

### Script de teste do backend

```javascript
// test/execute.test.js
const assert = require('assert')
const http = require('http')

const BASE = 'http://localhost:3000'

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data)
    const req = http.request(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
    }, res => {
      let chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString()) })
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

describe('/execute', function() {
  it('deve retornar 200 com outArguments para GET simples', async function() {
    const { status, data } = await post('/execute', {
      inArguments: [
        { method: 'GET' },
        { url: 'https://jsonplaceholder.typicode.com/todos/1' },
        { headers: [] }, { body: '' },
        { auth: { type: 'none' } },
        { responseMapping: [
          { expression: 'title', outputName: 'titulo', type: 'text' },
          { expression: 'UPPER(title)', outputName: 'maiusc', type: 'text' }
        ]},
        { treatErrorsAsOutput: false, timeout: 30000 }
      ]
    })
    assert.strictEqual(status, 200)
    assert.ok(data.titulo)
    assert.strictEqual(data.maiusc, data.titulo.toUpperCase())
    assert.ok(data.httpStatusCode)
  })

  it('deve retornar 200 com httpSuccess=false quando toggle ativo e API 404', async function() {
    const { status, data } = await post('/execute', {
      inArguments: [
        { method: 'GET' },
        { url: 'https://jsonplaceholder.typicode.com/todos/99999' },
        { headers: [] }, { body: '' },
        { auth: { type: 'none' } },
        { responseMapping: [] },
        { treatErrorsAsOutput: true, timeout: 30000 }
      ]
    })
    assert.strictEqual(status, 200)
    assert.strictEqual(data.httpStatusCode, 404)
    assert.strictEqual(data.httpSuccess, false)
  })
})
```

```bash
# Rodar
npm test
# Com cobertura
npx c8 npm test
```

---

## 17. Desenvolvimento Local

### Setup

```bash
# 1. Clonar o repositório
git clone git@gitlab.prefeitura.rio:czrm/jb-http-activity.git
cd jb-http-activity
git clone git@gitlab.prefeitura.rio:czrm/jb-http-activity.git
cd jb-http-activity

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env e adicionar JWT_SECRET

# 4. Build do frontend Vue.js
npm run build

# 5. Iniciar servidor
npm start
# Servidor rodando em http://localhost:3000

# 6. Em outro terminal, expor via ngrok
ngrok http 3000
# Copiar a URL HTTPS gerada: https://xxxx.ngrok.io
```

### Atualizar o Installed Package no SFMC

Após obter a URL do ngrok:

1. Setup → Installed Packages → `jb-http-activity`
2. Editar o componente Journey Builder Activity
3. Atualizar **Endpoint URL** para `https://xxxx.ngrok.io`
4. Atualizar as URLs em `public/config.json` para `https://xxxx.ngrok.io`
5. Salvar

> **Atenção:** a URL do ngrok muda a cada reinício (no plano free). Para desenvolvimento contínuo, considerar o plano pago do ngrok ou usar um domínio fixo no Cloud Run de staging.

### Modo desenvolvimento (hot reload)

```bash
# Terminal 1 — backend com nodemon
npm run dev:server

# Terminal 2 — frontend Vue com Vite HMR
npm run dev:client
```

---

## 18. Fases de Implementação

### Cronograma com desenvolvimento assistido por IA

| Fase | Entregável | Manual | **Com IA** | Detalhes |
|---|---|---|---|---|
| **1** | Backend: Express + JWT verify + `/execute` + Axios + `expressionParser.js` (16 funções) + `responseMapper.js` + `structuredLogger.js` + outArgs built-in + toggle | 2.5 dias | **1.5 dia** | Boilerplate gerado rápido; expressionParser demanda testes das 16 funções |
| **2** | Lifecycle endpoints (`/validate`, `/publish`, `/save`, `/stop`) + Dockerfile | 0.5 dia | **0.25 dia** | Roteiro padrão, IA gera quase pronto |
| **3** | Frontend: ActivityName + TabRequest (MethodSelect, UrlInput, VariablePicker, KeyValueEditor, BodyEditor, content-type, toggle) | 2 dias | **1 dia** | Componentes gerados rápido; VariablePicker com Postmonger ajuste fino |
| **4** | Frontend: TabAuth + TabResponse (mapeamento com expressões + FunctionHelperModal + teste + preview) + TabLogs | 2.5 dias | **1.5 dia** | ResponseMapping + FunctionHelperModal mais complexos; preview do response demanda parsing |
| **5** | `config.json` + Postmonger integration + schema dinâmico de outArguments | 1.5 dias | **1 dia** | Schema dinâmico via `updateActivity` é crítico — define se outArgs aparecem no JB |
| **6** | GitLab CI/CD + Cloud Run deploy + Secret Manager + Installed Package + BigQuery sink | 1 dia | **0.5 dia** | Infraestrutura é configural, não código |
| **7** | Teste end-to-end com SFMC sandbox + case Dívida Ativa | 1 dia | **1 dia** | **Não acelera**: deploy, Installed Package, DE de teste, jornada, ativação, injeção de contato e verificação são manuais |

**Total manual:** ~11 dias úteis
**Total com IA:** **~6.75 dias úteis**

> As fases 3 e 4 (frontend) são as que mais ganham com IA. A fase 7 (testes) não encurta porque depende de ciclos de validação no SFMC real que independem da geração de código.

### Fases futuras (pós-MVP)

| Fase | Feature | Prioridade |
|---|---|---|
| **8** | Sistema de templates (salvar/carregar configurações completas, compartilhadas por BU) | Média |
| **9** | Dashboard de uso com métricas de execução dos nós (total calls, erros, latência) | Baixa |

---

## 19. Limitações e Considerações

### Timeout

O Journey Builder impõe um timeout **máximo de 100 segundos** por chamada ao `/execute`. APIs externas lentas precisam de tratamento:

- Configurar `timeout` na atividade abaixo do limite do JB
- Usar `retryCount` com cuidado em APIs com operações de escrita (risco de duplicação)

### Idempotência

Quando `retryCount > 0`, o JB pode chamar o `/execute` mais de uma vez para o mesmo contato. O servidor inclui na resposta os campos `activityId` e `definitionInstanceId` que identificam unicamente a tentativa. APIs de escrita (POST/PUT) devem implementar idempotência no lado do serviço externo.

### Arrays no response

Não é possível mapear arrays completos como outArguments. Para listas, mapear campos específicos de índices fixos:

```
items[0].id    →    primeiroItemId
items[0].valor →    primeiroItemValor
```

### Tipo `date` em Decision Splits

Há um bug histórico no JB onde comparações de campos do tipo `date` em Decision Splits nativos podem falhar. Recomendação: mapear datas como `text` e fazer a comparação como string no formato `YYYY-MM-DD`.

### Códigos de erro despadronizados

APIs que retornam 200 com corpo de erro (ex: `{"success": false, "code": "ERR_001"}`) podem ser tratadas de duas formas:

1. **Via `httpSuccess`**: sempre será `true` pois o HTTP status é 200 — não confiável para esse padrão
2. **Via mapeamento de campo do body**: mapear `success` → `apiSuccess` (boolean) ou `code` → `apiCode` (text) e usar no Decision Split

> Quando a API é despadronizada, prefira mapear um campo do próprio body como indicador de sucesso em vez de depender do status HTTP.

### Volume e performance

O JB pode processar entre 20.000 e 5.000.000 contatos/hora dependendo da infraestrutura do tenant. O Cloud Run escala automaticamente para absorver picos. Para APIs externas que não suportam alta concorrência, usar `concurrentRequests` no `config.json` para limitar o paralelismo.

### Client Secret em inArguments

As credenciais OAuth2 configuradas na UI trafegam nos `inArguments` do JB. O SFMC criptografa o payload com o JWT, mas o Client Secret estará em texto no banco do JB. Para ambientes com requisitos de segurança elevados, considerar armazenar secrets no Secret Manager e referenciá-los por nome na UI (o servidor resolve o valor antes de fazer a chamada).

---

## 20. Exemplo — Case Dívida Ativa

### Jornada completa

```
[Entry Source: DE "Contribuintes_Divida_Ativa"]
Campos: CPF, NOME, TELEFONE
         │
         ▼
┌─────────────────────────────┐
│  🔗 Consulta Dívida PGM    │
│  GET                        │
│  api.pgm.rio/divida/{{CPF}} │
│  Auth: Bearer {{TOKEN}}     │
│  outArgs:                   │
│    statusDivida (text)      │
│    valorDivida  (number)    │
│    codigoCliente (text)     │
└─────────────────────────────┘
         │
         ▼
[Decision Split nativo]
"statusDivida" = "ativa"
    │ Sim              │ Não
    ▼                  ▼
┌────────────┐    ┌──────────────────────┐
│Gera Boleto │    │WhatsApp: sem dívida  │
└────────────┘    └──────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│  🔗 Gera Boleto PGM                     │
│  POST                                    │
│  api.pgm.rio/boleto                      │
│  Auth: Bearer {{TOKEN}}                  │
│  Body:                                   │
│  {                                       │
│    "codigoCliente":                      │
│      "{{Interaction.HTTP-1.codCliente}}",│
│    "canal": "whatsapp"                   │
│  }                                       │
│  outArgs:                                │
│    codigoBoleto (text)                   │
│    urlBoleto    (text)                   │
│    vencimento   (text)                   │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  WhatsApp (HSM)                          │
│  "Olá {{NOME}}, sua dívida é de         │
│  R$ {{Interaction.HTTP-1.valorDivida}}.  │
│  Pague via: {{Interaction.HTTP-2.urlBol}}│
│  Venc.: {{Interaction.HTTP-2.vencimento}}│
└──────────────────────────────────────────┘
```

### Config do nó "Consulta Dívida PGM"

| Campo | Valor |
|---|---|
| Nome | Consulta Dívida PGM |
| Método | GET |
| URL | `https://api.pgm.rio/v1/divida/{{Contact.Attribute.Contribuintes_Divida_Ativa.CPF}}` |
| Auth | Bearer `{{Contact.Attribute.Contribuintes_Divida_Ativa.TOKEN}}` |
| Tratar erros como saída | **ON** |
| Mapeamento | `divida.status` → `statusDivida` (text) |
| Mapeamento | `divida.valor` → `valorDivida` (number) |
| Mapeamento | `cliente.codigo` → `codigoCliente` (text) |
| Mapeamento | `error.code` → `errorCode` (text) |
| Timeout | 30000ms |
| Tentativas | 2 |

### Decision Split após "Consulta Dívida PGM"

| Critério | Branch | Próximo passo |
|---|---|---|
| `httpStatusCode` = 200 | Sucesso | Nó "Gera Boleto" |
| `httpStatusCode` = 404 | CPF não encontrado | WhatsApp: "CPF não cadastrado" |
| `httpStatusCode` = 422 | Erro de validação | WhatsApp: `{{HTTP-1.errorCode}}` |
| `httpSuccess` = false | Falha genérica | WhatsApp: "serviço indisponível" |

---

## 21. Referências

### Documentação oficial Salesforce

- [Build Custom Activities and Events](https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/creating-activities.html)
- [Custom Activity Configuration (config.json)](https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/custom-activity-config.html)
- [How Data Binding Works](https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/how-data-binding-works.html)
- [Custom Activity UI](https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/custom-activity-ui.html)
- [Postmonger Events Reference](https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/using-postmonger.html)
- [Define a Custom Split Activity](https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/extending-activities.html)
- [Encode Custom Activities Using JWT](https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/encode-custom-activities-using-jwt.html)

### Repositórios de referência

- [salesforce-marketingcloud/sfmc-example-jb-custom-activity](https://github.com/salesforce-marketingcloud/sfmc-example-jb-custom-activity) — exemplos oficiais (arquivado 2024)
- [greenpeace/gpea-sfmc-journey-builder-custom-activity-sample](https://github.com/greenpeace/gpea-sfmc-journey-builder-custom-activity-sample) — Custom Activity + Decision Split
- [beau32/JB-Restful-Activity](https://github.com/beau32/JB-Restful-Activity) — referência de conceito para HTTP genérico
- [yusrimathews/mc-journey-activity](https://github.com/yusrimathews/mc-journey-activity) — template Vue.js + Postmonger

### Produtos avaliados e descartados

- [sfmc-postman.com](https://www.sfmc-postman.com) — SaaS pago (€100/mês), código fechado. Produto mantido por Justin Stavasius (CloudRelay / Digital Wave Labs), com 4 abas de configuração, templates compartilhados, sem tratamento de erros HTTP como saída e sem suporte nativo a OAuth 2.0
- [salesforce-marketingcloud/sfmc-postman](https://github.com/salesforce-marketingcloud/sfmc-postman) — coleção Postman para APIs do SFMC, não é Custom Activity
- [forcedotcom/postman-salesforce-apis](https://github.com/forcedotcom/postman-salesforce-apis) — coleção Postman para APIs da plataforma Salesforce, não é Custom Activity

### Análise do concorrente (SFMC Postman / CloudRelay)

Os 4 vídeos do canal [@sfmc-postman9135](https://youtube.com/@sfmc-postman9135) foram analisados pelo Gemini 2.0 Flash (análise visual + auditiva). O relatório completo está em `sfmc-postman-analysis-report.md`.

**Principais conclusões:**

| Aspecto | SFMC Postman | jb-http-activity (nosso) | Vantagem |
|---|---|---|---|
| Auth OAuth 2.0 | ❌ Bearer manual | ✅ Nativo na UI | **Nossa** |
| Erro como saída | ❌ | ✅ toggle treatErrorsAsOutput | **Nossa** |
| HTTP status code built-in | ❌ (só Postman_Error) | ✅ httpStatusCode/class/success | **Nossa** |
| Preview response | ❌ | ✅ Aba Response | **Nossa** |
| Templates | ✅ compartilhados | ⏳ fase futura | Deles |
| Response transformation | ✅ "Code/OPTIONAL" com lambdas | ✅ expressionParser.js (16 funções) | **Nossa** |
| Dashboard | ✅ portal externo | ⏳ fase futura | Deles |
