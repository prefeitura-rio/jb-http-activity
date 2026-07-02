import axios from 'axios'
import { validateUrl } from './blocklist'
import { isAuthConfig, isNoneAuth, isBearerAuth, isOAuth2Auth } from '../types'

export async function resolveAuth(authConfig: unknown): Promise<Record<string, string>> {
  if (!isAuthConfig(authConfig)) return {}

  if (isNoneAuth(authConfig)) {
    return {}
  }

  if (isBearerAuth(authConfig)) {
    if (!authConfig.token) return {}
    return { Authorization: `Bearer ${authConfig.token}` }
  }

  if (isOAuth2Auth(authConfig)) {
    const { tokenUrl, clientId, clientSecret, scope } = authConfig
    if (!tokenUrl || !clientId || !clientSecret) return {}

    const validation = await validateUrl(tokenUrl)
    if (!validation.valid) {
      const errorMsg = (validation as { valid: false; error: string }).error
      throw new Error(`tokenUrl bloqueada: ${errorMsg}`)
    }

    const params: Record<string, string> = {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    }

    if (scope) {
      params.scope = scope
    }

    const response = await axios.post(tokenUrl, null, {
      params
    })

    return { Authorization: `Bearer ${response.data.access_token}` }
  }

  return {}
}
