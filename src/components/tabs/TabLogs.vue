<template>
  <div class="tab-logs">
    <div class="error-section">
      <h4>Ultimo erro registrado</h4>
      <div v-if="lastError" class="error-card">
        <div class="error-timestamp">{{ lastError.timestamp }}</div>
        <div class="error-message">{{ lastError.message }}</div>
        <div class="error-url">{{ lastError.url }}</div>
        <div class="error-details">
          <span>ContactKey: {{ lastError.contactKey }}</span>
          <span>ActivityId: {{ lastError.activityId }}</span>
        </div>
      </div>
      <div v-else class="no-error">Nenhum erro registrado</div>
    </div>
    <div class="retry-section">
      <h4>Configuracao de retry ativa</h4>
      <p v-if="retryCount > 0">{{ retryCount }} tentativas  -  {{ retryDelay }}ms de delay</p>
      <p v-else>Retry desativado</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  initialData: { type: Object, default: () => ({}) }
})

const lastError = ref(null)
const retryCount = ref(props.initialData.retryCount || 0)
const retryDelay = ref(props.initialData.retryDelay || 1000)
</script>

<style scoped>
.tab-logs { display: flex; flex-direction: column; gap: 12px; }
h4 { margin: 0; font-size: 13px; color: #333; }
.error-card { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 8px; margin-top: 4px; }
.error-timestamp { font-size: 12px; color: #856404; font-family: monospace; }
.error-message { font-size: 13px; color: #721c24; margin: 4px 0; font-weight: 600; }
.error-url { font-size: 12px; color: #555; }
.error-details { display: flex; flex-direction: column; gap: 2px; margin-top: 6px; font-size: 11px; color: #666; }
.no-error { font-size: 12px; color: #888; font-style: italic; }
.retry-section { font-size: 12px; color: #555; }
</style>
