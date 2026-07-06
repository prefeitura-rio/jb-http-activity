import { Request, Response } from 'express'
import { request } from '../lib/httpClient'
import { resolveAuth } from '../lib/authHandler'
import { extract } from '../lib/responseMapper'
import { InArgObject, HeaderItem, QueryParamItem, AuthConfig, ResponseMappingItem, BodyData, isInArgArray, isHeaderArray, isQueryParamArray, isAuthConfig, isResponseMappingArray } from '../types'

export default async function previewRoute(req: Request, res: Response): Promise<void> {
  let config: InArgObject = {}

  try {
    const body: unknown = req.body
    const inArgs: unknown = body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>).inArguments
      : undefined

    if (!isInArgArray(inArgs)) {
      res.status(400).json({ error: 'inArguments ausente ou invalido' })
      return
    }

    config = inArgs.reduce((acc: InArgObject, arg: InArgObject) => ({ ...acc, ...arg }), {})

    const rawHeaders: unknown = safeParse(config.headers)
    const rawQueryParams: unknown = safeParse(config.queryParams)
    const rawAuth: unknown = safeParse(config.auth)
    const rawResponseMapping: unknown = safeParse(config.responseMapping)

    const headers: HeaderItem[] = isHeaderArray(rawHeaders) ? rawHeaders : []
    const queryParams: QueryParamItem[] = isQueryParamArray(rawQueryParams) ? rawQueryParams : []
    const auth: AuthConfig = isAuthConfig(rawAuth) ? rawAuth : { type: 'none' }
    const responseMapping: ResponseMappingItem[] = isResponseMappingArray(rawResponseMapping) ? rawResponseMapping : []

    const headersMap: Record<string, string> = {}
    for (const h of headers) {
      if (h.key) headersMap[h.key] = h.value || ''
    }

    const paramsMap: Record<string, string> = {}
    for (const p of queryParams) {
      if (p.key) paramsMap[p.key] = p.value || ''
    }

    const authHeaders: Record<string, string> = await resolveAuth(auth)
    Object.assign(headersMap, authHeaders)

    let bodyData: BodyData = null
    const contentType: string = typeof config.contentType === 'string' ? config.contentType : 'application/json'

    const method: string = typeof config.method === 'string' ? config.method : 'GET'
    const configBody: unknown = config.body

    if (configBody && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const bodyStr: string = String(configBody)
      if (contentType === 'application/json') {
        try {
          bodyData = JSON.parse(bodyStr)
        } catch {
          bodyData = bodyStr
        }
      } else if (contentType === 'application/x-www-form-urlencoded') {
        bodyData = new URLSearchParams(bodyStr).toString()
      } else if (contentType === 'multipart/form-data') {
        const fd = new FormData()
        for (const pair of bodyStr.split('&')) {
          const idx: number = pair.indexOf('=')
          if (idx > 0) fd.append(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim())
        }
        bodyData = fd
      } else {
        bodyData = bodyStr
      }
    }

    if (!headersMap['Content-Type'] && !headersMap['content-type']) {
      headersMap['Content-Type'] = contentType
    }

    const startTime: number = Date.now()

    const httpResponse = await request({
      method,
      url: typeof config.url === 'string' ? config.url : '',
      headers: headersMap,
      queryParams: paramsMap,
      body: bodyData,
      timeout: typeof config.timeout === 'number' ? config.timeout : 30000,
      retryCount: typeof config.retryCount === 'number' ? config.retryCount : 0,
      retryDelay: typeof config.retryDelay === 'number' ? config.retryDelay : 1000
    })

    const durationMs: number = Date.now() - startTime
    const statusCode: number = httpResponse.status
    const statusClass: string = `${Math.floor(statusCode / 100)}xx`
    const isSuccess: boolean = statusCode >= 200 && statusCode < 300

    const mapped: Record<string, unknown> = extract(httpResponse.data, responseMapping)

    const outArgs: Record<string, unknown> = {
      _rawBody: httpResponse.data,
      _duration: durationMs,
      _timestamp: new Date().toISOString(),
      _url: config.url,
      _method: config.method,
      _statusClass: statusClass,
      _attempts: httpResponse.attempts,
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

    res.status(200).json(outArgs)
  } catch (err: unknown) {
    const errMessage: string = err instanceof Error ? err.message : 'Erro desconhecido'

    // ALLOWLIST: resposta amigavel com instrucao de correcao
    if (errMessage.includes('ALLOWLIST:')) {
      const blockedDomain: string = errMessage.split('ALLOWLIST:')[1]?.trim() || 'desconhecido'
      const outArgs: Record<string, unknown> = {
        _duration: 0,
        _timestamp: new Date().toISOString(),
        _url: config ? (typeof config.url === 'string' ? config.url : 'unknown') : 'unknown',
        _attempts: 1,
        httpStatusCode: 0,
        httpStatusClass: '0xx',
        httpSuccess: false
      }

      console.log('[PREVIEW]', JSON.stringify({
        method: config ? (typeof config.method === 'string' ? config.method : 'unknown') : 'unknown',
        url: config ? (typeof config.url === 'string' ? config.url : 'unknown') : 'unknown',
        httpStatus: 0,
        error: `ALLOWLIST: ${blockedDomain}`
      }))

      res.status(403).json({
        error: 'URL nao liberada',
        blockedDomain,
        message: `O dominio "${blockedDomain}" nao esta na lista de endpoints permitidos.`,
        howToFix: 'Adicione o dominio na variavel HTTP_ALLOWLIST no Infisical e reinicie o servico.'
      })
      return
    }

    const outArgs: Record<string, unknown> = {
      _duration: 0,
      _timestamp: new Date().toISOString(),
      _url: config ? (typeof config.url === 'string' ? config.url : 'unknown') : 'unknown',
      _attempts: err instanceof Error && '_attempts' in err ? (err as unknown as Record<string, unknown>)._attempts : 1,
      httpStatusCode: 0,
      httpStatusClass: '0xx',
      httpSuccess: false
    }

    console.log('[PREVIEW]', JSON.stringify({
      method: config ? (typeof config.method === 'string' ? config.method : 'unknown') : 'unknown',
      url: config ? (typeof config.url === 'string' ? config.url : 'unknown') : 'unknown',
      httpStatus: 0,
      error: errMessage
    }))

    const errorResponse: Record<string, unknown> = {
      error: errMessage,
      ...outArgs
    }

    res.status(500).json(errorResponse)
  }
}

function safeParse(str: unknown): unknown {
  if (str == null) return undefined
  if (typeof str === 'object') return str
  if (typeof str === 'string') {
    try {
      return JSON.parse(str)
    } catch {
      return str
    }
  }
  return str
}

// (not needed - using export default)
