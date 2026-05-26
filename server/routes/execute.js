const { request } = require('../lib/httpClient')
const { resolveAuth } = require('../lib/authHandler')
const { extract } = require('../lib/responseMapper')
const logger = require('../lib/structuredLogger')

module.exports = async function executeRoute(req, res) {
  try {
    const inArgs = req.body && req.body.inArguments
    if (!inArgs || !Array.isArray(inArgs)) {
      return res.status(400).json({ error: 'inArguments ausente ou invalido' })
    }

    const config = inArgs.reduce((acc, arg) => ({ ...acc, ...arg }), {})

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
    if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      try {
        bodyData = JSON.parse(config.body)
      } catch {
        bodyData = config.body
      }
    }

    const startTime = Date.now()

    const httpResponse = await request({
      method: config.method || 'GET',
      url: config.url || '',
      headers: headersMap,
      queryParams: paramsMap,
      body: bodyData,
      timeout: config.timeout || 30000
    })

    const durationMs = Date.now() - startTime
    const statusCode = httpResponse.status
    const statusClass = `${Math.floor(statusCode / 100)}xx`
    const isSuccess = statusCode >= 200 && statusCode < 300

    const mapped = extract(httpResponse.data, responseMapping)

    const outArgs = {
      httpStatusCode: statusCode,
      httpStatusClass: statusClass,
      httpSuccess: isSuccess,
      ...mapped
    }

    logger.info({
      journeyId: req.body && req.body.journeyId,
      contactKey: req.body && req.body.contactKey,
      method: config.method,
      url: config.url,
      httpStatus: statusCode,
      durationMs,
      statusClass,
      success: isSuccess,
      treatErrorsAsOutput: config.treatErrorsAsOutput,
      outArguments: outArgs,
      errorSummary: null
    })

    const treatErrors = config.treatErrorsAsOutput === true

    if (!treatErrors && !isSuccess) {
      return res.status(500).json({
        error: `HTTP ${statusCode} da API externa`,
        outArgs
      })
    }

    return res.status(200).json(outArgs)

  } catch (err) {
    const durationMs = 0
    const statusCode = 0
    const isSuccess = false

    const outArgs = {
      httpStatusCode: 0,
      httpStatusClass: '0xx',
      httpSuccess: false
    }

    logger.error({
      journeyId: req.body && req.body.journeyId,
      contactKey: req.body && req.body.contactKey,
      method: req.body && req.body.inArguments ? 'unknown' : 'unknown',
      url: 'unknown',
      httpStatus: 0,
      durationMs,
      statusClass: '0xx',
      success: false,
      outArguments: outArgs,
      errorSummary: err.message || 'Erro interno'
    })

    return res.status(500).json({ error: err.message || 'Erro interno do servidor' })
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
