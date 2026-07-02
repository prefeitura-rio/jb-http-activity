import { reactive } from 'vue'

interface RequestConfig {
  method: string
  url: string
  headers: { key: string; value?: string }[]
  queryParams: { key: string; value?: string }[]
  body: string
  contentType: string
  auth: Record<string, unknown>
  treatErrorsAsOutput: boolean
  timeout: number
  retryCount: number
  retryDelay: number
}

export const requestConfig = reactive<RequestConfig>({
  method: 'GET',
  url: '',
  headers: [],
  queryParams: [],
  body: '',
  contentType: 'application/json',
  auth: { type: 'none' },
  treatErrorsAsOutput: false,
  timeout: 30000,
  retryCount: 0,
  retryDelay: 1000
})

export function updateRequestConfig(data: Partial<RequestConfig>): void {
  Object.assign(requestConfig, data)
}
