<template>
  <div class="tab-response">
    <div class="builtin-section">
      <h4>Variáveis built-in (sempre disponíveis)</h4>
      <p class="hint">Geradas automaticamente, sem configuração</p>
      <div class="builtin-list">
        <code>httpStatusCode  (number) ex: 200</code>
        <code>httpStatusClass (text)   ex: "2xx"</code>
        <code>httpSuccess     (boolean) ex: true</code>
      </div>
      <div class="builtin-vars">
        <code v-text="'{{Interaction.HTTP-1.httpStatusCode}}'"></code>
        <code v-text="'{{Interaction.HTTP-1.httpStatusClass}}'"></code>
        <code v-text="'{{Interaction.HTTP-1.httpSuccess}}'"></code>
      </div>
    </div>

    <div class="mapping-section">
      <h4>Mapeamento de campos da resposta</h4>
      <ResponseMapping v-model="responseMapping" @openFunctions="showFunctions = true" />
    </div>

    <div v-if="allVariables.length" class="all-vars-section">
      <h4>Todas as variáveis geradas</h4>
      <p class="hint">Use nas atividades seguintes:</p>
      <div class="vars-list">
        <code v-for="v in allVariables" :key="v" v-text="v"></code>
      </div>
      <button class="btn-copy" @click="copyAll">Copiar todas</button>
    </div>

    <div class="test-section">
      <h4>Testar requisição</h4>
      <button class="btn-exec" @click="executeTest" :disabled="testing">
        {{ testing ? 'Executando...' : 'Executar com dados de teste' }}
      </button>
      <div v-if="testResponse" class="test-response">
        <div class="response-status-row">
          <span>API: </span>
          <span v-if="testResponse.isError" class="error-badge">{{ testResponse.statusCode }} {{ testResponse.statusText }}</span>
          <span v-else class="ok-badge">{{ testResponse.statusCode }} OK</span>
          <span class="backend-label">  Backend: </span>
          <span :class="testResponse.backendStatus < 300 ? 'ok-badge-small' : 'error-badge-small'">{{ testResponse.backendStatus }}</span>
        </div>
        <div class="response-meta">
          <span class="meta-url">{{ testResponse.url }}</span>
          <span class="meta-duration">{{ testResponse.duration }}ms</span>
          <span class="meta-attempts" v-if="testResponse.attempts > 1">{{ testResponse.attempts - 1 }} retentativa{{ testResponse.attempts > 2 ? 's' : '' }}</span>
          <span class="meta-timestamp">{{ testResponse.timestamp }}</span>
        </div>
        <div v-if="testResponse.body" class="response-body">
          <pre>{{ testResponse.body }}</pre>
        </div>
        <div class="response-mappings">
          <div v-for="(val, key) in testResponse.mapped" :key="key" class="mapped-result" :class="mappedClass(val)" v-text="mappedText(key, val)"></div>
        </div>
      </div>
      <div v-if="testError" class="test-error">
        <div class="error-header-bar">
          <span class="error-badge-large">{{ testError.statusCode || '—' }} {{ testError.statusText || 'Erro' }}</span>
          <span class="backend-label" v-if="testError.backendStatus">  Backend: </span>
          <span class="error-badge-small" v-if="testError.backendStatus">{{ testError.backendStatus }}</span>
        </div>
        <div class="error-detail">
          <div class="error-url">{{ testError.url }}</div>
          <div class="error-meta-row">
            <span v-if="testError.duration" class="error-duration">{{ testError.duration }}ms</span>
            <span class="error-attempts" v-if="testError.attempts > 1">{{ testError.attempts - 1 }} retentativa{{ testError.attempts > 2 ? 's' : '' }}</span>
            <span class="error-timestamp">{{ testError.timestamp }}</span>
          </div>
          <div class="error-message-text">{{ testError.message }}</div>
        </div>
      </div>
    </div>

    <FunctionHelperModal :visible="showFunctions" @close="showFunctions = false" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ResponseMapping from '../shared/ResponseMapping.vue'
