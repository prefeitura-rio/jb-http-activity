<template>
  <div id="app">
    <ActivityName ref="activityNameRef" />
    <div class="tabs">
      <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
        {{ tab.label }}
      </button>
    </div>
    <div class="tab-content">
      <TabRequest v-show="activeTab === 'request'" ref="requestRef" :schema="schema" :initial-data="config" />
      <TabAuth v-show="activeTab === 'auth'" ref="authRef" :schema="schema" />
      <TabResponse v-show="activeTab === 'response'" ref="responseRef" :initial-data="config" />
      <TabLogs v-show="activeTab === 'logs'" ref="logsRef" :initial-data="config" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ActivityName from './components/ActivityName.vue'
import TabRequest from './components/tabs/TabRequest.vue'
import TabAuth from './components/tabs/TabAuth.vue'
import TabResponse from './components/tabs/TabResponse.vue'
import TabLogs from './components/tabs/TabLogs.vue'

const activeTab = ref('request')
const tabs = [
  { id: 'request', label: 'Request' },
  { id: 'auth', label: 'Auth' },
  { id: 'response', label: 'Response' },
  { id: 'logs', label: 'Logs' }
]

const config = ref({})
const schema = ref([])
const activityNameRef = ref(null)
const requestRef = ref(null)
const authRef = ref(null)
const responseRef = ref(null)
const logsRef = ref(null)

let connection = null

function getConfig() {
  const name = activityNameRef.value ? activityNameRef.value.getName() : ''
  const request = requestRef.value || {}
  const auth = authRef.value || {}
  const response = responseRef.value || {}

  const authConfig = { type: 'none' }
  if (auth.authType === 'bearer') {
    authConfig.type = 'bearer'
    authConfig.token = auth.bearerToken || ''
  } else if (auth.authType === 'oauth2_client_credentials') {
    authConfig.type = 'oauth2_client_credentials'
    authConfig.tokenUrl = auth.tokenUrl || ''
    authConfig.clientId = auth.clientId || ''
    authConfig.clientSecret = auth.clientSecret || ''
    authConfig.scope = auth.scope || ''
  }

  return {
    activityName: name,
    method: request.method || 'GET',
    url: request.url || '',
    headers: JSON.stringify(request.headers || []),
    queryParams: JSON.stringify(request.queryParams || []),
    body: request.body || '',
    contentType: request.contentType || 'application/json',
    auth: JSON.stringify(authConfig),
    responseMapping: JSON.stringify(response.responseMapping || []),
    treatErrorsAsOutput: !!request.treatErrorsAsOutput,
    timeout: request.timeout || 30000,
    retryCount: request.retryCount || 0,
    retryDelay: request.retryDelay || 1000
  }
}

onMounted(() => {
  if (window.Postmonger) {
    connection = new window.Postmonger.Session()

    connection.on('initActivity', function(data) {
      const args = data && data.arguments && data.arguments.execute && data.arguments.execute.inArguments
      if (args && args.length) {
        const merged = args.reduce((acc, arg) => ({ ...acc, ...arg }), {})
        config.value = merged
      }
      if (data && data.name) {
        if (activityNameRef.value) activityNameRef.value.setName(data.name)
      } else if (config.value && config.value.activityName) {
        if (activityNameRef.value) activityNameRef.value.setName(config.value.activityName)
      }
      connection.trigger('ready')
      connection.trigger('requestSchema')
      connection.trigger('requestEndpoints')
      connection.trigger('requestInteractionDefaults')
    })

    connection.on('requestedSchema', function(data) {
      if (data && data.schema) {
        schema.value = data.schema
      }
    })

    connection.on('clickedNext', function() {
      const name = activityNameRef.value ? activityNameRef.value.getName() : ''
      const payload = {
        name,
        metaData: { isConfigured: true },
        arguments: {
          execute: {
            inArguments: [getConfig()],
            outArguments: []
          }
        },
        schema: {
          arguments: {
            execute: {
              outArguments: buildOutArgSchema()
            }
          }
        }
      }
      connection.trigger('updateActivity', payload)
    })

    connection.on('clickedBack', function() {
      // navegacao padrao
    })
  } else if (import.meta.env.DEV) {
    console.log('[DEV] Postmonger nao disponivel - usando ambiente dev')
    if (activityNameRef.value) activityNameRef.value.setName('Minha Activity')
  }
})

function buildOutArgSchema() {
  const response = responseRef.value || {}
  const mappings = response.responseMapping || []
  const outArgs = {}

  outArgs.httpStatusCode = { dataType: 'number', direction: 'out', isNullable: true, access: 'visible' }
  outArgs.httpStatusClass = { dataType: 'text', direction: 'out', isNullable: true, access: 'visible' }
  outArgs.httpSuccess = { dataType: 'boolean', direction: 'out', isNullable: true, access: 'visible' }

  for (const m of mappings) {
    if (m.outputName) {
      outArgs[m.outputName] = {
        dataType: m.type || 'text',
        direction: 'out',
        isNullable: true,
        access: 'visible'
      }
    }
  }

  return outArgs
}
</script>

<style>
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #333; background: #f5f5f5; }
#app { width: 480px; padding: 12px; box-sizing: border-box; }
.tabs { display: flex; border-bottom: 1px solid #ddd; margin-bottom: 12px; }
.tabs button { flex: 1; padding: 8px 4px; border: none; background: none; cursor: pointer; font-size: 12px; color: #666; border-bottom: 2px solid transparent; }
.tabs button.active { color: #0070d2; border-bottom-color: #0070d2; }
.tab-content { min-height: 200px; }
</style>
