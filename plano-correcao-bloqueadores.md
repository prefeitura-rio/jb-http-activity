# Plano de Correção — 3 Bloqueadores (Gabriel)

## Pré-requisito: Atualizar allowlist no Infisical

```
# Staging + Produção
HTTP_ALLOWLIST=.pref.rio,.dados.rio,.rio.gov.br,generativelanguage.googleapis.com,graph.facebook.com
```

**Mudanças:**
- ❌ Removidos `.httpbin.org`, `.postman-echo.com`, `.httpstat.us`, `.reqres.in`, `.typicode.com`
- 🔒 Restringido `.facebook.com` → `graph.facebook.com` (não libera `l.facebook.com` que é open redirect)
- 🔒 Restringido `.googleapis.com` → `generativelanguage.googleapis.com` (host exato usado)

---

## Item 1 — SSRF via Open Redirect (Crítico)

### Problema
axios segue redirecionamentos automaticamente. Um atacante usa domínio permitido com open redirect (ex: `httpbin.org/redirect-to?url=http://169.254.169.254`) para contornar a allowlist e acessar IPs internos.

### Solução
Interceptar redirecionamentos e revalidar cada hop pela allowlist, com máximo de 3 saltos.

### Arquivo: `server/lib/httpClient.ts`

```diff
+ const MAX_REDIRECTS = 3

  async function request(config: HttpRequestConfig, redirectCount = 0): Promise<HttpResponse> {
    const reqConfig: AxiosRequestConfig = {
+     maxRedirects: 0,
+     validateStatus: (status) => status < 300 || status >= 400
    }

    // ... requisição normal ...

+   const response = await axios(reqConfig)
+
+   // Se for redirect (3xx), revalidar pela allowlist
+   if (response.status >= 300 && response.status < 400 && response.headers.location) {
+     if (redirectCount >= MAX_REDIRECTS) {
+       throw new Error('Muitos redirecionamentos')
+     }
+
+     const redirectUrl = new URL(response.headers.location, url).toString()
+     const validation = await validateUrl(redirectUrl)
+     if (!validation.valid) {
+       throw new Error(`Redirect bloqueado pela allowlist: ${validation.error}`)
+     }
+
+     return await request({ ...config, url: redirectUrl }, redirectCount + 1)
+   }
```

### Comportamento

| Cenário | Antes | Depois |
|---------|-------|--------|
| API retorna 302 para domínio permitido | ✅ Segue redirect | ✅ Segue (revalidado) |
| API retorna 302 para IP interno | ✅ Segue (SSRF) | ❌ Bloqueado |
| API retorna 302 → 302 → 302 (cadeia) | ✅ Segue todos | ✅ Segue até 3 saltos |
| API retorna 302 infinito | ✅ Loop infinito | ❌ Bloqueado após 3 |

---

## Item 2 — Allowlist insegura (Alto)

### Problema
- Domínios de teste com open redirect na allowlist de produção
- `.facebook.com` libera `l.facebook.com` (open redirect conhecido)
- `.googleapis.com` libera `storage.googleapis.com` (conteúdo arbitrário)

### Solução
Restringir os padrões + separar ambientes.

### Arquivo: `server/lib/allowlist.ts`

Suporte a entradas **sem ponto na frente** como match exato (só o domínio, sem subdomínios):

```typescript
// pattern = "graph.facebook.com"
// - casa "graph.facebook.com" (===)
// - NÃO casa "l.facebook.com" (não endsWith)
```

### Resultado

| Padrão | Libera | Não libera |
|--------|--------|------------|
| `graph.facebook.com` | `graph.facebook.com` ✅ | `l.facebook.com` ❌ |
| `generativelanguage.googleapis.com` | `generativelanguage.googleapis.com` ✅ | `storage.googleapis.com` ❌ |
| `.pref.rio` | `services.pref.rio`, `api.pref.rio` ✅ | (qualquer pref.rio) ✅ |

---

## Item 3 — Preview sem autenticação (Alto)

### Responsabilidade
- **Gabriel**: valida JWT na camada de rede do cluster (gateway valida `Authorization: Bearer <JWT>`)
- **Bruno**: campo de input na UI + envio do header

### Arquivo: `src/components/tabs/TabResponse.vue`

**Template** — campo de senha antes do botão "Testar":

```html
<div class="jwt-field">
  <label>Token de autenticação</label>
  <input v-model="jwtToken" type="password" placeholder="Cole o JWT de autenticação" />
</div>
```

**Script** — valor só em memória (`ref`), sem localStorage:

```typescript
const jwtToken = ref<string>('')
```

**Na chamada axios** — incluir header:

```typescript
const headers: Record<string, string> = {}
if (jwtToken.value) {
  headers['Authorization'] = `Bearer ${jwtToken.value}`
}

const res = await axios.post(
  `${import.meta.env.BASE_URL}preview`,
  { inArguments: [...] },
  { headers }
)
```

### Fluxo

```
Operador → gera JWT no pref.rio → cola no campo da UI
  → token fica em memória (ref do Vue)
  → ao clicar "Testar", envia Authorization: Bearer <JWT>
  → gateway do cluster valida o JWT
  → se inválido, 401 antes de chegar no servidor
  → se válido, requisição chega no /preview
  → servidor processa normalmente
```

### Segurança

- Token nunca vai pra disco (sem localStorage, cookies, IndexedDB)
- Se recarregar a página, perde o token — operador cola de novo
- Se fechar o navegador, perde o token
- A validação é feita no **gateway**, não no nosso código

---

## Cronograma estimado

| Item | Arquivos | Tempo |
|------|----------|-------|
| 1 — Open Redirect | `httpClient.ts` | ~10 min |
| 2 — Allowlist | `allowlist.ts` + Infisical | ~10 min |
| 3 — Preview auth | `TabResponse.vue` | ~20 min |
| **Total** | **3 arquivos** | **~40 min** |
