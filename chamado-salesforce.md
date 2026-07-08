# Chamado Salesforce Support — Autenticação JWT em Custom Activities

## Assunto

Journey Builder Custom Activity — `useJwt: true` documentado para todos os endpoints, mas apenas `/execute` recebe JWT. Lifecycle endpoints e interface de preview/teste operam sem autenticação.

---

## Proposito da Custom Activity

Estamos desenvolvendo uma **Custom Activity REST** para Journey Builder que funciona como um **cliente HTTP genérico**. Seu propósito é permitir que profissionais de marketing configurem chamadas HTTP para APIs externas arbitrárias dentro de uma jornada no Journey Builder — equivalente funcional ao nó de HTTP Request do N8N.

A atividade recebe configurações como URL, método, headers, body, autenticação (None, Bearer Token, OAuth2 Client Credentials) e mapeamento de resposta, definidos pelo operador na interface de configuração da CA. Em execução (`/execute`), a atividade faz a chamada HTTP configurada e retorna os resultados como `outArguments` para as atividades seguintes da jornada.

Dado que esta atividade **executa chamadas HTTP arbitrárias para endpoints externos**, a autenticação e validação de identidade das requisições recebidas da SFMC é **crítica para segurança** — precisamos garantir que apenas a SFMC possa configurar e acionar estas chamadas.

---

## Configuração utilizada

```json
{
  "arguments": {
    "execute": {
      "url": "https://.../execute",
      "verb": "POST",
      "useJwt": true
    }
  },
  "configurationArguments": {
    "useJwt": true,
    "save": {
      "url": "https://.../save",
      "useJwt": true,
      "verb": "POST"
    },
    "validate": {
      "url": "https://.../validate",
      "useJwt": true,
      "verb": "POST"
    },
    "publish": {
      "url": "https://.../publish",
      "useJwt": true,
      "verb": "POST"
    },
    "stop": {
      "url": "https://.../stop",
      "useJwt": true,
      "verb": "POST"
    }
  }
}
```

---

## Comportamento observado (via ngrok inspect)

Testes realizados em ambiente staging com Installed Package dedicado. Utilizamos `ngrok inspect` (`http://127.0.0.1:4040`) para capturar headers e body completos de cada requisição enviada pela SFMC.

| Endpoint | Contexto | `useJwt` | Content-Type recebido | Header Authorization | Body contém JWT |
|----------|----------|----------|----------------------|---------------------|-----------------|
| `POST /execute` | Contato entra na jornada | `true` | `application/jwt` ✅ | Ausente (JWT é o body) | Body inteiro é o JWT |
| `POST /save` | Operador salva a jornada | `true` | `application/json` ❌ | Ausente ❌ | Ausente ❌ |
| `POST /validate` | Operador publica a jornada | `true` | `application/json` ❌ | Ausente ❌ | Ausente ❌ |
| `POST /publish` | Jornada é ativada | `true` | `application/json` ❌ | Ausente ❌ | Ausente ❌ |
| `POST /stop` | Jornada é parada | `true` | `application/json` ❌ | Ausente ❌ | Ausente ❌ |
| Interface de teste/preview | Botão "Testar" no iframe da CA | N/A | `application/json` | Ausente (chamada AJAX do navegador) | Ausente |

**Observação crítica:** Em todas as chamadas `application/json` (lifecycle endpoints e preview), **nenhum header `Authorization`** foi encontrado, **nenhum campo `jwt` ou `jwtToken`** no corpo da requisição, e **nenhum parâmetro de query** com token. O JWT está simplesmente ausente — não é uma questão de formato de transporte diferente.

**Payload recebido nos endpoints de lifecycle (`/validate` como exemplo):**

```json
{
  "activityObjectID": "d865d971-443f-4ccd-aedb-78d225c1c206",
  "interactionId": "eb62eb17-8a4d-4d6e-a94d-30775382cc28",
  "originalDefinitionId": "59e59f97-9a83-46b2-b46f-9c328a615298",
  "interactionKey": "TESTE-CA-HTTP-STAGING-WHATSAPP-20260623",
  "interactionVersion": "2"
}
```

Apenas metadados da jornada, **sem JWT, sem assinatura, sem qualquer token de autenticação**.

---

## Observação sobre o Preview/Teste na Interface

A Custom Activity é carregada dentro de um iframe no Journey Builder. A interface de configuração possui um botão **"Testar"** que permite ao operador validar a configuração antes de publicar a jornada.

Quando o operador clica em "Testar", o código JavaScript da CA (rodando no navegador do operador, dentro do iframe) faz uma chamada **AJAX direta para o servidor da atividade**. Esta chamada:

