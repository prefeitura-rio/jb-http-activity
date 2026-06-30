const axios = require('axios')
const { validateUrl } = require('./blocklist')

function shouldRetry(attempt, retryCount, response) {
  if (attempt >= retryCount) return false
  if (!response) return true
  return response.status >= 500
}

async function request(config) {
  const { method, url, headers, queryParams, body, timeout } = config
  const retryCount = Math.min(config.retryCount || 0, 3)
  const retryDelay = Math.min(config.retryDelay || 1000, 5000)

  if (url) {
    const validation = await validateUrl(url)
    if (!validation.valid) {
      throw new Error(`URL bloqueada: ${validation.error}`)
    }
  }

  const reqConfig = {
    method: method || 'GET',
    url: url || '',
    headers: headers || {},
    params: queryParams || {},
    timeout: Math.min(timeout || 30000, 40000),
    validateStatus: () => true
  }

  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    reqConfig.data = body
  }

  let lastResponse = null
  let lastError = null

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      lastResponse = await axios(reqConfig)
      if (shouldRetry(attempt, retryCount, lastResponse)) {
        await sleep(retryDelay)
        continue
      }
      if (lastResponse.status >= 400) {
        break
      }
      return { status: lastResponse.status, data: lastResponse.data, attempts: attempt + 1 }
    } catch (err) {
      lastError = err
      if (shouldRetry(attempt, retryCount, null)) {
        await sleep(retryDelay)
        continue
      }
      break
    }
  }

  if (lastError) {
    lastError._attempts = retryCount + 1
    throw lastError
  }
  return { status: lastResponse.status, data: lastResponse.data, attempts: retryCount + 1 }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = { request, shouldRetry, sleep }
