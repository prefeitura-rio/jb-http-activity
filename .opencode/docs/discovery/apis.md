# APIs — Referência de Testes

Documentação das APIs usadas nos testes do `jb-http-activity`.
Ambiente padrão: **homologação/staging**, salvo indicação contrária.

---

## Sumário

1. [Prefeitura Rio — Consulta Débitos](#1-prefeitura-rio--consulta-débitos)
2. [IDRio — OAuth2 Token (Client Credentials)](#2-idrio--oauth2-token-client-credentials)
3. [RMI — Atualizar Preferências de Notificação](#3-rmi--atualizar-preferências-de-notificação)
4. [RMI — Consultar Beta Status](#4-rmi--consultar-beta-status)

---

## 1. Prefeitura Rio — Consulta Débitos

| Campo        | Valor                                            |
|--------------|--------------------------------------------------|
| URL          | `https://services.pref.rio/mcp/consulta_debitos` |
| Método       | `POST`                                           |
| Autenticação | Nenhuma                                          |
| Content-Type | `application/json`                               |

**Body:**

```json
{
  "consulta_debitos": "cpfCnpj",
  "cpfCnpj": "<CPF_ou_CNPJ>"
}
```

**Resposta de exemplo (sem débitos):**

```json
{
  "api_resposta_sucesso": false,
  "api_descricao_erro": "Sua consulta não retornou débitos. Caso tenha realizado pelo nº da Execução Fiscal, talvez o sistema não possua todos os números em novo formato (CNJ)."
}
```

**Campos da resposta:**

| Campo                | Tipo    | Descrição                                      |
|----------------------|---------|------------------------------------------------|
| `api_resposta_sucesso` | boolean | `false` mesmo com HTTP 200 quando sem débitos |
| `api_descricao_erro` | string  | Mensagem descritiva do resultado               |

**Observações:**
- HTTP 200 não indica sucesso de negócio — verificar sempre `api_resposta_sucesso`
- Quando há débitos, presume-se `api_resposta_sucesso: true` com campos adicionais na resposta
- CPF de teste usado: `14202478754`

---

## 2. IDRio — OAuth2 Token (Client Credentials)

| Campo        | Valor                                                                                                          |
|--------------|----------------------------------------------------------------------------------------------------------------|
| URL          | `https://auth-idriohom.apps.rio.gov.br/auth/realms/idrio_cidadao/protocol/openid-connect/token`               |
| Método       | `POST`                                                                                                         |
| Autenticação | Nenhuma                                                                                                        |
| Content-Type | `application/x-www-form-urlencoded`                                                                            |
| Ambiente     | Homologação (`idriohom`)                                                                                       |

**Body (form-urlencoded):**

```
client_id=superapp.apps.rio.gov.br
client_secret=68b10779-2408-4ce4-bcef-b078852fd9d8
grant_type=client_credentials
scope=profile email
```

**Resposta de exemplo:**

```json
{
  "access_token": "<JWT RS256>",
  "refresh_token": "<JWT HS256>",
  "token_type": "bearer",
  "expires_in": 600,
  "refresh_expires_in": 1800,
  "scope": "profile email",
  "session_state": "6bdf9483-8b85-465e-8f25-895c2c4443c8",
  "not-before-policy": 1551122626
}
```

**Campos da resposta:**

| Campo                | Tipo   | Descrição                              |
|----------------------|--------|----------------------------------------|
| `access_token`       | string | JWT RS256 — usar como Bearer nas APIs autenticadas |
| `refresh_token`      | string | JWT HS256 — para renovar sem nova autenticação |
| `token_type`         | string | Sempre `bearer`                        |
| `expires_in`         | number | Expiração do access token em segundos (600 = 10 min) |
| `refresh_expires_in` | number | Expiração do refresh token em segundos (1800 = 30 min) |
| `scope`              | string | Escopos concedidos                     |
| `session_state`      | string | ID da sessão Keycloak                  |

**Observações:**
- Provedor: **Keycloak**, realm `idrio_cidadao`
- O `access_token` gerado é usado como `Authorization: Bearer <token>` nas APIs 3 e 4
- Token expira em **10 minutos** — gerar novo token antes de cada bateria de testes

**cURL equivalente:**

```bash
curl -X POST \
  https://auth-idriohom.apps.rio.gov.br/auth/realms/idrio_cidadao/protocol/openid-connect/token \
  -d "client_id=superapp.apps.rio.gov.br" \
  -d "client_secret=68b10779-2408-4ce4-bcef-b078852fd9d8" \
  -d "grant_type=client_credentials" \
  -d "scope=profile email"
```

---

## 3. RMI — Atualizar Preferências de Notificação

> Depende do `access_token` gerado pela [API 2](#2-idrio--oauth2-token-client-credentials).

| Campo        | Valor                                                                                                    |
|--------------|----------------------------------------------------------------------------------------------------------|
| URL          | `https://services.staging.app.dados.rio/rmi/v1/phone/{phoneNumber}/notification-preferences`            |
| Método       | `PUT`                                                                                                    |
| Autenticação | Bearer Token (access_token da API 2)                                                                     |
| Content-Type | `application/json`                                                                                       |
| Ambiente     | Staging                                                                                                  |

**Parâmetros de rota:**

| Parâmetro     | Descrição                                   | Exemplo         |
|---------------|---------------------------------------------|-----------------|
| `phoneNumber` | Número completo com DDI+DDD (sem `+`)        | `5521992132305` |

**Headers:**

```
Authorization: Bearer <access_token>
```

**Body:**

```json
{
  "opt_in": true,
  "channel": "whatsapp",
  "reason": "<motivo>",
  "category_opt_ins": {
    "citizen_life_journey": true,
    "real_time_city_update": true,
    "survey_feedback": true,
    "tribute_collection": false
  }
}
```

**Campos do body:**

| Campo                  | Tipo    | Descrição                                      |
|------------------------|---------|------------------------------------------------|
| `opt_in`               | boolean | Ativar (`true`) ou desativar (`false`) opt-in  |
| `channel`              | string  | Canal de notificação (ex: `whatsapp`)          |
| `reason`               | string  | Motivo da alteração (variável de contexto JB)  |
| `category_opt_ins`     | object  | Preferências por categoria                     |

**Categorias disponíveis (`category_opt_ins`):**

| Categoria               | Descrição                        |
|-------------------------|----------------------------------|
| `citizen_life_journey`  | Jornada de vida do cidadão       |
| `real_time_city_update` | Atualizações em tempo real       |
| `survey_feedback`       | Pesquisas de satisfação          |
| `tribute_collection`    | Cobranças/tributos               |
| `alerts`                | Alertas gerais                   |
| `courses`               | Cursos                           |
| `events`                | Eventos                          |
| `health`                | Saúde                            |
| `mei_opportunities`     | Oportunidades MEI                |
| `services`              | Serviços gerais                  |

**Resposta de exemplo:**

```json
{
  "phone_number": "5521992132305",
  "opt_in": true,
  "category_opt_ins": {
    "alerts": true,
    "citizen_life_journey": true,
    "courses": false,
    "events": false,
    "health": false,
    "mei_opportunities": false,
    "real_time_city_update": true,
    "services": false,
    "survey_feedback": true,
    "tribute_collection": false
  },
  "updated_at": "2026-05-26T22:56:45.351097767Z"
}
```

**Observações:**
- A resposta retorna **todas** as categorias, incluindo as não enviadas no body (default `false`)
- `reason` não é retornado na resposta
- `updated_at` em UTC ISO 8601
- No Journey Builder, `phoneNumber` vem de `{{ $input.CC_CHANNEL_ID }}`

---

## 4. RMI — Consultar Beta Status

> Depende do `access_token` gerado pela [API 2](#2-idrio--oauth2-token-client-credentials).

| Campo        | Valor                                                                                      |
|--------------|--------------------------------------------------------------------------------------------|
| URL          | `https://services.staging.app.dados.rio/rmi/v1/phone/{phoneNumber}/beta-status`           |
| Método       | `GET`                                                                                      |
| Autenticação | Bearer Token (access_token da API 2)                                                       |
| Ambiente     | Staging                                                                                    |

**Parâmetros de rota:**

| Parâmetro     | Descrição                                   | Exemplo         |
|---------------|---------------------------------------------|-----------------|
| `phoneNumber` | Número completo com DDI+DDD (sem `+`)        | `5521992132305` |

**Headers:**

```
Authorization: Bearer <access_token>
```

**Resposta de exemplo:**

```json
{
  "phone_number": "5521992132305",
  "beta_whitelisted": true,
  "group_id": "6913b816ce591ddbf38c764d",
  "group_name": "chatbot-matricula-escolar"
}
```

**Campos da resposta:**

| Campo              | Tipo    | Descrição                                         |
|--------------------|---------|---------------------------------------------------|
| `phone_number`     | string  | Número consultado                                 |
| `beta_whitelisted` | boolean | Se o número está na whitelist do beta             |
| `group_id`         | string  | ID do grupo beta ao qual o número pertence        |
| `group_name`       | string  | Nome do grupo (ex: `chatbot-matricula-escolar`)   |

**Observações:**
- No Journey Builder, `phoneNumber` vem de `{{ $input.CC_CHANNEL_ID }}`
- Usar para verificar elegibilidade antes de acionar fluxos beta
