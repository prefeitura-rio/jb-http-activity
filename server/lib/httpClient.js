const axios = require('axios')

async function request(config) {
  const { method, url, headers, queryParams, body, timeout } = config

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

  const response = await axios(reqConfig)

  return {
    status: response.status,
    data: response.data
  }
}

module.exports = { request }
