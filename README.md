# jb-http-activity

Generic HTTP request node for Salesforce Marketing Cloud Journey Builder.

## Problem

Journey Builder lacks a native node for making arbitrary HTTP calls to external APIs. This project fills that gap — equivalent to the HTTP request node in N8N/WeFlow.

## What it does

- HTTP methods: GET, POST, PUT, PATCH, DELETE
- Dynamic headers, query params, body with Journey Builder data binding
- Auth: None, Bearer Token, OAuth 2.0 Client Credentials
- Response transformation via expressions (`UPPER`, `ROUND`, `IF`, `PROPER`, `FORMAT`, etc.)
- Dynamic outArgument mapping accessible in subsequent activities
- Built-in outArguments: `httpStatusCode`, `httpStatusClass`, `httpSuccess`
- Toggle "Treat HTTP errors as output" — 4xx/5xx can be routed via native Decision Split
- Content-Type dropdown: `application/json`, `form-urlencoded`, `multipart/form-data`
- Test button with response preview
- SSRF protection: private IP ranges blocked via DNS resolution
- `/preview` endpoint separated from `/execute` with its own safeguards
- Resource caps: timeout (40s), retry (3x), delay (5s)
- Logs via BigQuery streaming insert (`rj-crm-registry.jb_http_activity.logs`)

## Architecture

```
Salesforce Marketing Cloud (Journey Builder)
       │ POST /execute
       ▼
GKE (cluster application - us-central1)
       │
       ├── Express server + JWT verify
       ├── httpClient (Axios) → external APIs
 ├── expressionParser (transform functions)
 ├── responseMapper (dot notation + expressions)
 ├── blocklist (SSRF protection)
 └── bigQueryLogger (streaming insert)
       │
       ▼
BigQuery (rj-crm-registry.jb_http_activity.logs)
```

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 24 + Express + TypeScript |
| Frontend | Vue.js 3 + Vite |
| HTTP | Axios |
| iframe↔JB | Postmonger |
| Hosting | GKE |
| CI/CD | GitHub Actions → GHCR → ArgoCD |
| Secrets | Infisical (SuperApp) |
| Logs | BigQuery streaming insert |

## Project Structure

```
jb-http-activity/
├── server/          # Express backend (JWT, execute, lifecycle, expressionParser, bigQueryLogger)
├── src/             # Vue.js 3 frontend (tabs: Request, Auth, Response)
├── public/          # config.json, postmonger.js, icons
├── k8s/
│   ├── staging/      # Kubernetes manifests - staging (1 replica)
│   └── prod/         # Kubernetes manifests - production (2 replicas, KEDA, InfisicalSecret)
├── test/            # Mocha tests
├── .github/workflows/
│   ├── deploy-staging.yaml     # staging branch → GKE staging
│   └── deploy-production.yaml  # main branch → GKE production
├── Dockerfile
└── package.json
```

## Getting Started

```bash
npm install
npm run dev:server   # Backend hot reload (port 3000)
npm run dev:client   # Frontend hot reload (port 5173)
npm test             # Run tests
```

## Commit Convention

```
feat: new feature
fix: bug fix
refactor: code change without feature/fix
docs: documentation only
chore: tooling, dependencies, infra
```

Each phase of development should be committed independently for safety. Never commit secrets or API keys.

## Environments

| Ambiente | Branch | GKE | SFMC | Uso |
|---|---|---|---|---|
| Staging | `staging` | 1 replica | (opcional) Package separado | Testes com contatos internos |
| Production | `main` | 2 replicas + KEDA | Package oficial | Jornadas reais |

## Deploy

```bash
# Staging
git push origin staging     # → GitHub Actions → GKE staging

# Production
git push origin main        # → GitHub Actions → GKE production
```

---

Built for Prefeitura do Rio — migração de broker Wetalkie para Salesforce Marketing Cloud.
