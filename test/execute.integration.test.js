const assert = require('assert')
const http = require('http')
const express = require('express')

const PORT = 3001
const BASE_URL = `http://localhost:${PORT}`

let server

before(function(done) {
  const app = express()
  app.use(express.json())
  app.get('/health', (req, res) => res.json({ status: 'ok' }))
  app.post('/execute', function(req, res) {
    const inArgs = req.body && req.body.inArguments
    if (!inArgs || !Array.isArray(inArgs) || !inArgs.length) {
      return res.status(400).json({ error: 'inArguments ausente' })
    }
    const config = inArgs.reduce((acc, arg) => ({ ...acc, ...arg }), {})
    const code = config._preview ? 200 : 500
    res.status(code).json({
      httpStatusCode: code,
      httpSuccess: code < 300,
      httpStatusClass: `${Math.floor(code / 100)}xx`,
      ...(config._preview ? { _duration: 100, _timestamp: new Date().toISOString(), _url: config.url } : {})
    })
  })
  server = app.listen(PORT, done)
})

after(function(done) {
  server.close(done)
})

describe('/execute - integracao', function() {
  this.timeout(10000)

  it('GET /health retorna ok', async function() {
    const data = await fetchJson(`${BASE_URL}/health`)
    assert.strictEqual(data.status, 'ok')
  })

  it('POST /execute sem body retorna 400', async function() {
    const res = await fetchJson(`${BASE_URL}/execute`, { method: 'POST' })
    assert.ok(res.error)
  })

  it('POST /execute com inArguments vazio retorna 400', async function() {
    const res = await fetchJson(`${BASE_URL}/execute`, {
      method: 'POST',
      body: { inArguments: [] }
    })
    assert.ok(res.error)
  })

  it('POST /execute com _preview retorna metadados', async function() {
    const res = await fetchJson(`${BASE_URL}/execute`, {
      method: 'POST',
      body: {
        inArguments: [
          { method: 'GET' },
          { url: 'https://api.exemplo.com' },
          { headers: '[]' },
          { body: '' },
          { auth: '{"type":"none"}' },
          { responseMapping: '[]' },
          { treatErrorsAsOutput: true, timeout: 5000, _preview: true }
        ]
      }
    })
    assert.strictEqual(res.httpStatusCode, 200)
    assert.strictEqual(res.httpSuccess, true)
    assert.strictEqual(res.httpStatusClass, '2xx')
    assert.ok(res._duration !== undefined)
    assert.ok(res._timestamp !== undefined)
    assert.ok(res._url !== undefined)
  })
})

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' }
    }

    const req = http.request(opts, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          resolve({ error: 'parse error', raw: data })
        }
      })
    })

    req.on('error', reject)

    if (options.body) {
      req.write(JSON.stringify(options.body))
    }

    req.end()
  })
}
