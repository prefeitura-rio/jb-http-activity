# Resumo das Mudanças — jb-http-activity

## Do commit do Fernando até agora

---

## 🏗️ Infraestrutura e Deploy

- **GKE no lugar de Cloud Run** — aplicação vai rodar no cluster `application` (us-central1), não mais no Cloud Run
- **GitHub Actions no lugar de GitLab CI** — pipeline de build + push pra `ghcr.io/prefeitura-rio/jb-http-activity` + deploy via ArgoCD
- **GitHub Container Registry** — imagem Docker publicada em `ghcr.io/prefeitura-rio/jb-http-activity`
- **Infisical (SuperApp)** — `JWT_SECRET` será gerenciado pelo Infisical do SuperApp, não mais pelo GCP Secret Manager
- **Dockerfile multi-stage** — build do frontend dentro do próprio container, sem depender de pré-build
- **`.dockerignore`** — acelera o build ignorando `node_modules`, `.git`, etc
- **Container não roda mais como root** — adicionado `USER node` por segurança
- **Graceful shutdown** — trata `SIGTERM`/`SIGINT` pra fechar conexões graciosamente

---

## ☁️ BigQuery Logger

- **Novo módulo `bigQueryLogger.js`** — faz streaming insert direto na tabela `rj-crm-registry.jb_http_activity.logs`
- **Fire-and-forget** — não aumenta a latência do `/execute`
- **Fallback pra stdout** — se BigQuery falhar, o log cai no `structuredLogger`
- **Batching** — acumula até 100 linhas ou 10 segundos antes de enviar
- **Zero credenciais** — usa Workload Identity no GKE (ADC), sem chave no código

---

## 🐛 Correções de bugs

- **Auth não era salva** — a configuração de autenticação (Bearer, OAuth2) era perdida ao salvar porque o `App.vue` não conseguia ler os dados da aba Auth. Agora lê do `requestConfig` que já é mantido sincronizado.
- **Retry implementado de verdade** — antes os campos de "Retentativas" e "Delay" existiam na interface mas eram ignorados. Agora o `httpClient` faz um loop de tentativas com timeout e delay configuráveis.
- **`IF()` agora compara de verdade** — expressões como `IF(status=="ATIVA","sim","não")` funcionam corretamente. Antes a comparação não era implementada e sempre retornava o valor "verdadeiro".
- **Contador de tentativas no preview** — quando o retry acontece, o preview mostra quantas retentativas foram feitas (ex: `3 retentativas`)
- **Backend status no preview** — o preview agora mostra qual foi o status HTTP real da resposta do backend (200 vs 500), permitindo ver a diferença do toggle "Tratar erros HTTP como saída"

---

## 🖥️ Frontend

- **Vite proxy adicionado** — `npm run dev:client` + `npm run dev:server` funcionam juntos, botão "Testar" funciona em desenvolvimento
- **Preview enriquecido** — timestamp, URL, duração, badge verde/vermelho, mapeamento, contagem de tentativas
- **TabLogs removida** — o conteúdo (preview de erro e retry) foi migrado pra TabResponse
- **URL lida do `config.json`** — não mais hardcoded no `App.vue`
- **Acentuação corrigida** — todos os textos da UI agora têm acentos (Funções, Lógica, Número, etc)
- **Rótulo "Tentativas" → "Retentativas"** — mais claro pro operador

---

## 🧪 Testes

- **40 → 67 testes** — adicionados testes de `authHandler` (12), `shouldRetry` (10), `bigQueryLogger` (5) e integração do `/execute` (4)
- **Testes de retry** — 503, 404, erro de rede, todas as tentativas exauridas
- **Testes de auth** — None, Bearer, OAuth2 com escopo e campos faltando

---

## 🧹 Cleanup

- **Scripts ngrok removidos** — `start.bat` e `start-ngrok.ps1` não fazem mais parte do repositório
- **`.gitlab-ci.yml` removido** — substituído por GitHub Actions
- **`.opencode/docs/discovery` removido do repositório** — mantido apenas localmente
- **Extension Key vai via `--build-arg`** — não mais hardcoded no `config.json`, cada ambiente (staging/prod) usa sua própria chave

---

## 🏗️ Ambiente de Staging (2 apps no Marketing Cloud)

### Estrutura no repositório

```
k8s/
├── staging/
│   ├── resources.yaml          # 1 réplica, domínio staging
│   ├── infisical-secret.yaml   # envSlug: staging
│   └── kustomization.yaml
└── prod/
    ├── resources.yaml          # 2 réplicas, domínio produção
    ├── infisical-secret.yaml   # envSlug: prod
    └── kustomization.yaml

.github/workflows/
├── deploy-staging.yaml         # push na branch staging
└── deploy-production.yaml      # push na branch main
```

