const assert = require('assert')
const { shouldRetry } = require('../server/lib/httpClient')

describe('httpClient - shouldRetry', function() {
  it('nao retry se attempt >= retryCount', function() {
    assert.strictEqual(shouldRetry(0, 0, null), false)
    assert.strictEqual(shouldRetry(1, 0, null), false)
    assert.strictEqual(shouldRetry(2, 1, null), false)
  })

  it('retry em caso de erro de rede (response null)', function() {
    assert.strictEqual(shouldRetry(0, 2, null), true)
    assert.strictEqual(shouldRetry(1, 2, null), true)
  })

  it('retry em caso de 5xx', function() {
    assert.strictEqual(shouldRetry(0, 3, { status: 500 }), true)
    assert.strictEqual(shouldRetry(1, 3, { status: 503 }), true)
    assert.strictEqual(shouldRetry(2, 3, { status: 502 }), true)
  })

  it('nao retry em caso de 4xx', function() {
    assert.strictEqual(shouldRetry(0, 3, { status: 400 }), false)
    assert.strictEqual(shouldRetry(0, 3, { status: 401 }), false)
    assert.strictEqual(shouldRetry(0, 3, { status: 404 }), false)
    assert.strictEqual(shouldRetry(0, 3, { status: 422 }), false)
  })

  it('nao retry em caso de sucesso 2xx', function() {
    assert.strictEqual(shouldRetry(0, 3, { status: 200 }), false)
    assert.strictEqual(shouldRetry(1, 3, { status: 201 }), false)
  })

  it('ultima tentativa nunca retry', function() {
    assert.strictEqual(shouldRetry(2, 2, null), false)
    assert.strictEqual(shouldRetry(2, 2, { status: 503 }), false)
    assert.strictEqual(shouldRetry(3, 3, { status: 500 }), false)
  })
})
