import assert from 'assert'
import { validateUrl } from '../server/lib/blocklist'

describe('blocklist - validateUrl', function() {
  // timeout set via mocha config in package.json

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

  it('rejeita localhost', async function() {
    const result = await validateUrl('http://localhost:3000/test')
    assert.strictEqual(result.valid, false)
    assert.ok((result as { valid: false; error: string }).error.includes('localhost'))
  })

  it('rejeita IP loopback 127.0.0.1', async function() {
    const result = await validateUrl('http://127.0.0.1:8080/api')
    assert.strictEqual(result.valid, false)
    assert.ok((result as { valid: false; error: string }).error.includes('loopback'))
  })

  it('rejeita IP privado 10.x', async function() {
    const result = await validateUrl('http://10.0.0.1/api')
    assert.strictEqual(result.valid, false)
    assert.ok((result as { valid: false; error: string }).error.includes('private-10'))
  })

  it('rejeita IP privado 192.168.x', async function() {
    const result = await validateUrl('http://192.168.1.1/api')
    assert.strictEqual(result.valid, false)
    assert.ok((result as { valid: false; error: string }).error.includes('private-192'))
  })

  it('rejeita IP privado 172.16-31.x', async function() {
    const result = await validateUrl('http://172.16.0.1/api')
    assert.strictEqual(result.valid, false)
    assert.ok((result as { valid: false; error: string }).error.includes('private-172'))
  })

  it('rejeita IP link-local 169.254.x', async function() {
    const result = await validateUrl('http://169.254.169.254/metadata')
    assert.strictEqual(result.valid, false)
    assert.ok((result as { valid: false; error: string }).error.includes('link-local'))
  })

  it('rejeita hostname metadata.google.internal', async function() {
    const result = await validateUrl('http://metadata.google.internal/computeMetadata/v1/')
    assert.strictEqual(result.valid, false)
    assert.ok((result as { valid: false; error: string }).error.includes('bloqueado'))
  })

  it('aceita URL publica valida', async function() {
    const result = await validateUrl('https://jsonplaceholder.typicode.com/todos/1')
    assert.strictEqual(result.valid, true)
  })

  it('aceita URL publica com path e query', async function() {
    const result = await validateUrl('https://api.exemplo.com/v1/dados?page=1')
    assert.strictEqual(result.valid, true)
  })
})
