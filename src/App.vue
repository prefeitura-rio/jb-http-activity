<template>
  <div id="app">
    <ActivityName />
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="tab-content">
      <TabRequest v-if="activeTab === 'request'" />
      <TabAuth v-if="activeTab === 'auth'" />
      <TabResponse v-if="activeTab === 'response'" />
      <TabLogs v-if="activeTab === 'logs'" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
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
</script>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  color: #333;
  background: #f5f5f5;
}
#app {
  width: 480px;
  padding: 12px;
}
.tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: 12px;
}
.tabs button {
  flex: 1;
  padding: 8px 4px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  border-bottom: 2px solid transparent;
}
.tabs button.active {
  color: #0070d2;
  border-bottom-color: #0070d2;
}
.tab-content {
  min-height: 200px;
}
</style>
