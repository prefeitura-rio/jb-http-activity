# Análise Técnica — SFMC Postman (CloudRelay)

> Gerado por Gemini 2.0 Flash após processamento visual e auditivo de 4 vídeos do canal [@sfmc-postman9135](https://youtube.com/@sfmc-postman9135)
>
> Vídeos analisados:
> 1. `cY5g6w_kjrk` — Configuração/Setup
> 2. `wBYk-g0nCMc` — Layout Overview
> 3. `3SdMKAEsttw` — Demo Funcional
> 4. `IeimOGPxTc0` — Apresentação Completa

---

## 1. UI / Layout

### Abas de Configuração

O produto tem **4 abas principais** dispostas horizontalmente no topo:

| Ordem | Aba | Conteúdo |
|---|---|---|
| 1 | **Configure REST API** (ou "POST"/método) | Dropdown de método, campo de URL, body (visível em POST/PUT/PATCH) |
| 2 | **Headers** | Tabela chave/valor com Add Row e Remove |
| 3 | **Body** | Textarea JSON + dropdown de content-type (`application/json`, `form-urlencoded`, `multipart/form-data`) |
| 4 | **Response Variables** | Tabela de mapeamento: Key, Type, Code/Value |
| 5 | **Templates** | Lista de templates + Save / Save As |

### Sidebar

- **Lado direito**: Painel fixo com duas listas:
  - *Journey Data Attributes* (campos da DE entry, disponíveis para data binding)
  - *Environment Variables* (variáveis de ambiente configuradas no site)
- **Lado superior**: Barra do Journey Builder (nome da jornada, versão, salvar/validar/ativar)

### Cores e Estilo

- Predominância de branco e azul (padrão Salesforce)
- Interface limpa, organizada em seções verticais
- Tabelas bem estruturadas para headers e response variables

---

## 2. Métodos HTTP Suportados

| Método | Presente |
|---|---|
| **GET** | ✅ |
| **POST** | ✅ (default) |
| **PUT** | ✅ |
| **PATCH** | ✅ |
| **DELETE** | ✅ |

---

## 3. Request Configuration

### URL
- Campo de texto: "Enter request URL"
- Suporte a data binding com variáveis do Journey Builder: `{{Contact.Attribute.DE.CPF}}`
- Query params adicionados diretamente na URL

### Headers
- Tabela dinâmica: colunas **Key** e **Value**
- Botões: **Add Row** (adiciona linha) e **Remove** (remove linha)
- Autenticação Bearer feita manualmente via header `Authorization: Bearer {{token}}`

### Body
- Editor de texto simples (textarea) para JSON
- Dropdown de content-type:
  - `application/json` (default)
  - `application/x-www-form-urlencoded`
  - `multipart/form-data`
- Botão **Clear** para limpar o body
- **Sem syntax highlighting**

### Autenticação
- Não há suporte nativo a OAuth 2.0 na UI — o usuário adiciona token manualmente como header Bearer
- O vídeo menciona que Environment Variables guardam clientId/clientSecret (provavelmente para autenticação no backend deles, não na activity)

---

## 4. Response Mapping (outArguments)

### Tabela de Mapeamento

| Coluna | Descrição |
|---|---|
| **Key** | Nome da variável de saída (ex: `weather`, `temp`) |
| **Type** | Tipo de dado: `Text` (default) / `Number` / `Boolean` / `Date` |
| **Code/Value** (opcional) | Expressão para acessar campo aninhado no response |

### Dot Notation

✅ **Confirmado**: o vídeo demonstra o uso de dot notation para acessar objetos aninhados:
- `weather.main` — acessa `response.weather.main`
- A descrição menciona "lambda expressions" para transformações

### Exposição no JB

As variáveis mapeadas ficam disponíveis como `outArguments` para atividades subsequentes via `{{Interaction.REST-1.key}}`

### **Sem preview do response** (gap identificado)

---

## 5. Templates

### Funcionamento
- Sistema de templates para salvar/reutilizar configurações completas (URL + headers + body + response variables)
- Aba "Templates" com lista de templates salvos
- Botões: **Save** (atualiza) e **Save As** (novo)
- **Templates são compartilhados entre usuários da mesma conta**

---

## 6. Error Handling

### Modelo Atual do SFMC Postman

- Variável **`Postman_Error`** disponível como outArgument
- Variável **`Postman_Response`** disponível (response bruto)
- A variável Postman_Error pode ser usada em **Decision Split nativo do JB** para roteamento condicional
- **Não há opção "Tratar erros como saída"** — erros 4xx/5xx provavelmente falham a activity

### Gap identificado

O SFMC Postman não parece ter o toggle "Nunca Gerar Erro" que o WeFlow tem. Em caso de 4xx/5xx, a activity provavelmente falha e o contato sai do fluxo — exatamente o problema que identificamos e resolvemos com o toggle `treatErrorsAsOutput`.

---

## 7. Features Exclusivas do SFMC Postman

### Feature 1: Environment Variables (portal externo)

As variáveis de ambiente são configuradas **no website sfmc-postman.com**, não na activity do JB. Ficam disponíveis no painel direito e podem ser referenciadas nos campos.

**Impacto no jb-http-activity:** Nosso design atual permite configurar credenciais diretamente na UI da activity. A abordagem do CloudRelay de variáveis globais no site é útil para times que usam as mesmas credenciais em várias journeys, mas é uma dependência externa que preferimos evitar.

### Feature 2: Dashboard de Uso

O site sfmc-postman.com tem dashboard com:
- Número de chamadas de API realizadas
- Chamadas restantes (modelo de créditos)
- Status das journeys

**Impacto:** Não replicaremos o dashboard na fase 1. Os logs da activity (`/execute`) no Cloud Run são suficientes. Dashboard pode ser fase futura.

### Feature 3: Debug Mode

Botão "Debug" que permite testar a chamada de API com dados de teste e ver o response.

**Impacto:** Já planejamos isso na aba Response com o botão "▶ Executar com dados de teste" e preview do response. Confirmado como feature desejada.

### Feature 4: Code Optional / Lambda Expressions

A coluna "Code/OPTIONAL" no mapeamento de response permite usar expressões/transformações nos valores extraídos.

**Impacto:** Não está no nosso plano atual. Podemos considerar adicionar transformações básicas futuramente (uppercase, concatenação, formatação de data).

---

## 8. Fluxo de Configuração (passo a passo)

1. Arrastar a Custom Activity do painel "Custom" para o canvas
2. Clicar no nó para abrir o modal de configuração
3. **Aba 1**: Selecionar método HTTP, digitar URL
4. **Aba 2**: Adicionar headers (Authorization, Content-Type, etc.)
5. **Aba 3**: Inserir body JSON
6. **Aba 4**: Mapear campos do response para outArguments (Key + Type + Code)
7. **Aba 5** (opcional): Salvar como template
8. Fechar o modal
9. Validar e publicar a jornada

---

## 9. Comparativo com o Plano Atual do jb-http-activity

| Feature | SFMC Postman (CloudRelay) | jb-http-activity (planejado) | Gap? |
|---|---|---|---|
| Métodos HTTP | GET, POST, PUT, PATCH, DELETE | GET, POST, PUT, PATCH, DELETE | ✅ |
| Headers dinâmicos | Tabela Key/Value | KeyValueEditor (igual) | ✅ |
| Body JSON | Textarea + content-type dropdown | BodyEditor + content-type | ✅ |
| Data Binding | Journey Data Attributes no sidebar | VariablePicker dropdown | ✅ |
| Response Mapping | Tabela Key + Type + Code | ResponseMapping (Key + Tipo) | ⚠️ Code/transformação |
| Dot Notation | ✅ demonstrado | ✅ planejado | ✅ |
| Templates | ✅ compartilhados entre usuários | ❌ não planejado | ⚠️ Gap |
| Environment Variables | ✅ portal externo | 🔧 na UI da activity | Diferente |
| Auth OAuth2 | ❌ (Bearer manual) | ✅ Native na UI | ✅ Vantagem nossa |
| Error como saída | ❌ | ✅ toggle treatErrorsAsOutput | ✅ Vantagem nossa |
| HTTP Status code | ❌ (só Postman_Error) | ✅ built-in httpStatusCode | ✅ Vantagem nossa |
| Debug/Teste | ✅ botão Debug | ✅ "Executar com dados de teste" | ✅ |
| Preview response | ❌ | ✅ Preview na aba Response | ✅ Vantagem nossa |
| Dashboard | ✅ portal externo | ❌ fase 1 | ⚠️ Gap (fase futura) |
| Syntax Highlight | ❌ textarea simples | ❌ textarea simples (igual) | ✅ alinhado |

### Decisões de design validadas pela análise

1. ✅ **4 abas** — confirmado que a metáfora de abas é o padrão de mercado
2. ✅ **Tabela de response mapping** — estrutura Key + Tipo + Campo é a abordagem correta
3. ✅ **Dot notation** — essencial para objetos aninhados
4. ✅ **Toggle de erros como saída** — o concorrente não tem, é nosso diferencial
5. ✅ **HTTP status code built-in** — o concorrente não expõe, é nosso diferencial

### Melhorias identificadas para incorporar

1. **Templates** — adicionar sistema de save/carregar templates na fase 2 (não crítico para MVP)
2. **Sidebar com Journey Data Attributes** — confirmar que o painel direito com variáveis disponíveis será implementado (já no plano como VariablePicker)
3. **Content-type dropdown** no body — adicionar (já no plano)
