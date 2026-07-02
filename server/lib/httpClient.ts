import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { validateUrl } from './blocklist'
import { HttpRequestConfig, HttpResponse } from '../types'

export function shouldRetry(attempt: number, retryCount: number, response: AxiosResponse | null): boolean {
  if (attempt >= retryCount) return false
  if (!response) return true
  return response.status >= 500
}

export async function request(config: HttpRequestConfig): Promise<HttpResponse> {
  const { method, url, headers, queryParams, body } = config
  const retryCount: number = Math.min(config.retryCount || 0, 3)
  const retryDelay: number = Math.min(config.retryDelay || 1000, 5000)

  if (url) {
    const validation = await validateUrl(url)
    if (!validation.valid) {
      throw new Error(`URL bloqueada: ${(validation as { valid: false; error: string }).error}`)
    }
  }

  const reqConfig: AxiosRequestConfig = {
    method: (method as AxiosRequestConfig['method']) || 'GET',
    url: url || '',
    headers: (headers || {}) as Record<string, string>,
    params: queryParams || {},
    timeout: Math.min(config.timeout || 30000, 40000),
    validateStatus: () => true
  }

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    reqConfig.data = body
  }

  let lastResponse: AxiosResponse | null = null
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const response: AxiosResponse = await axios(reqConfig)
      lastResponse = response
      if (shouldRetry(attempt, retryCount, response)) {
        await sleep(retryDelay)
        continue
      }
      if (response.status >= 400) {
        break
      }
      return { status: response.status, data: response.data, attempts: attempt + 1 }
    } catch (err: unknown) {
      if (err instanceof Error) {
        lastError = err
      } else {
        lastError = new Error(String(err))
      }
      if (shouldRetry(attempt, retryCount, null)) {
        await sleep(retryDelay)
        continue
      }
      break
    }
  }

  if (lastError) {
    ;(lastError as Error & { _attempts?: number })._attempts = retryCount + 1
    throw lastError
  }

  throw new Error('Nenhuma resposta recebida')
}

export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
