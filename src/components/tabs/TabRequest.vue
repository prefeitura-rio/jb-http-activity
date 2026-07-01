<template>
  <div class="tab-request">
    <div class="field">
      <label>Metodo</label>
      <select v-model="method">
        <option>GET</option>
        <option>POST</option>
        <option>PUT</option>
        <option>PATCH</option>
        <option>DELETE</option>
      </select>
    </div>

    <div class="field">
      <label>URL</label>
      <div class="url-input-row">
        <input v-model="url" placeholder="https://api.exemplo.com/recurso" />
      </div>
    </div>

    <div class="field">
      <label>Headers</label>
      <KeyValueEditor v-model="headers" key-placeholder="Chave" value-placeholder="Valor" add-label="Adicionar Header" />
    </div>

    <div class="field">
      <label>Query Params</label>
      <KeyValueEditor v-model="queryParams" key-placeholder="Chave" value-placeholder="Valor" add-label="Adicionar Param" />
    </div>

    <div v-if="['POST', 'PUT', 'PATCH'].includes(method)" class="field">
      <label>Body</label>
      <BodyEditor :model-value="body" :content-type="contentType" :schema="schema" @update:model-value="v => body = v" @update:content-type="v => contentType = v" />
    </div>

    <details class="advanced">
      <summary>Opções avançadas</summary>
      <div class="adv-grid">
        <div class="adv-field">
          <label>Timeout (ms) <span class="cap-hint">máx. 30s</span></label>
          <input v-model.number="timeout" type="number" min="1000" max="30000" />
        </div>
        <div class="adv-field">
          <label>Retentativas <span class="cap-hint">máx. 3</span></label>
          <input v-model.number="retryCount" type="number" min="0" max="3" />
        </div>
        <div class="adv-field">
          <label>Delay entre tent. (ms) <span class="cap-hint">máx. 5s</span></label>
          <input v-model.number="retryDelay" type="number" min="0" max="5000" />
        </div>
      </div>
      <div class="adv-toggle">
        <label class="toggle-label">
          <input type="checkbox" v-model="treatErrorsAsOutput" />
          <span>Tratar erros HTTP como saída</span>
        </label>
        <p class="toggle-hint">Quando ativo, respostas 4xx e 5xx não interrompem o fluxo. Use o Decision Split nativo com httpStatusCode para rotear.</p>
      </div>
    </details>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import KeyValueEditor from '../shared/KeyValueEditor.vue'
import BodyEditor from '../shared/BodyEditor.vue'
import { requestConfig } from '../../store.js'

const props = defineProps({
  schema: { type: Array, default: () => [] },
  initialData: { type: Object, default: () => ({}) }
})

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

const method = ref('GET')
const url = ref('')
const headers = ref([])
const queryParams = ref([])
const body = ref('')
const contentType = ref('application/json')
const timeout = ref(30000)
const retryCount = ref(0)
const retryDelay = ref(1000)
const treatErrorsAsOutput = ref(false)

function loadInitialData(data) {
  if (!data) return

  method.value = data.method || 'GET'
  url.value = data.url || ''
  headers.value = parseArray(data.headers)
  queryParams.value = parseArray(data.queryParams)
  body.value = data.body || ''
  contentType.value = data.contentType || 'application/json'
  timeout.value = data.timeout || 30000
  retryCount.value = data.retryCount || 0
  retryDelay.value = data.retryDelay || 1000
  treatErrorsAsOutput.value = !!data.treatErrorsAsOutput
}

function syncStore() {
  requestConfig.method = method.value
  requestConfig.url = url.value
  requestConfig.headers = headers.value
  requestConfig.queryParams = queryParams.value
  requestConfig.body = body.value
  requestConfig.contentType = contentType.value
  requestConfig.timeout = timeout.value
  requestConfig.retryCount = retryCount.value
  requestConfig.retryDelay = retryDelay.value
  requestConfig.treatErrorsAsOutput = treatErrorsAsOutput.value
}

function getData() {
  return {
    method: method.value,
    url: url.value,
    headers: headers.value,
    queryParams: queryParams.value,
    body: body.value,
    contentType: contentType.value,
    timeout: timeout.value,
    retryCount: retryCount.value,
    retryDelay: retryDelay.value,
    treatErrorsAsOutput: treatErrorsAsOutput.value
  }
}

defineExpose({ getData })

watch(
  () => props.initialData,
  (data) => {
    loadInitialData(data)
    syncStore()
  },
  { deep: true, immediate: true }
)

watch(
  [method, url, headers, queryParams, body, contentType, timeout, retryCount, retryDelay, treatErrorsAsOutput],
  syncStore,
  { deep: true }
)
</script>

<style scoped>
.tab-request { display: flex; flex-direction: column; gap: 10px; }
.field label { display: block; font-size: 12px; font-weight: 600; color: #444; margin-bottom: 3px; }
.field select, .field input { width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; box-sizing: border-box; }
.url-input-row { display: flex; gap: 4px; }
.url-input-row input { flex: 1; }
.advanced { border: 1px solid #ddd; border-radius: 4px; padding: 8px; }
.advanced summary { cursor: pointer; font-size: 12px; font-weight: 600; color: #555; }
.adv-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px; }
.adv-field label { font-size: 11px; }
.cap-hint { font-weight: 400; color: #888; font-size: 10px; }
.adv-field input { width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; box-sizing: border-box; }
.adv-toggle { margin-top: 8px; }
.toggle-label { display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; }
.toggle-hint { font-size: 11px; color: #888; margin: 4px 0 0 20px; }
</style>