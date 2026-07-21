import { Request, Response } from 'express'
import { request } from '../lib/httpClient'
import { resolveAuth } from '../lib/authHandler'
import { extract } from '../lib/responseMapper'
import logger from '../lib/structuredLogger'
import { log as bigQueryLog } from '../lib/bigQueryLogger'
import { InArgObject, HeaderItem, QueryParamItem, AuthConfig, ResponseMappingItem, BodyData, OutArgs, LogEntry, isInArgArray, isHeaderArray, isQueryParamArray, isAuthConfig, isResponseMappingArray } from '../types'

export default async function executeRoute(req: Request, res: Response): Promise<void> {
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

    const requestInput: Record<string, unknown> = {
      url: config.url,
      method,
      headers: headersMap,
      queryParams: paramsMap,
      body: bodyData
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

    const outArgs: OutArgs = {
      httpStatusCode: statusCode,
      httpStatusClass: statusClass,
      httpSuccess: isSuccess,
      ...mapped
    }

    if (config._preview === true) {
      outArgs._rawBody = httpResponse.data
      outArgs._duration = durationMs
      outArgs._timestamp = new Date().toISOString()
      outArgs._url = config.url
      outArgs._method = config.method
      outArgs._statusClass = statusClass
      outArgs._attempts = httpResponse.attempts
    }

    const logEntryRaw: Record<string, unknown> = {
      journeyId: body && typeof body === 'object' ? (body as Record<string, unknown>).journeyId : undefined,
      contactKey: body && typeof body === 'object' ? (body as Record<string, unknown>).contactKey : undefined,
      activityId: body && typeof body === 'object' ? (body as Record<string, unknown>).activityId : undefined,
      method: config.method,
      url: config.url,
      httpStatus: statusCode,
      durationMs,
      statusClass,
      success: isSuccess,
      treatErrorsAsOutput: config.treatErrorsAsOutput,
      outArguments: outArgs,
      requestInput,
      errorSummary: null,
      message: isSuccess
        ? `HTTP ${statusCode} (${durationMs}ms)`
        : `HTTP ${statusCode} - ${statusClass}`
    }

    const logEntry: LogEntry = logEntryRaw as unknown as LogEntry

    logger.info(logEntry)
    bigQueryLog(logEntry)

    const treatErrors: boolean = config.treatErrorsAsOutput === true

    if (!treatErrors && !isSuccess) {
      res.status(500).json({
        error: `HTTP ${statusCode} da API externa`,
        httpStatusCode: statusCode,
        httpStatusClass: statusClass,
        httpSuccess: false,
        ...mapped
      })
      return
    }

    res.status(200).json(outArgs)
  } catch (err: unknown) {
    const outArgs: OutArgs = {
      httpStatusCode: 0,
      httpStatusClass: '0xx',
      httpSuccess: false
    }

    const logEntryRaw: Record<string, unknown> = {
      journeyId: req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>).journeyId : null,
      contactKey: req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>).contactKey : null,
      activityId: req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>).activityId : null,
      method: 'unknown',
      url: config ? (typeof config.url === 'string' ? config.url : 'unknown') : 'unknown',
      httpStatus: 0,
      durationMs: 0,
      statusClass: '0xx',
      success: false,
      outArguments: outArgs,
      requestInput: undefined,
      errorSummary: err instanceof Error ? err.message : 'Erro interno',
      message: `Erro: ${err instanceof Error ? err.message : 'Erro interno do servidor'}`
    }

    const logEntry: LogEntry = logEntryRaw as unknown as LogEntry

    logger.error(logEntry)
    bigQueryLog(logEntry)

    const errorResponse: Record<string, unknown> = {
      error: err instanceof Error ? err.message : 'Erro interno do servidor',
      ...outArgs
    }

    if (config._preview === true && err instanceof Error && '_attempts' in err) {
      errorResponse._attempts = (err as unknown as Record<string, unknown>)._attempts
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
