<template>
  <div class="tab-response">
    <div class="builtin-section">
      <h4>Variaveis built-in (sempre disponiveis)</h4>
      <p class="hint">Geradas automaticamente, sem configuracao</p>
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
      <h4>Mapeamento de campos do response</h4>
      <ResponseMapping v-model="responseMapping" @openFunctions="showFunctions = true" />
    </div>

    <div v-if="allVariables.length" class="all-vars-section">
      <h4>Todas as variaveis geradas</h4>
      <p class="hint">Use nas atividades seguintes:</p>
      <div class="vars-list">
        <code v-for="v in allVariables" :key="v" v-text="v"></code>
      </div>
      <button class="btn-copy" @click="copyAll">Copiar todas</button>
    </div>

    <div class="test-section">
      <h4>Testar request</h4>
      <button class="btn-exec" @click="executeTest" :disabled="testing">
        {{ testing ? 'Executando...' : 'Executar com dados de teste' }}
      </button>
      <div v-if="testResponse" class="test-response">
        <div class="response-meta">{{ testResponse.statusCode }} OK  -  {{ testResponse.duration }}ms</div>
        <pre>{{ testResponse.body }}</pre>
        <div v-for="(val, key) in testResponse.mapped" :key="key" class="mapped-result" :class="mappedClass(val)" v-text="mappedText(key, val)"></div>
      </div>
      <div v-if="testError" class="test-error">{{ testError }}</div>
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

async function executeTest() {
  testing.value = true
  testError.value = ''
  testResponse.value = null

  try {
    const res = await axios.post('/execute', {
      inArguments: [
        { method: requestConfig.method },
        { url: requestConfig.url },
        { headers: requestConfig.headers },
        { queryParams: requestConfig.queryParams },
        { body: requestConfig.body },
        { auth: requestConfig.auth },
        { responseMapping: responseMapping.value },
        { treatErrorsAsOutput: true, timeout: requestConfig.timeout, _preview: true }
      ]
    })

    const mapped = {}
    for (const m of responseMapping.value) {
      if (m.outputName) mapped[m.outputName] = res.data[m.outputName]
    }

    testResponse.value = {
      statusCode: res.data.httpStatusCode,
      duration: 0,
      body: res.data._rawBody || JSON.stringify(res.data, null, 2),
      mapped: { ...mapped, httpStatusCode: res.data.httpStatusCode, httpSuccess: res.data.httpSuccess }
    }
  } catch (err) {
    testError.value = 'Erro: ' + (err.message || 'conexao')
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
.test-error { color: #721c24; background: #f8d7da; padding: 6px; border-radius: 3px; font-size: 12px; }
</style>