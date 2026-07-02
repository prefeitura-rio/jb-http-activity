<template>
  <div class="tab-auth">
    <div class="field">
      <label>Tipo de Autenticação</label>
      <select v-model="authType">
        <option value="none">None</option>
        <option value="bearer">Bearer Token</option>
        <option value="oauth2_client_credentials">OAuth 2.0 - Client Credentials</option>
      </select>
    </div>

    <div v-if="authType === 'bearer'" class="field">
      <label>Token</label>
      <div class="token-row">
        <input v-model="bearerToken" placeholder="Token ou {{var}}" type="text" />
        <VariablePicker :schema="schema" @insert="v => bearerToken += v" />
      </div>
    </div>

    <div v-if="authType === 'oauth2_client_credentials'" class="oauth-fields">
      <div class="field">
        <label>Token URL</label>
        <input v-model="tokenUrl" placeholder="https://auth.exemplo.com/oauth/token" />
      </div>
      <div class="field">
        <label>Client ID</label>
        <input v-model="clientId" placeholder="client-id" />
      </div>
      <div class="field">
        <label>Client Secret</label>
        <div class="secret-row">
          <input v-model="clientSecret" :type="showSecret ? 'text' : 'password'" placeholder="••••••••••" />
          <button class="btn-eye" @click="showSecret = !showSecret">{{ showSecret ? 'O' : 'O' }}</button>
        </div>
      </div>
      <div class="field">
        <label>Scope (opcional)</label>
        <input v-model="scope" placeholder="divida:read boleto:write" />
      </div>
      <button class="btn-test" @click="testConnection">Testar conexão</button>
      <div v-if="testResult" class="test-result" :class="{ success: testOk, fail: !testOk }">
        {{ testResult }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import VariablePicker from '../shared/VariablePicker.vue'
import axios from 'axios'
import { requestConfig } from '../../store'

const props = defineProps<{
  schema?: unknown[]
}>()

const authType = ref<string>('none')
const bearerToken = ref<string>('')
const tokenUrl = ref<string>('')
const clientId = ref<string>('')
const clientSecret = ref<string>('')
const scope = ref<string>('')
const showSecret = ref<boolean>(false)
const testResult = ref<string>('')
const testOk = ref<boolean>(false)

function syncAuth(): void {
  if (authType.value === 'none') {
    requestConfig.auth = { type: 'none' }
  } else if (authType.value === 'bearer') {
    requestConfig.auth = { type: 'bearer', token: bearerToken.value }
  } else if (authType.value === 'oauth2_client_credentials') {
    requestConfig.auth = {
      type: 'oauth2_client_credentials',
      tokenUrl: tokenUrl.value,
      clientId: clientId.value,
      clientSecret: clientSecret.value,
      scope: scope.value
    }
  }
}

watch([authType, bearerToken, tokenUrl, clientId, clientSecret, scope], syncAuth, { deep: true })

async function testConnection() {
  testResult.value = 'Testando...'
  testOk.value = false
  try {
    const res = await axios.post(tokenUrl.value, null, {
      params: {
        grant_type: 'client_credentials',
        client_id: clientId.value,
        client_secret: clientSecret.value,
        ...(scope.value ? { scope: scope.value } : {})
      },
      timeout: 10000
    })
    if (res.data && res.data.access_token) {
      testResult.value = 'Token obtido com sucesso'
      testOk.value = true
    } else {
      testResult.value = 'Resposta inesperada: sem access_token'
    }
  } catch (err) {
    testResult.value = 'Falha: ' + (err.message || 'erro de conexao')
  }
}
</script>

<style scoped>
.tab-auth { display: flex; flex-direction: column; gap: 10px; }
.field label { display: block; font-size: 12px; font-weight: 600; color: #444; margin-bottom: 3px; }
.field select, .field input { width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; box-sizing: border-box; }
.token-row, .secret-row { display: flex; gap: 4px; }
.token-row input, .secret-row input { flex: 1; }
.oauth-fields { display: flex; flex-direction: column; gap: 10px; }
.btn-eye { background: #eee; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; padding: 4px 8px; }
.btn-test { background: #0070d2; color: #fff; border: none; border-radius: 4px; padding: 8px; cursor: pointer; font-size: 13px; }
.test-result { font-size: 12px; padding: 6px; border-radius: 3px; }
.test-result.success { background: #d4edda; color: #155724; }
.test-result.fail { background: #f8d7da; color: #721c24; }
</style>
