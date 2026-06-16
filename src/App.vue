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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ActivityName from './components/ActivityName.vue'
import TabRequest from './components/tabs/TabRequest.vue'
import TabAuth from './components/tabs/TabAuth.vue'
import TabResponse from './components/tabs/TabResponse.vue'
import { requestConfig } from './store.js'

const activeTab = ref('request')
const tabs = [
  { id: 'request', label: 'Request' },
  { id: 'auth', label: 'Auth' },
  { id: 'response', label: 'Response' }
]

const config = ref({})
const schema = ref([])
const activityNameRef = ref(null)
const requestRef = ref(null)
const authRef = ref(null)
const responseRef = ref(null)

let connection = null
let baseUrl = 'http://localhost:3000'
let executeUrl = 'http://localhost:3000/execute'

function getConfig() {
  const name = activityNameRef.value ? activityNameRef.value.getName() : ''

  const request = requestRef.value?.getData ? requestRef.value.getData() : {}
  const response = responseRef.value?.getData ? responseRef.value.getData() : {}

  return {
    activityName: name,
    method: request.method || 'GET',
    url: request.url || '',
    headers: JSON.stringify(request.headers || []),
    queryParams: JSON.stringify(request.queryParams || []),
    body: request.body || '',
    contentType: request.contentType || 'application/json',
    auth: JSON.stringify(requestConfig.auth || { type: 'none' }),
    responseMapping: JSON.stringify(response.responseMapping || []),
    treatErrorsAsOutput: !!request.treatErrorsAsOutput,
    timeout: request.timeout || 30000,
    retryCount: request.retryCount || 0,
    retryDelay: request.retryDelay || 1000
  }
}

function getOutputDefinitions() {
  const response = responseRef.value?.getData ? responseRef.value.getData() : {}
  const mappings = response.responseMapping || []

  const outputs = [
    { name: 'httpStatusCode', dataType: 'number', defaultValue: 0 },
    { name: 'httpStatusClass', dataType: 'text', defaultValue: '' },
    { name: 'httpSuccess', dataType: 'boolean', defaultValue: false }
  ]

  for (const m of mappings) {
    if (m.outputName) {
      outputs.push({
        name: m.outputName,
        dataType: mapDataType(m.type),
        defaultValue: getDefaultValue(m.type)
      })
    }
  }

  return outputs
}

function getOutArgumentsValues() {
  return getOutputDefinitions().map(o => ({
    [o.name]: o.defaultValue
  }))
}

function getOutArgumentsSchema() {
  return getOutputDefinitions().map(o => ({
    [o.name]: {
      dataType: o.dataType,
      direction: 'out',
      access: 'visible',
      isNullable: true
    }
  }))
}

function mapDataType(type) {
  if (type === 'number') return 'number'
  if (type === 'boolean') return 'boolean'
  if (type === 'date') return 'date'
  return 'text'
}

function getDefaultValue(type) {
  if (type === 'number') return 0
  if (type === 'boolean') return false
  return ''
}

onMounted(async () => {
  try {
    const resp = await fetch('/config.json')
    const appConfig = await resp.json()
    const url = appConfig.arguments?.execute?.url
    if (url) {
      const idx = url.lastIndexOf('/')
      baseUrl = idx > 0 ? url.substring(0, idx) : url
      executeUrl = url
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('Erro ao carregar config.json:', err)
    }
  }

  connection = new window.Postmonger.Session()

  connection.on('initActivity', function(data) {
    const args = data && data.arguments && data.arguments.execute && data.arguments.execute.inArguments

    if (args && args.length) {
      config.value = args.reduce((acc, arg) => ({ ...acc, ...arg }), {})
    }

    if (data && data.name && activityNameRef.value) {
      activityNameRef.value.setName(data.name)
    } else if (config.value.activityName && activityNameRef.value) {
      activityNameRef.value.setName(config.value.activityName)
    }

    connection.trigger('requestSchema')
  })

  connection.on('requestedSchema', function(data) {
    if (data && data.schema) {
      schema.value = data.schema
    }
  })

  connection.on('clickedNext', saveActivity)
  connection.on('clickedDone', saveActivity)
  connection.on('clickedBack', function() {
    connection.trigger('ready')
  })

  connection.trigger('ready')
})

function saveActivity() {
  const name = activityNameRef.value ? activityNameRef.value.getName() : ''
  const outArgumentsValues = getOutArgumentsValues()
  const outArgumentsSchema = getOutArgumentsSchema()

  const payload = {
    name,
    metaData: {
      isConfigured: true
    },
    arguments: {
      execute: {
        inArguments: [getConfig()],
        outArguments: outArgumentsValues,
        url: executeUrl,
        verb: 'POST',
        useJwt: true,
        timeout: (requestConfig.timeout || 30000) + 10000,
        retryCount: 1,
        retryDelay: 1000,
        concurrentRequests: 5
      }
    },
    configurationArguments: {
      save: {
        url: `${baseUrl}/save`,
        verb: 'POST',
        useJwt: true
      },
      validate: {
        url: `${baseUrl}/validate`,
        verb: 'POST',
        useJwt: true
      },
      publish: {
        url: `${baseUrl}/publish`,
        verb: 'POST',
        useJwt: true
      },
      stop: {
        url: `${baseUrl}/stop`,
        verb: 'POST',
        useJwt: true
      }
    },
    schema: {
      arguments: {
        execute: {
          outArguments: outArgumentsSchema
        }
      }
    }
  }

  if (import.meta.env.DEV) {
    console.log('UpdateActivity payload:', JSON.stringify(payload, null, 2))
  }
  connection.trigger('updateActivity', payload)
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