import FunctionHelperModal from '../shared/FunctionHelperModal.vue'
import axios from 'axios'
import { requestConfig } from '../../store.js'

const props = defineProps({
  initialData: { type: Object, default: () => ({}) }
})

const responseMapping = ref([])
const showFunctions = ref(false)
const testing = ref(false)
const testResponse = ref(null)
const testError = ref('')

function parseArray(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      return []
    }
  }
  return []
}

function loadInitialData(data) {
  if (!data) return
  responseMapping.value = parseArray(data.responseMapping)
}

function getData() {
  return {
    responseMapping: responseMapping.value || []
  }
}

defineExpose({ getData })

watch(
  () => props.initialData,
  (data) => {
    loadInitialData(data)
  },
  { deep: true, immediate: true }
)

const allVariables = computed(() => {
  const builtins = ['{{Interaction.HTTP-1.httpStatusCode}}', '{{Interaction.HTTP-1.httpStatusClass}}', '{{Interaction.HTTP-1.httpSuccess}}']
  const mapped = (responseMapping.value || []).filter(m => m.outputName).map(m => '{{Interaction.HTTP-1.' + m.outputName + '}}')
  return [...builtins, ...mapped]
})

function formatTimestamp(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString('pt-BR')
  } catch {
    return ts
  }
}

function truncateUrl(url) {
  if (!url) return '—'
  try {
    const u = new URL(url)
    return u.host + u.pathname
  } catch {
    return url.length > 50 ? url.substring(0, 50) + '...' : url
  }
}

async function executeTest() {
  testing.value = true
  testError.value = ''
  testResponse.value = null

  try {
    const res = await axios.post(`${import.meta.env.BASE_URL}preview`, {
      inArguments: [
        { method: requestConfig.method },
        { url: requestConfig.url },
        { headers: requestConfig.headers },
        { queryParams: requestConfig.queryParams },
        { body: requestConfig.body },
        { contentType: requestConfig.contentType },
        { auth: requestConfig.auth },
        { responseMapping: responseMapping.value },
        { treatErrorsAsOutput: requestConfig.treatErrorsAsOutput, timeout: requestConfig.timeout, retryCount: requestConfig.retryCount, retryDelay: requestConfig.retryDelay }
      ]
    })

    const isError = res.data.httpStatusCode >= 400
    const mapped = {}
    for (const m of responseMapping.value) {
      if (m.outputName) mapped[m.outputName] = res.data[m.outputName]
    }

    testResponse.value = {
      isError,
      backendStatus: res.status,
      statusCode: res.data.httpStatusCode,
      statusText: isError ? (res.data.httpStatusClass || 'Error') : 'OK',
      url: truncateUrl(res.data._url || requestConfig.url),
      duration: res.data._duration || 0,
      timestamp: formatTimestamp(res.data._timestamp),
      attempts: res.data._attempts || 1,
      body: res.data._rawBody ? (typeof res.data._rawBody === 'string' ? res.data._rawBody : JSON.stringify(res.data._rawBody, null, 2)) : '',
      mapped: { ...mapped, httpStatusCode: res.data.httpStatusCode, httpSuccess: res.data.httpSuccess }
    }
  } catch (err) {
    const errorData = err.response?.data
    testError.value = {
      backendStatus: err.response?.status,
      statusCode: errorData?.httpStatusCode || err.response?.status || '—',
      statusText: errorData?.httpStatusClass || 'Falha',
      url: truncateUrl(requestConfig.url),
      duration: errorData?._duration || 0,
      attempts: errorData?._attempts || 1,
      timestamp: formatTimestamp(errorData?._timestamp),
      message: err.response?.data?.error || err.message || 'Erro de conexao'
    }
  } finally {
    testing.value = false
  }
}

function mappedClass(val) {
  return { success: val !== null && val !== '', fail: val === null || val === '' }
}

