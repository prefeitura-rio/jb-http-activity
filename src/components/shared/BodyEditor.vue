<template>
  <div class="body-editor">
    <label>Content-Type</label>
    <select :value="contentType" class="ct-select" @change="onContentTypeChange">
      <option value="application/json">application/json</option>
      <option value="application/x-www-form-urlencoded">form-urlencoded</option>
      <option value="multipart/form-data">multipart/form-data</option>
    </select>
    <div class="body-input-wrapper">
      <textarea :value="modelValue" placeholder='{ "exemplo": "valor" }' rows="6" @input="onInput"></textarea>
      <div v-if="validationMsg" class="validation-msg">{{ validationMsg }}</div>
    </div>
    <VariablePicker :schema="schema" @insert="onVariableInsert" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VariablePicker from './VariablePicker.vue'

const props = defineProps<{
  modelValue?: string
  contentType?: string
  schema?: unknown[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
  (e: 'update:contentType', val: string): void
}>()

const validationMsg = computed<string>(() => {
  if (props.contentType === 'application/json' && props.modelValue && props.modelValue.trim()) {
    try {
      JSON.parse(props.modelValue)
      return ''
    } catch {
      return 'JSON invalido'
    }
  }
  return ''
})

function onInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}

function onContentTypeChange(e: Event): void {
  const target = e.target as HTMLSelectElement
  emit('update:contentType', target.value)
}

function onVariableInsert(varStr: string): void {
  emit('update:modelValue', (props.modelValue || '') + varStr)
}
</script>

<style scoped>
.body-editor { display: flex; flex-direction: column; gap: 6px; }
.ct-select { padding: 5px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; width: 100%; box-sizing: border-box; }
.body-input-wrapper { position: relative; }
.body-input-wrapper textarea { width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; font-family: monospace; box-sizing: border-box; resize: vertical; }
.validation-msg { color: #e67e22; font-size: 11px; margin-top: 2px; }
</style>
