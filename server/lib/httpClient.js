const axios = require('axios')

function shouldRetry(attempt, retryCount, response) {
  if (attempt >= retryCount) return false
  if (!response) return true
  return response.status >= 500
}

async function request(config) {
  const { method, url, headers, queryParams, body, timeout } = config
  const retryCount = config.retryCount || 0
  const retryDelay = config.retryDelay || 1000

  const reqConfig = {
    method: method || 'GET',
    url: url || '',
    headers: headers || {},
    params: queryParams || {},
    timeout: timeout || 30000,
    validateStatus: () => true
  }

  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    reqConfig.data = body
  }

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const response = await axios(reqConfig)
      if (shouldRetry(attempt, retryCount, response)) {
        await sleep(retryDelay)
        continue
      }
      return { status: response.status, data: response.data }
    } catch (err) {
      if (shouldRetry(attempt, retryCount, null)) {
        await sleep(retryDelay)
        continue
      }
      throw err
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = { request, shouldRetry, sleep }
