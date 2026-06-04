const assert = require('assert')
const axios = require('axios')
const { resolveAuth } = require('../server/lib/authHandler')

describe('authHandler', function() {
  describe('None', function() {
    it('retorna objeto vazio se type for none', async function() {
      const result = await resolveAuth({ type: 'none' })
      assert.deepStrictEqual(result, {})
    })

    it('retorna objeto vazio se config for null', async function() {
      const result = await resolveAuth(null)
      assert.deepStrictEqual(result, {})
    })

    it('retorna objeto vazio se config for undefined', async function() {
      const result = await resolveAuth(undefined)
      assert.deepStrictEqual(result, {})
    })

    it('retorna objeto vazio se type for desconhecido', async function() {
      const result = await resolveAuth({ type: 'unknown' })
      assert.deepStrictEqual(result, {})
    })
  })

  describe('Bearer', function() {
    it('retorna header Authorization com token', async function() {
      const result = await resolveAuth({ type: 'bearer', token: 'meu-token' })
      assert.deepStrictEqual(result, { Authorization: 'Bearer meu-token' })
    })

    it('retorna objeto vazio se token for vazio', async function() {
      const result = await resolveAuth({ type: 'bearer', token: '' })
      assert.deepStrictEqual(result, {})
    })

    it('retorna objeto vazio se token for undefined', async function() {
      const result = await resolveAuth({ type: 'bearer' })
      assert.deepStrictEqual(result, {})
    })
  })

  describe('OAuth2 Client Credentials', function() {
    beforeEach(function() {
      this.originalPost = axios.post
    })

    afterEach(function() {
      axios.post = this.originalPost
    })

    it('retorna header com token recebido do provider', async function() {
      axios.post = async () => ({ data: { access_token: 'oauth-token-123' } })

      const result = await resolveAuth({
        type: 'oauth2_client_credentials',
        tokenUrl: 'https://auth.exemplo.com/token',
        clientId: 'meu-client-id',
        clientSecret: 'meu-client-secret'
      })

      assert.deepStrictEqual(result, { Authorization: 'Bearer oauth-token-123' })
    })

    it('envia scope se informado', async function() {
      let capturedParams = null
      axios.post = async (url, body, config) => {
        capturedParams = config.params
        return { data: { access_token: 'token' } }
      }

      await resolveAuth({
        type: 'oauth2_client_credentials',
        tokenUrl: 'https://auth.exemplo.com/token',
        clientId: 'id',
        clientSecret: 'secret',
        scope: 'read write'
      })

      assert.strictEqual(capturedParams.scope, 'read write')
    })

    it('retorna objeto vazio se tokenUrl faltar', async function() {
      const result = await resolveAuth({
        type: 'oauth2_client_credentials',
        clientId: 'id',
        clientSecret: 'secret'
      })
      assert.deepStrictEqual(result, {})
    })

    it('retorna objeto vazio se clientId faltar', async function() {
      const result = await resolveAuth({
        type: 'oauth2_client_credentials',
        tokenUrl: 'https://auth.exemplo.com/token',
        clientSecret: 'secret'
      })
      assert.deepStrictEqual(result, {})
    })

    it('retorna objeto vazio se clientSecret faltar', async function() {
      const result = await resolveAuth({
        type: 'oauth2_client_credentials',
        tokenUrl: 'https://auth.exemplo.com/token',
        clientId: 'id'
      })
      assert.deepStrictEqual(result, {})
    })
  })
})