- **Não passa pelos servidores da SFMC** — é uma requisição direta do navegador para o endpoint da CA
- **Não possui JWT** — não há como o navegador obter ou possuir o App Signing Secret
- **Não possui Bearer token** — nenhum token de autenticação é fornecido pela SFMC nesse contexto
- **Content-Type**: `application/json` simples

Isso significa que o **único endpoint da atividade que recebe autenticação JWT é o `/execute`**. Todos os demais endpoints de lifecycle e a interface de preview/teste operam **sem qualquer verificação criptográfica de identidade**.

---

## Contradição com a documentação oficial

### Fonte 1 — Encode a JWT Using a Signing Secret

> *"Set `"useJwt": true` in the activity's arguments **for each call (save, validate, publish, execute)** for which you wish to receive a JWT."*

O exemplo de código mostra `useJwt: true` em `save`, `validate` e `publish` dentro de `configurationArguments`:

```json
"configurationArguments": {
    "save": {
        "url": "https://example.com/save",
        "useJwt": true
    },
    "validate": {
        "url": "https://example.com/validate",
        "useJwt": true
    },
    "publish": {
        "url": "https://example.com/publish",
        "useJwt": true
    }
}
```

https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/encode-custom-activities-using-jwt-app-signature.html

### Fonte 2 — Encode a JWT Using a Customer Key

Exemplo completo mostra `useJwt: true` aplicado a `save`, `validate`, `publish` E `execute`.

https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/encode-custom-activities-using-jwt-customer-key.html

### Fonte 3 — Rest Activity Format

> *"If the `useJwt` property is set to true for any of the REST activity's methods, then a JWT for the account is generated, encoded, and sent as the POST body."*

https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/rest.html

---

## Evidências de que o problema é histórico e conhecido

### Fonte 4 — Salesforce StackExchange (2015–2020)

> *"JWT not included in payload for Custom Activity endpoints"*

Relato de **2015**, atribuído aos engenheiros da Salesforce na época. Até **2020**, usuários ainda reportavam o mesmo problema. **Nunca foi resolvido.**

https://salesforce.stackexchange.com/questions/68745/jwt-not-included-in-payload-for-custom-activity-endpoints

### Fonte 5 — Salesforce StackExchange (2018)

> Desenvolvedor utilizando `useJwt: false` em endpoints de lifecycle explicitamente, porque JWT não funciona na prática. A resposta aceita na thread sequer menciona autenticação para lifecycle.

https://salesforce.stackexchange.com/questions/216220/sfmc-custom-activity-save-publish-validate-execute-endpoints-not-called

### Fonte 6 — Teste prático ngrok + Installed Package staging (Julho/2026)

> Confirmado que `useJwt: true` só produz efeito no endpoint `/execute`. Os endpoints de lifecycle ignoram a configuração e enviam JSON puro, sem qualquer token. Teste realizado com ngrok inspect capturando headers e body completos em ambiente staging com Installed Package dedicado.

---

## Perguntas

1. **Por que a documentação oficial afirma que `useJwt: true` deve funcionar para todos os endpoints (save, validate, publish, execute) mas, na prática, apenas o `/execute` recebe JWT?** O `useJwt` em `configurationArguments` (save, validate, publish, stop) é funcional? Se sim, há alguma configuração adicional necessária?

2. **Qual o mecanismo de autenticação recomendado pela Salesforce para os endpoints de lifecycle (`/save`, `/validate`, `/publish`, `/stop`)?** Já que JWT não está disponível neles, existe alguma alternativa oficial?

3. **Qual o mecanismo de autenticação recomendado para a chamada de preview/teste na interface da CA (botão "Testar" no iframe)?** Esta chamada é originada do navegador do operador e não possui qualquer token ou assinatura da SFMC.

4. **Considerando que este comportamento foi reportado há mais de 11 anos (StackExchange #68745, 2015), qual é o plano de correção ou workaround oficial?**

---

## Impacto

A ausência de autenticação nos endpoints de lifecycle e na interface de preview/teste significa que:

- Qualquer requisição `POST` para `/save`, `/validate`, `/publish`, `/stop` com JSON de metadados é aceita como legítima, mesmo que não venha da SFMC
- O botão "Testar" na interface da CA expõe um endpoint que aceita uma URL arbitrária para chamada HTTP, sem autenticação
- A única proteção criptográfica real está no `/execute`

Isso força os desenvolvedores a implementarem camadas adicionais de segurança (ex: allowlist de IPs, chaves de API customizadas) para compensar a falta de suporte a JWT nos endpoints de lifecycle — algo que a documentação sugere ser nativo mas **não é**.
