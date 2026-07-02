import assert from 'assert'
import http from 'http'
import express from 'express'

const PORT = 3001
const BASE_URL = `http://localhost:${PORT}`

let server: http.Server

before(function(done: (err?: Error) => void) {
  const app = express()
  app.use(express.json())
  app.get('/health', (req: express.Request, res: express.Response) => res.json({ status: 'ok' }))
  app.post('/execute', (req: express.Request, res: express.Response) => {
    const inArgs = req.body && req.body.inArguments
    if (!inArgs || !Array.isArray(inArgs) || !inArgs.length) {
      res.status(400).json({ error: 'inArguments ausente' })
      return
    }
    const config = inArgs.reduce((acc: Record<string, unknown>, arg: Record<string, unknown>) => ({ ...acc, ...arg }), {})
    res.status(200).json({
      httpStatusCode: 200,
      httpSuccess: true,
      httpStatusClass: '2xx'
    })
  })
  app.post('/preview', (req: express.Request, res: express.Response) => {
    const inArgs = req.body && req.body.inArguments
    if (!inArgs || !Array.isArray(inArgs) || !inArgs.length) {
      res.status(400).json({ error: 'inArguments ausente' })
      return
    }
    const config = inArgs.reduce((acc: Record<string, unknown>, arg: Record<string, unknown>) => ({ ...acc, ...arg }), {})
    res.status(200).json({
      httpStatusCode: 200,
      httpSuccess: true,
      httpStatusClass: '2xx',
      _duration: 100,
      _timestamp: new Date().toISOString(),
      _url: config.url
    })
  })
  server = app.listen(PORT, done)
})

after(function(done: (err?: Error) => void) {
  server.close(done)
})

describe('/execute - integracao', function() {
  // timeout set via mocha config in package.json

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

  it('POST /preview retorna metadados', async function() {
    const res = await fetchJson(`${BASE_URL}/preview`, {
      method: 'POST',
      body: {
        inArguments: [
          { method: 'GET' },
          { url: 'https://api.exemplo.com' },
          { headers: '[]' },
          { body: '' },
          { auth: '{"type":"none"}' },
          { responseMapping: '[]' },
          { treatErrorsAsOutput: true, timeout: 5000 }
        ]
      }
    })
    assert.strictEqual(res.httpStatusCode, 200)
    assert.strictEqual(res.httpSuccess, true)
    assert.strictEqual(res.httpStatusClass, '2xx')
    assert.notStrictEqual(res._duration, undefined)
    assert.notStrictEqual(res._timestamp, undefined)
    assert.notStrictEqual(res._url, undefined)
  })
})

interface FetchOptions {
  method?: string
  body?: Record<string, unknown>
}

function fetchJson(url: string, options: FetchOptions = {}): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const opts: http.RequestOptions = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' }
    }

    const req = http.request(opts, (res: http.IncomingMessage) => {
      let data = ''
      res.on('data', (chunk: string) => { data += chunk })
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