function mappedText(key, val) {
  return key + '  ->  "' + (val != null ? val : '') + '"'
}

function copyAll() {
  navigator.clipboard.writeText(allVariables.value.join('\n'))
}
</script>

<style scoped>
.tab-response { display: flex; flex-direction: column; gap: 12px; }
h4 { margin: 0; font-size: 13px; color: #333; }
.hint { font-size: 11px; color: #888; margin: 2px 0; }
.builtin-section { background: #f9f9f9; border: 1px solid #eee; border-radius: 4px; padding: 8px; }
.builtin-list, .builtin-vars { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; }
.builtin-list code, .builtin-vars code { font-size: 12px; font-family: monospace; }
.builtin-vars { margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee; }
.builtin-vars code { color: #0070d2; }
.all-vars-section { background: #f0f7ff; border: 1px solid #cce5ff; border-radius: 4px; padding: 8px; }
.vars-list { display: flex; flex-direction: column; gap: 2px; margin: 4px 0; }
.vars-list code { font-size: 12px; font-family: monospace; color: #0070d2; }
.btn-copy { background: #28a745; color: #fff; border: none; border-radius: 3px; padding: 5px 10px; cursor: pointer; font-size: 12px; }
.btn-exec { background: #0070d2; color: #fff; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer; font-size: 13px; }
.btn-exec:disabled { background: #999; cursor: not-allowed; }
.test-response { background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin-top: 8px; }
.response-meta { font-size: 11px; color: #888; margin-bottom: 4px; }
.test-response pre { font-size: 11px; font-family: monospace; background: #fff; border: 1px solid #eee; border-radius: 3px; padding: 6px; overflow-x: auto; }
.mapped-result { font-size: 12px; padding: 2px 4px; margin-top: 2px; border-radius: 2px; }
.mapped-result.success { background: #d4edda; color: #155724; }
.mapped-result.fail { background: #fff3cd; color: #856404; }
.test-error { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 8px; margin-top: 8px; }
.error-header-bar { margin-bottom: 6px; }
.error-badge-large { display: inline-block; background: #dc3545; color: #fff; padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; }
.error-detail { font-size: 12px; color: #555; }
.error-url { font-family: monospace; font-size: 11px; color: #856404; word-break: break-all; margin-bottom: 2px; }
.error-duration { font-size: 11px; color: #888; }
.error-attempts { font-size: 10px; color: #856404; background: #fff3cd; padding: 0 4px; border-radius: 2px; }
.error-meta-row { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
.error-timestamp { font-size: 11px; color: #888; }
.error-message-text { color: #721c24; font-weight: 600; margin-top: 4px; }
.response-error-header { margin-bottom: 4px; }
.response-ok-header { margin-bottom: 4px; }
.error-badge { display: inline-block; background: #dc3545; color: #fff; padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; }
.ok-badge { display: inline-block; background: #28a745; color: #fff; padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; }
.ok-badge-small { display: inline-block; background: #28a745; color: #fff; padding: 1px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; }
.error-badge-small { display: inline-block; background: #dc3545; color: #fff; padding: 1px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; }
.backend-label { font-size: 11px; color: #888; }
.response-status-row { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; flex-wrap: wrap; }
.response-meta { display: flex; gap: 8px; font-size: 11px; color: #888; margin-bottom: 6px; flex-wrap: wrap; }
.meta-url { font-family: monospace; color: #555; word-break: break-all; }
.meta-duration { color: #666; white-space: nowrap; }
.meta-attempts { color: #856404; background: #fff3cd; padding: 0 4px; border-radius: 2px; font-size: 10px; white-space: nowrap; }
.meta-timestamp { color: #888; white-space: nowrap; }
.response-body pre { font-size: 11px; font-family: monospace; background: #fff; border: 1px solid #eee; border-radius: 3px; padding: 6px; overflow-x: auto; margin: 4px 0; }
.response-mappings { margin-top: 4px; }
</style>