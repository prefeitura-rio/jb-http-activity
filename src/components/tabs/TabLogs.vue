<template>
  <div class="tab-logs">
    <div class="error-section">
      <div class="error-header">
        <h4>Ultimo erro registrado</h4>
        <button class="refresh-btn" @click="fetchLogs" :disabled="loading">
          {{ loading ? 'Atualizando...' : 'Atualizar' }}
        </button>
      </div>
      <div v-if="lastError" class="error-card">
        <div class="error-timestamp">{{ formatTimestamp(lastError.timestamp) }}</div>
        <div class="error-message">{{ lastError.message }}</div>
        <div class="error-url">{{ lastError.url }}</div>
        <div class="error-details">
          <span>ContactKey: {{ lastError.contactKey || '—' }}</span>
          <span>ActivityId: {{ lastError.activityId || '—' }}</span>
          <span>Method: {{ lastError.method || '—' }}</span>
          <span>Status: {{ lastError.httpStatus || '—' }}</span>
          <span>Duracao: {{ lastError.durationMs }}ms</span>
        </div>
      </div>
      <div v-else class="no-error">Nenhum erro registrado</div>
    </div>
    <div class="retry-section">
      <h4>Configuracao de retry ativa</h4>
      <p v-if="retryCount > 0">{{ retryCount }} tentativas  -  {{ retryDelay }}ms de delay</p>
      <p v-else>Retry desativado</p>
    </div>
    <div v-if="fetchError" class="fetch-error">Erro ao buscar logs: {{ fetchError }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const props = defineProps({
  initialData: { type: Object, default: () => ({}) }
})

const lastError = ref(null)
const loading = ref(false)
const fetchError = ref(null)
const retryCount = ref(props.initialData.retryCount || 0)
const retryDelay = ref(props.initialData.retryDelay || 1000)

function formatTimestamp(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('pt-BR')
}

async function fetchLogs() {
  loading.value = true
  fetchError.value = null
  try {
    const { data } = await axios.get('/logs?type=errors&limit=1')
    lastError.value = data.length > 0 ? data[0] : null
  } catch (err) {
    fetchError.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(fetchLogs)
</script>

<style scoped>
.tab-logs { display: flex; flex-direction: column; gap: 12px; }
h4 { margin: 0; font-size: 13px; color: #333; }
.error-header { display: flex; justify-content: space-between; align-items: center; }
.refresh-btn { font-size: 11px; padding: 2px 8px; cursor: pointer; border: 1px solid #ccc; border-radius: 3px; background: #fff; }
.refresh-btn:disabled { opacity: 0.6; cursor: default; }
.error-card { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 8px; margin-top: 4px; }
.error-timestamp { font-size: 12px; color: #856404; font-family: monospace; }
.error-message { font-size: 13px; color: #721c24; margin: 4px 0; font-weight: 600; }
.error-url { font-size: 12px; color: #555; word-break: break-all; }
.error-details { display: flex; flex-direction: column; gap: 2px; margin-top: 6px; font-size: 11px; color: #666; }
.no-error { font-size: 12px; color: #888; font-style: italic; }
.retry-section { font-size: 12px; color: #555; }
.fetch-error { font-size: 12px; color: #c00; }
</style>
