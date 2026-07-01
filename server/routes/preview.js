const { request } = require('../lib/httpClient')
const { resolveAuth } = require('../lib/authHandler')
const { extract } = require('../lib/responseMapper')

module.exports = async function previewRoute(req, res) {
  let config = {}

  try {
    const inArgs = req.body && req.body.inArguments

    if (!inArgs || !Array.isArray(inArgs)) {
      return res.status(400).json({ error: 'inArguments ausente ou invalido' })
    }

    config = inArgs.reduce((acc, arg) => ({ ...acc, ...arg }), {})

    const headers = safeParse(config.headers, [])
    const queryParams = safeParse(config.queryParams, [])
    const auth = safeParse(config.auth, {})
    const responseMapping = safeParse(config.responseMapping, [])

    const headersMap = {}
    if (Array.isArray(headers)) {
      for (const h of headers) {
        if (h.key) headersMap[h.key] = h.value || ''
      }
    }

    const paramsMap = {}
    if (Array.isArray(queryParams)) {
      for (const p of queryParams) {
        if (p.key) paramsMap[p.key] = p.value || ''
      }
    }

    const authHeaders = await resolveAuth(auth)
    Object.assign(headersMap, authHeaders)

    let bodyData = null
    const contentType = config.contentType || 'application/json'

    if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      if (contentType === 'application/json') {
        try {
          bodyData = JSON.parse(config.body)
        } catch {
          bodyData = config.body
        }
      } else if (contentType === 'application/x-www-form-urlencoded') {
        bodyData = new URLSearchParams(config.body).toString()
      } else if (contentType === 'multipart/form-data') {
        const fd = new FormData()
        for (const pair of config.body.split('&')) {
          const idx = pair.indexOf('=')
          if (idx > 0) fd.append(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim())
        }
        bodyData = fd
      } else {
        bodyData = config.body
      }
    }

    if (!headersMap['Content-Type'] && !headersMap['content-type']) {
      headersMap['Content-Type'] = contentType
    }

    const startTime = Date.now()

    const httpResponse = await request({
      method: config.method || 'GET',
      url: config.url || '',
      headers: headersMap,
      queryParams: paramsMap,
      body: bodyData,
      timeout: config.timeout || 30000,
      retryCount: config.retryCount || 0,
      retryDelay: config.retryDelay || 1000
    })

    const durationMs = Date.now() - startTime
    const statusCode = httpResponse.status
    const statusClass = `${Math.floor(statusCode / 100)}xx`
    const isSuccess = statusCode >= 200 && statusCode < 300

    const mapped = extract(httpResponse.data, responseMapping)

    const outArgs = {
      _rawBody: httpResponse.data,
      _duration: durationMs,
      _timestamp: new Date().toISOString(),
      _url: config.url,
      _method: config.method,
      _statusClass: statusClass,
      _attempts: httpResponse.attempts || 1,
      httpStatusCode: statusCode,
      httpStatusClass: statusClass,
      httpSuccess: isSuccess,
      ...mapped
    }

    console.log('[PREVIEW]', JSON.stringify({
      method: config.method,
      url: config.url,
      httpStatus: statusCode,
      durationMs,
      statusClass,
      success: isSuccess
    }))

    return res.status(200).json(outArgs)
  } catch (err) {
    const outArgs = {
      _duration: 0,
      _timestamp: new Date().toISOString(),
      _url: config ? config.url : 'unknown',
      _attempts: err._attempts || 1,
      httpStatusCode: 0,
      httpStatusClass: '0xx',
      httpSuccess: false
    }

    console.log('[PREVIEW]', JSON.stringify({
      method: config ? config.method : 'unknown',
      url: config ? config.url : 'unknown',
      httpStatus: 0,
      error: err.message
    }))

    const errorResponse = {
      error: err.message || 'Erro interno do servidor',
      ...outArgs
    }

    return res.status(500).json(errorResponse)
  }
}

function safeParse(str, fallback) {
  if (!str) return fallback
  if (typeof str === 'object') return str

  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}
