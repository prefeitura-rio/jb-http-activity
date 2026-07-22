import assert from 'assert'
import axios from 'axios'
import { isSfmcConfigured, updateDataExtensionRow } from '../server/lib/sfmcDataExtension'

const ENV_KEYS = ['SFMC_AUTH_URI', 'SFMC_CLIENT_ID', 'SFMC_CLIENT_SECRET']

const OK_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <UpdateResponse xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <OverallStatus>OK</OverallStatus>
      <Results>
        <Result>
          <StatusCode>OK</StatusCode>
          <StatusMessage>Update Successful</StatusMessage>
        </Result>
      </Results>
    </UpdateResponse>
  </soap:Body>
</soap:Envelope>`

const ERROR_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <UpdateResponse xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <OverallStatus>Error</OverallStatus>
      <Results>
        <Result>
          <StatusCode>Error</StatusCode>
          <StatusMessage>Unable to locate DataExtension object for CustomerKey</StatusMessage>
        </Result>
      </Results>
    </UpdateResponse>
  </soap:Body>
</soap:Envelope>`

const FAULT_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultstring>Security Header is missing or the security context is invalid</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`

describe('sfmcDataExtension', function() {
  let originalEnv: Record<string, string | undefined>
  let originalPost: typeof axios.post

  beforeEach(function() {
    originalEnv = {}
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key]
      delete process.env[key]
    }
    originalPost = axios.post
  })

  afterEach(function() {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key]
      else process.env[key] = originalEnv[key]
    }
    axios.post = originalPost
  })

  describe('isSfmcConfigured', function() {
    it('retorna false se nenhuma env estiver setada', function() {
      assert.strictEqual(isSfmcConfigured(), false)
    })

    it('retorna false se faltar uma env', function() {
      process.env.SFMC_AUTH_URI = 'https://sub.auth.marketingcloudapis.com'
      process.env.SFMC_CLIENT_ID = 'id'
      assert.strictEqual(isSfmcConfigured(), false)
    })

    it('retorna true com as 3 credenciais setadas (DE e campo-chave nao sao mais env)', function() {
      process.env.SFMC_AUTH_URI = 'https://sub.auth.marketingcloudapis.com'
      process.env.SFMC_CLIENT_ID = 'id'
      process.env.SFMC_CLIENT_SECRET = 'secret'
      assert.strictEqual(isSfmcConfigured(), true)
    })
  })

  describe('updateDataExtensionRow', function() {
    beforeEach(function() {
      process.env.SFMC_AUTH_URI = 'https://sub.auth.marketingcloudapis.com'
      process.env.SFMC_CLIENT_ID = 'id'
      process.env.SFMC_CLIENT_SECRET = 'secret'
    })

    it('busca token, monta o envelope SOAP com SaveAction=Update e envia pro soap_instance_url', async function() {
      const calls: { url: string; body: unknown; headers?: Record<string, string> }[] = []

      axios.post = (async (url: string, body: unknown, config?: { headers?: Record<string, string> }) => {
        calls.push({ url, body, headers: config?.headers })
        if (url.includes('/v2/token')) {
          return {
            data: {
              access_token: 'tok-123',
              soap_instance_url: 'https://sub.soap.marketingcloudapis.com/',
              expires_in: 1200
            }
          }
        }
        return { status: 200, data: OK_RESPONSE }
      }) as never

      const result = await updateDataExtensionRow('12345678901', { Nome: 'Fulano' }, 'de-key-do-inArgument')

      assert.strictEqual(result.success, true)
      assert.strictEqual(calls.length, 2)
      assert.match(calls[0].url, /\/v2\/token$/)
      assert.strictEqual(calls[1].url, 'https://sub.soap.marketingcloudapis.com/Service.asmx')
      assert.strictEqual(calls[1].headers?.['Content-Type'], 'text/xml')
      assert.strictEqual(calls[1].headers?.SOAPAction, 'Update')

      const envelope = calls[1].body as string
      assert.match(envelope, /<SaveAction>Update<\/SaveAction>/)
      assert.match(envelope, /<CustomerKey>de-key-do-inArgument<\/CustomerKey>/)
      assert.match(envelope, /<Name>SubscriberKey<\/Name><Value>12345678901<\/Value>/)
      assert.match(envelope, /<Name>Nome<\/Name><Value>Fulano<\/Value>/)
      assert.match(envelope, /<fueloauth xmlns="http:\/\/exacttarget\.com">tok-123<\/fueloauth>/)
    })

    it('usa o keyField customizado passado como parametro (vindo do inArgument deKeyField)', async function() {
      let sentEnvelope = ''

      axios.post = (async (url: string, body: unknown) => {
        if (url.includes('/v2/token')) {
          return { data: { access_token: 'tok', soap_instance_url: 'https://sub.soap.marketingcloudapis.com', expires_in: 1200 } }
        }
        sentEnvelope = body as string
        return { status: 200, data: OK_RESPONSE }
      }) as never

      await updateDataExtensionRow('98765432100', {}, 'de-key', 'cpfCnpj')

      assert.match(sentEnvelope, /<Name>cpfCnpj<\/Name><Value>98765432100<\/Value>/)
    })

    it('usa SubscriberKey como default quando keyField nao e passado', async function() {
      let sentEnvelope = ''

      axios.post = (async (url: string, body: unknown) => {
        if (url.includes('/v2/token')) {
          return { data: { access_token: 'tok', soap_instance_url: 'https://sub.soap.marketingcloudapis.com', expires_in: 1200 } }
        }
        sentEnvelope = body as string
        return { status: 200, data: OK_RESPONSE }
      }) as never

      await updateDataExtensionRow('98765432100', {}, 'de-key')

      assert.match(sentEnvelope, /<Name>SubscriberKey<\/Name><Value>98765432100<\/Value>/)
    })

    it('retorna success false quando OverallStatus e Error', async function() {
      axios.post = (async (url: string) => {
        if (url.includes('/v2/token')) {
          return { data: { access_token: 'tok', soap_instance_url: 'https://sub.soap.marketingcloudapis.com', expires_in: 1200 } }
        }
        return { status: 200, data: ERROR_RESPONSE }
      }) as never

      const result = await updateDataExtensionRow('12345678901', { Nome: 'Fulano' }, 'de-key')

      assert.strictEqual(result.success, false)
      assert.strictEqual(result.error, 'Unable to locate DataExtension object for CustomerKey')
    })

    it('retorna success false e extrai faultstring em caso de SOAP Fault', async function() {
      axios.post = (async (url: string) => {
        if (url.includes('/v2/token')) {
          return { data: { access_token: 'tok', soap_instance_url: 'https://sub.soap.marketingcloudapis.com', expires_in: 1200 } }
        }
        return { status: 500, data: FAULT_RESPONSE }
      }) as never

      const result = await updateDataExtensionRow('12345678901', { Nome: 'Fulano' }, 'de-key')

      assert.strictEqual(result.success, false)
      assert.strictEqual(result.error, 'Security Header is missing or the security context is invalid')
    })

    it('retorna success false quando a chamada lanca excecao', async function() {
      axios.post = (async () => {
        throw new Error('network down')
      }) as never

      const result = await updateDataExtensionRow('12345678901', { Nome: 'Fulano' }, 'de-key')

      assert.strictEqual(result.success, false)
      assert.strictEqual(result.error, 'network down')
    })
  })
})
