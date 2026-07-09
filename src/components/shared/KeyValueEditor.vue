<template>
  <div class="kv-editor">
    <div v-for="(row, i) in rows" :key="i" class="kv-row">
      <input v-model="row.key" :placeholder="keyPlaceholder" @input="emitChange" />
      <input v-model="row.value" :placeholder="valuePlaceholder" @input="emitChange" />
      <button class="btn-remove" @click="removeRow(i)">x</button>
    </div>
    <button class="btn-add" @click="addRow">+ {{ addLabel }}</button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Row { key: string; value?: string }

const props = defineProps<{
  modelValue?: Row[]
  keyPlaceholder?: string
  valuePlaceholder?: string
  addLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: Row[]): void
}>()

const rows = ref<Row[]>([])

watch(() => props.modelValue, (val: Row[] | undefined) => {
  rows.value = val && val.length ? val.map(r => ({ ...r })) : []
}, { immediate: true })

function addRow(): void {
  rows.value.push({ key: '', value: '' })
  emitChange()
}

function removeRow(i: number): void {
  rows.value.splice(i, 1)
  emitChange()
}

function emitChange(): void {
  emit('update:modelValue', rows.value.map(r => ({ key: r.key, value: r.value })))
}
</script>

<style scoped>
.kv-editor { display: flex; flex-direction: column; gap: 4px; }
.kv-row { display: flex; gap: 4px; align-items: center; }
.kv-row input { flex: 1; padding: 5px 6px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; }
.btn-remove { background: #e74c3c; color: #fff; border: none; border-radius: 3px; cursor: pointer; padding: 4px 8px; font-size: 11px; }
.btn-add { background: none; border: 1px dashed #999; border-radius: 3px; padding: 5px; cursor: pointer; font-size: 12px; color: #555; margin-top: 2px; }
.btn-add:hover { background: #f0f0f0; }
</style>
