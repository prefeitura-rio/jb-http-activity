import assert from 'assert'
import { validateUrl } from '../server/lib/allowlist'

describe('allowlist - validateUrl', function() {
  before(function() {
    process.env.HTTP_ALLOWLIST = '.pref.rio,.dados.rio,.rio.gov.br,.googleapis.com,.facebook.com,.typicode.com,.httpbin.org,.reqres.in,.postman-echo.com,.httpstat.us'
  })

  after(function() {
    delete process.env.HTTP_ALLOWLIST
  })

  it('rejeita URL mal formatada', async function() {
    const result = await validateUrl('not-a-url' as never)
    assert.strictEqual(result.valid, false)
    assert.ok((result as { valid: false; error: string }).error.includes('URL'))
  })

  it('rejeita protocolo nao HTTP', async function() {
    const result = await validateUrl('ftp://example.com' as never)
    assert.strictEqual(result.valid, false)
    assert.ok((result as { valid: false; error: string }).error.includes('Protocolo'))
  })

  it('rejeita dominio fora da allowlist', async function() {
    const result = await validateUrl('http://malicious-site.com/api')
    assert.strictEqual(result.valid, false)
    assert.ok((result as { valid: false; error: string }).error.includes('ALLOWLIST'))
  })

  it('rejeita IP privado diretamente', async function() {
    const result = await validateUrl('http://10.0.0.1/api')
    assert.strictEqual(result.valid, false)
    assert.ok((result as { valid: false; error: string }).error.includes('ALLOWLIST'))
  })

  it('rejeita IP link-local', async function() {
    const result = await validateUrl('http://169.254.169.254/metadata')
    assert.strictEqual(result.valid, false)
    assert.ok((result as { valid: false; error: string }).error.includes('ALLOWLIST'))
  })

  it('rejeita hostname metadata.google.internal', async function() {
    const result = await validateUrl('http://metadata.google.internal/computeMetadata/v1/')
    assert.strictEqual(result.valid, false)
    assert.ok((result as { valid: false; error: string }).error.includes('ALLOWLIST'))
  })

  it('aceita dominio .pref.rio', async function() {
    const result = await validateUrl('https://services.pref.rio/mcp/consulta_debitos')
    assert.strictEqual(result.valid, true)
  })

  it('aceita dominio .dados.rio', async function() {
    const result = await validateUrl('https://services.staging.app.dados.rio/rmi/v1/phone/123/beta-status')
    assert.strictEqual(result.valid, true)
  })

  it('aceita dominio .facebook.com', async function() {
    const result = await validateUrl('https://graph.facebook.com/v22.0/messages')
    assert.strictEqual(result.valid, true)
  })

  it('aceita dominio .typicode.com para testes', async function() {
    const result = await validateUrl('https://jsonplaceholder.typicode.com/todos/1')
    assert.strictEqual(result.valid, true)
  })

  it('aceita dominio .httpbin.org', async function() {
    const result = await validateUrl('https://httpbin.org/get')
    assert.strictEqual(result.valid, true)
  })

  it('rejeita quando HTTP_ALLOWLIST estiver vazia', async function() {
    const original = process.env.HTTP_ALLOWLIST
    delete process.env.HTTP_ALLOWLIST
    const result = await validateUrl('https://jsonplaceholder.typicode.com/todos/1')
    assert.strictEqual(result.valid, false)
    assert.ok((result as { valid: false; error: string }).error.includes('ALLOWLIST'))
    process.env.HTTP_ALLOWLIST = original
  })
})
