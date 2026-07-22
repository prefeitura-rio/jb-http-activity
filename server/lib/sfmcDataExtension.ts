import axios from 'axios'

interface CachedToken {
  accessToken: string
  soapInstanceUrl: string
  expiresAt: number
}

let cachedToken: CachedToken | null = null

export interface SfmcUpdateResult {
  success: boolean
  statusCode?: number
  error?: string
}

export function isSfmcConfigured(): boolean {
  return !!(
    process.env.SFMC_AUTH_URI &&
    process.env.SFMC_CLIENT_ID &&
    process.env.SFMC_CLIENT_SECRET
  )
}

async function getAuthContext(): Promise<{ accessToken: string; soapInstanceUrl: string }> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return { accessToken: cachedToken.accessToken, soapInstanceUrl: cachedToken.soapInstanceUrl }
  }

  const authUri: string = (process.env.SFMC_AUTH_URI as string).replace(/\/+$/, '')

  const response = await axios.post(`${authUri}/v2/token`, {
    grant_type: 'client_credentials',
    client_id: process.env.SFMC_CLIENT_ID,
    client_secret: process.env.SFMC_CLIENT_SECRET
  }, { timeout: 10000 })

  const accessToken: string = response.data.access_token
  const soapInstanceUrl: string = (response.data.soap_instance_url as string).replace(/\/+$/, '')
  const expiresInMs: number = (response.data.expires_in || 1200) * 1000

  cachedToken = {
    accessToken,
    soapInstanceUrl,
    expiresAt: Date.now() + expiresInMs - 30000
  }

  return { accessToken, soapInstanceUrl }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildUpdateEnvelope(
  token: string,
  deExternalKey: string,
  keyField: string,
  primaryKeyValue: string,
  values: Record<string, unknown>
): string {
  const allFields: Record<string, unknown> = { [keyField]: primaryKeyValue, ...values }

  const propertiesXml: string = Object.entries(allFields)
    .map(([name, value]) => `<Property><Name>${escapeXml(name)}</Name><Value>${escapeXml(String(value))}</Value></Property>`)
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soap:Header>
    <fueloauth xmlns="http://exacttarget.com">${token}</fueloauth>
  </soap:Header>
  <soap:Body>
    <UpdateRequest xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <Options>
        <SaveAction>Update</SaveAction>
      </Options>
      <Objects xsi:type="DataExtensionObject">
        <CustomerKey>${escapeXml(deExternalKey)}</CustomerKey>
        <Properties>${propertiesXml}</Properties>
      </Objects>
    </UpdateRequest>
  </soap:Body>
</soap:Envelope>`
}

function extractSoapError(body: string): string {
  const faultMatch: RegExpMatchArray | null = body.match(/<faultstring>([\s\S]*?)<\/faultstring>/)
  if (faultMatch) return faultMatch[1].trim()

  const statusMatch: RegExpMatchArray | null = body.match(/<StatusMessage>([\s\S]*?)<\/StatusMessage>/)
  if (statusMatch) return statusMatch[1].trim()

  return body.slice(0, 500)
}

export async function updateDataExtensionRow(
  primaryKeyValue: string,
  values: Record<string, unknown>,
  deExternalKey: string,
  keyField?: string
): Promise<SfmcUpdateResult> {
  try {
    const { accessToken, soapInstanceUrl } = await getAuthContext()
    const resolvedKeyField: string = keyField && keyField.trim() !== '' ? keyField.trim() : 'SubscriberKey'

    const envelope: string = buildUpdateEnvelope(accessToken, deExternalKey, resolvedKeyField, primaryKeyValue, values)

    const response = await axios.post(`${soapInstanceUrl}/Service.asmx`, envelope, {
      headers: {
        'Content-Type': 'text/xml',
        SOAPAction: 'Update'
      },
      timeout: 15000,
      validateStatus: () => true
    })

    const bodyStr: string = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
    const isOk: boolean = response.status >= 200 && response.status < 300 && bodyStr.includes('<OverallStatus>OK</OverallStatus>')

    if (isOk) {
      return { success: true, statusCode: response.status }
    }

    return {
      success: false,
      statusCode: response.status,
      error: extractSoapError(bodyStr)
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido ao atualizar Data Extension'
    }
  }
}
