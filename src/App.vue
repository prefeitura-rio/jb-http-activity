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

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ActivityName from './components/ActivityName.vue'
import TabRequest from './components/tabs/TabRequest.vue'
import TabAuth from './components/tabs/TabAuth.vue'
import TabResponse from './components/tabs/TabResponse.vue'
import { requestConfig } from './store'

const activeTab = ref<string>('request')
const tabs = [
  { id: 'request', label: 'Request' },
  { id: 'auth', label: 'Auth' },
  { id: 'response', label: 'Response' }
]

interface TabConfig {
  name?: string
  [key: string]: unknown
}

interface ActivityTabInstance {
  getData?: () => Record<string, unknown>
  getName?: () => string
  setName?: (val: string) => void
}

const config = ref<Record<string, unknown>>({})
const schema = ref<unknown[]>([])
const activityNameRef = ref<ActivityTabInstance | null>(null)
const requestRef = ref<ActivityTabInstance | null>(null)
const authRef = ref<ActivityTabInstance | null>(null)
const responseRef = ref<ActivityTabInstance | null>(null)

let connection: PostmongerSession | null = null
let baseUrl = 'http://localhost:3000'
let executeUrl = 'http://localhost:3000/execute'

function getConfig(): Record<string, unknown> {
  const name = activityNameRef.value ? activityNameRef.value.getName() ?? '' : ''

  const request = (requestRef.value?.getData ? requestRef.value.getData() : {}) as Record<string, unknown>
  const response = (responseRef.value?.getData ? responseRef.value.getData() : {}) as Record<string, unknown>

  return {
    activityName: name,
    method: (request.method as string) || 'GET',
    url: (request.url as string) || '',
    primaryKeyValue: (request.primaryKeyValue as string) || '',
    deExternalKey: (request.deExternalKey as string) || '',
    deKeyField: (request.deKeyField as string) || 'SubscriberKey',
    headers: JSON.stringify(request.headers || []),
    queryParams: JSON.stringify(request.queryParams || []),
    body: (request.body as string) || '',
    contentType: (request.contentType as string) || 'application/json',
    auth: JSON.stringify(requestConfig.auth || { type: 'none' }),
    responseMapping: JSON.stringify(response.responseMapping || []),
    treatErrorsAsOutput: !!(request.treatErrorsAsOutput),
    timeout: (request.timeout as number) || 30000,
    retryCount: (request.retryCount as number) || 0,
    retryDelay: (request.retryDelay as number) || 1000
  }
}

interface OutputDef {
  name: string
  dataType: string
  defaultValue: unknown
}

interface SchemaField {
  name: string
  dataType: string
  direction: string
  access: string
  isNullable: boolean
}

function getOutputDefinitions(): OutputDef[] {
  const response = (responseRef.value?.getData ? responseRef.value.getData() : {}) as Record<string, unknown>
  const mappings = (response.responseMapping as Record<string, unknown>[]) || []

  const outputs: OutputDef[] = [
    { name: 'httpStatusCode', dataType: 'number', defaultValue: 0 },
    { name: 'httpStatusClass', dataType: 'text', defaultValue: '' },
    { name: 'httpSuccess', dataType: 'boolean', defaultValue: false },
    { name: 'deUpdateSuccess', dataType: 'boolean', defaultValue: false }
  ]

  for (const m of mappings) {
    if (m && typeof m === 'object' && 'outputName' in m) {
      outputs.push({
        name: m.outputName as string,
        dataType: mapDataType(m.type as string | undefined),
        defaultValue: getDefaultValue(m.type as string | undefined)
      })
    }
  }

  return outputs
}

function getOutArgumentsValues(): Record<string, unknown>[] {
  return getOutputDefinitions().map(o => ({
    [o.name]: o.defaultValue
  }))
}

function getOutArgumentsSchema(): Record<string, SchemaField>[] {
  return getOutputDefinitions().map(o => ({
    [o.name]: {
      dataType: o.dataType,
      direction: 'out',
      access: 'visible',
      isNullable: true
    }
  }))
}

function mapDataType(type: string | undefined): string {
  if (type === 'number') return 'number'
  if (type === 'boolean') return 'boolean'
  if (type === 'date') return 'date'
  return 'text'
}

function getDefaultValue(type: string | undefined): unknown {
  if (type === 'number') return 0
  if (type === 'boolean') return false
  return ''
}

onMounted(async () => {
  try {
    const resp = await fetch(`${import.meta.env.BASE_URL}config.json`)
    const appConfig: Record<string, unknown> = await resp.json()
    const args = appConfig.arguments as Record<string, unknown> | undefined
    const exec = args?.execute as Record<string, unknown> | undefined
    const url = exec?.url as string | undefined
    if (url) {
      const idx = url.lastIndexOf('/')
      baseUrl = idx > 0 ? url.substring(0, idx) : url
      executeUrl = url
    }
  } catch (err: unknown) {
    if (import.meta.env.DEV) {
      console.error('Erro ao carregar config.json:', err)
    }
  }

  connection = new window.Postmonger.Session()

  connection.on('initActivity', function(data: unknown) {
    const d = data as Record<string, unknown> | null
    if (!d) return

    const args = d.arguments as Record<string, unknown> | undefined
    const exec = args?.execute as Record<string, unknown> | undefined
    const inArgs = exec?.inArguments as Record<string, unknown>[] | undefined

    if (inArgs && inArgs.length) {
      config.value = inArgs.reduce((acc: Record<string, unknown>, arg: Record<string, unknown>) => ({ ...acc, ...arg }), {})
    }

    if (d.name && typeof d.name === 'string' && activityNameRef.value && activityNameRef.value.setName) {
      activityNameRef.value.setName(d.name)
    } else if (typeof config.value.activityName === 'string' && activityNameRef.value && activityNameRef.value.setName) {
      activityNameRef.value.setName(config.value.activityName)
    }

    connection?.trigger('requestSchema')
  })

  connection.on('requestedSchema', function(data: unknown) {
    const d = data as { schema?: unknown[] } | null
    if (d && d.schema) {
      schema.value = d.schema
    }
  })

  connection.on('clickedNext', saveActivity)
  connection.on('clickedDone', saveActivity)
  connection.on('clickedBack', function() {
    connection?.trigger('ready')
  })

  connection?.trigger('ready')
})

function saveActivity(): void {
  const name = activityNameRef.value && activityNameRef.value.getName ? activityNameRef.value.getName() ?? '' : ''
  const outArgumentsValues = getOutArgumentsValues()
  const outArgumentsSchema = getOutArgumentsSchema()

  const payload: Record<string, unknown> = {
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
      useJwt: true,
      save: {
        url: `${baseUrl}/save`,
        verb: 'POST'
      },
      validate: {
        url: `${baseUrl}/validate`,
        verb: 'POST'
      },
      publish: {
        url: `${baseUrl}/publish`,
        verb: 'POST'
      },
      stop: {
        url: `${baseUrl}/stop`,
        verb: 'POST'
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
  connection?.trigger('updateActivity', payload)
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