### Fluxo de desenvolvimento

```
feature branch
        │ PR
        ▼
staging branch ──→ GitHub Actions ──→ GKE staging (1 réplica)
        │                                   │ testes via curl/Postman
        ▼                                   ▼
main branch ────→ GitHub Actions ──→ GKE produção (2 réplicas)
                                          │ jornadas reais SFMC
                                          ▼
                                        BigQuery
```

### 2 apps no Marketing Cloud

| Ambiente | SFMC Package | URL | Branch | Infisical |
|---|---|---|---|---|
| **Staging** | `jb-http-activity-staging` | `jb-http-activity.staging.pref.rio` | `staging` | `envSlug: staging` |
| **Produção** | `jb-http-activity` | `jb-http-activity.pref.rio` | `main` | `envSlug: prod` |

Cada Package tem seu próprio **App Signing Secret** (JWT_SECRET) e sua própria **Unique Key** (extension key), armazenados no Infisical com `envSlug` diferentes.

---

## Orientações pro Fernando testar no SFMC

### 1. Testar local

```bash
# Clonar o repositório atualizado
git clone https://github.com/prefeitura-rio/jb-http-activity.git
cd jb-http-activity

# Criar arquivo .env
copy .env.example .env
# Editar com: JWT_DISABLED=true

# Instalar e rodar
npm install
npm run dev:server

# Em outro terminal, subir ngrok
ngrok http 3000

# Pegar a URL gerada (ex: https://abc-123.ngrok-free.dev)
```

### 2. Atualizar o Installed Package no SFMC

No **Setup → Installed Packages → jb-http-activity**, trocar a **Endpoint URL** pela URL do ngrok.

### 3. Editar `public/config.json` localmente

Trocar `MUDAR_PELO_DOMINIO` pela URL do ngrok em todas as ocorrências.

### 4. O que testar no SFMC

- Arrastar a atividade pro canvas
- Nome da atividade persiste ao salvar
- Configurar método, URL, headers, body
- Testar autenticação (Bearer com token qualquer, OAuth2)
- Aba Response: mapeamento de campos, funções (UPPER, IF)
- Clicar em "Executar com dados de teste" e ver preview detalhado
- Testar toggle "Tratar erros HTTP como saída"
- Verificar se os `outArguments` aparecem nas atividades seguintes
- Salvar, publicar a jornada e testar com um contato real

### ⚠️ Cuidados

- **Não comitar** o `config.json` com a URL do ngrok — depois dos testes, reverter com `git checkout public/config.json`
- **Extension Key** atual: `6a37e17b-6b11-4340-8489-ca6843e3902a` (Package único por enquanto)
- **JWT** está com `useJwt: false` no `config.json` — em produção com Infisical, muda pra `true`

---

## 🔒 O que precisa do Fred

### Infraestrutura GKE

- **Namespace:** Criar `jb-http-activity` (prod) e `jb-http-activity-staging` (staging) no cluster `application`
- **ArgoCD Application:** Configurar `jb-http-activity` apontando pra `k8s/prod/` e `k8s/staging/` no repo
- **Domínio:** Liberar `jb-http-activity.pref.rio` e `jb-http-activity.staging.pref.rio` no ingress/Istio
- **Service Account GCP:** Criar `jb-http-activity-sa` com `BigQuery Data Editor` no dataset `rj-crm-registry.jb_http_activity`
- **Workload Identity:** Mapear KSA `jb-http-activity` → GSA `jb-http-activity-sa`

### Infisical (SuperApp)

- **Projeto:** Criar `jb-http-activity` no Infisical do SuperApp
- **Ambientes:** Configurar `prod` e `staging`
- **Machine Identity:** Criar Universal Auth e fornecer: `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, `INFISICAL_PROJECT_SLUG`
- **Secrets:** Adicionar `JWT_SECRET` com o App Signing Secret (tanto em prod quanto staging)

### GitHub Secrets (no repositório)

- `GCP_CREDENTIALS_JSON` — chave JSON da SA com acesso ao GKE cluster `application`
- `INFISICAL_CLIENT_ID` — Client ID da Machine Identity no Infisical
- `INFISICAL_CLIENT_SECRET` — Client Secret da Machine Identity no Infisical
- `INFISICAL_PROJECT_SLUG` — Slug do projeto no Infisical
- `SFMC_ACTIVITY_KEY_PRODUCTION` — Unique Key do Package de produção no SFMC
- `SFMC_ACTIVITY_KEY_STAGING` — Unique Key do Package de staging no SFMC
- `GCP_PROJECT_ID` (variable) — ID do projeto GCP do cluster
