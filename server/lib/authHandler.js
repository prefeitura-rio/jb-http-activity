const axios = require('axios')
const { validateUrl } = require('./blocklist')

async function resolveAuth(authConfig) {
  if (!authConfig || authConfig.type === 'none') {
    return {}
  }

  if (authConfig.type === 'bearer') {
    if (!authConfig.token) return {}
    return { Authorization: `Bearer ${authConfig.token}` }
  }

  if (authConfig.type === 'oauth2_client_credentials') {
    const { tokenUrl, clientId, clientSecret, scope } = authConfig
    if (!tokenUrl || !clientId || !clientSecret) return {}

    const validation = await validateUrl(tokenUrl)
    if (!validation.valid) {
      throw new Error(`tokenUrl bloqueada: ${validation.error}`)
    }

    const response = await axios.post(tokenUrl, null, {
      params: {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        ...(scope ? { scope } : {})
      }
    })

    return { Authorization: `Bearer ${response.data.access_token}` }
  }

  return {}
}

module.exports = { resolveAuth }
