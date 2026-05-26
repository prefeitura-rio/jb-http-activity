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
- Logs via Cloud Run → Cloud Logging → BigQuery → Looker Studio

## Architecture

```
Salesforce Marketing Cloud (Journey Builder)
       │ POST /execute
       ▼
GCP Cloud Run (jb-http-activity)
       │
       ├── Express server + JWT verify
       ├── httpClient (Axios) → external APIs
       ├── expressionParser (transform functions)
       └── responseMapper (dot notation + expressions)
       │
       ▼ stdout JSON
Cloud Logging → BigQuery → Looker Studio dashboard
```

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20 + Express |
| Frontend | Vue.js 3 + Vite |
| HTTP | Axios |
| iframe↔JB | Postmonger |
| Hosting | GCP Cloud Run |
| CI/CD | GitLab CI |
| Logs | Cloud Logging → BigQuery → Looker Studio |

## Project Structure

```
jb-http-activity/
├── server/          # Express backend (JWT, execute, lifecycle, expressionParser)
├── src/             # Vue.js 3 frontend (tabs: Request, Auth, Response, Logs)
├── public/          # config.json, postmonger.js, icons
├── test/            # Mocha tests
├── Dockerfile
├── .gitlab-ci.yml
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

## Documentation

Full technical specification: `jb-http-activity.md`
Analysis report: `sfmc-postman-analysis-report.md`
Mockups: `.opencode/docs/discovery/images/`

---

Built for Prefeitura do Rio — migração de broker Wetalkie para Salesforce Marketing Cloud.
