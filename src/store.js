import { reactive } from 'vue'

export const requestConfig = reactive({
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

export function updateRequestConfig(data) {
  Object.assign(requestConfig, data)
}
