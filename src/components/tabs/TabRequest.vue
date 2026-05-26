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
        <VariablePicker :schema="schema" @insert="v => url += v" />
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
      <summary>Opcoes avancadas</summary>
      <div class="adv-grid">
        <div class="adv-field">
          <label>Timeout (ms)</label>
          <input v-model.number="timeout" type="number" min="1000" max="100000" />
        </div>
        <div class="adv-field">
          <label>Tentativas</label>
          <input v-model.number="retryCount" type="number" min="0" max="10" />
        </div>
        <div class="adv-field">
          <label>Delay entre tent. (ms)</label>
          <input v-model.number="retryDelay" type="number" min="0" max="30000" />
        </div>
      </div>
      <div class="adv-toggle">
        <label class="toggle-label">
          <input type="checkbox" v-model="treatErrorsAsOutput" />
          <span>Tratar erros HTTP como saida</span>
        </label>
        <p class="toggle-hint">Quando ativo, respostas 4xx e 5xx nao interrompem o fluxo. Use o Decision Split nativo com httpStatusCode para rotear.</p>
      </div>
    </details>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import KeyValueEditor from '../shared/KeyValueEditor.vue'
import VariablePicker from '../shared/VariablePicker.vue'
import BodyEditor from '../shared/BodyEditor.vue'

const props = defineProps({
  schema: { type: Array, default: () => [] },
  initialData: { type: Object, default: () => ({}) }
})

const method = ref(props.initialData.method || 'GET')
const url = ref(props.initialData.url || '')
const headers = ref(props.initialData.headers || [])
const queryParams = ref(props.initialData.queryParams || [])
const body = ref(props.initialData.body || '')
const contentType = ref(props.initialData.contentType || 'application/json')
const timeout = ref(props.initialData.timeout || 30000)
const retryCount = ref(props.initialData.retryCount || 0)
const retryDelay = ref(props.initialData.retryDelay || 1000)
const treatErrorsAsOutput = ref(props.initialData.treatErrorsAsOutput || false)
</script>

<style scoped>
.tab-request { display: flex; flex-direction: column; gap: 10px; }
.field label { display: block; font-size: 12px; font-weight: 600; color: #444; margin-bottom: 3px; }
.field select, .field input { width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; box-sizing: border-box; }
.url-input-row { display: flex; gap: 4px; }
.url-input-row input { flex: 1; }
.url-input-row .var-picker select { width: auto; }
.advanced { border: 1px solid #ddd; border-radius: 4px; padding: 8px; }
.advanced summary { cursor: pointer; font-size: 12px; font-weight: 600; color: #555; }
.adv-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px; }
.adv-field label { font-size: 11px; }
.adv-field input { width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; box-sizing: border-box; }
.adv-toggle { margin-top: 8px; }
.toggle-label { display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; }
.toggle-hint { font-size: 11px; color: #888; margin: 4px 0 0 20px; }
</style>
