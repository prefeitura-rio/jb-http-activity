# Progresso — jb-http-activity

## Fases

| Fase | Status | O que contém |
|---|---|---|
| **0** — Setup do Projeto | ✅ Completo | package.json, dirs, config.json, Dockerfile, .gitlab-ci.yml, vite.config.js, .gitignore |
| **1** — Backend Core | ✅ Completo | Express, JWT, expressionParser (16 funções), httpClient, authHandler (None/Bearer/OAuth2), responseMapper, structuredLogger, /execute, /validate, /publish, /save, /stop |
| **2** — Frontend Vue | ✅ Completo | ActivityName, 4 tabs (Request/Auth/Response/Logs), 5 shared components (KeyValueEditor, VariablePicker, BodyEditor, ResponseMapping, FunctionHelperModal), Postmonger mock, store compartilhado |
| **3** — Integração Local | ✅ Completo | Build + servidor testados juntos, UI funcional em localhost |
| **4** — ngrok + SFMC | ⏳ Parcial | ngrok instalado e configurado, tunnel funcional, aguardando config do Installed Package no SFMC |
| **5** — Cloud Run + CI/CD | ⬜ Pendente | Deploy no GCP, pipeline GitLab CI, Secret Manager, sink BigQuery |
| **6** — Teste E2E | ⬜ Pendente | Jornada real no SFMC Sandbox, validação com case Dívida Ativa |

## Testes

| Tipo | Status | Resultado |
|---|---|---|
| Testes unitários (mocha) | ✅ Passando | 40/40 testes |
| Backend offline (curl) | ✅ OK | /health, /execute (GET, POST, 404 com toggle), lifecycle endpoints |
| Frontend offline (Vite) | ✅ OK | Build sem erros, UI funcional |
| ngrok tunnel | ✅ OK | URL: `https://nanometer-fading-grimy.ngrok-free.dev` |
| Teste no SFMC | ⬜ Pendente | Aguardando criação do Installed Package |

## Commits

| Hash | Mensagem |
|---|---|
| `13a723d` | feat: backend core completo |
| `8ea47da` | feat: frontend completo |
| `0fc3c50` | feat: ngrok tunnel + scripts |
| `b70ea15` | fix: v-if p/ v-show nas tabs |
| `8e6e4c2` | feat: store compartilhado + preview real |
| `808f849` | chore: .gitignore atualizado |

## O que falta para o MVP

1. **Criar Installed Package no SFMC** com a URL do ngrok
2. **Copiar Unique Key** → colar no `public/config.json`
3. **Copiar App Signing Secret** → configurar como `JWT_SECRET`
4. **Fazer deploy no Cloud Run** (quando tiver acesso GCP)
5. **Configurar sink Cloud Logging → BigQuery** (1 vez)
6. **Teste E2E** com jornada real no SFMC
