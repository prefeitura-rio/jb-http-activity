<template>
  <div class="activity-name">
    <h3 class="activity-title">{{ name || 'HTTP Request' }}</h3>
    <label class="activity-label">Activity</label>
    <div class="input-row">
      <input type="text" v-model="name" placeholder="Nome da atividade" @input="onInput" />
      <span v-if="saved" class="save-indicator">✓</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const name = ref<string>('')
const saved = ref<boolean>(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function setName(val: string): void { name.value = val }
function getName(): string { return name.value }

function onInput(): void {
  saved.value = false
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  }, 800)
}

defineExpose({ setName, getName })
</script>

<style scoped>
.activity-name { margin-bottom: 16px; }
.activity-title { margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #333; }
.activity-label { display: block; font-size: 11px; color: #888; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.input-row { display: flex; align-items: center; gap: 8px; }
.input-row input { flex: 1; padding: 8px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
.save-indicator { color: #28a745; font-size: 16px; font-weight: bold; animation: fadeIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
</style>
