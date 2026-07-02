<template>
  <div class="response-mapping">
    <div class="rm-header">
      <span class="col-expr">Expressao</span>
      <span class="col-name">Nome da var.</span>
      <span class="col-type">Tipo</span>
      <span class="col-rm"></span>
    </div>

    <div v-for="(row, i) in rows" :key="i" class="rm-row">
      <input v-model="row.expression" placeholder="boleto.codigo" class="col-expr" @input="emitChange" />
      <input v-model="row.outputName" placeholder="codigoBoleto" class="col-name" @input="emitChange" />
      <select v-model="row.type" class="col-type" @change="emitChange">
        <option value="text">text</option>
        <option value="number">number</option>
        <option value="boolean">boolean</option>
        <option value="date">date</option>
      </select>
      <button class="btn-remove" @click="removeRow(i)">x</button>
    </div>

    <button class="btn-add" @click="addRow">+ Adicionar campo</button>

    <div class="func-link">
      <a href="#" @click.prevent="$emit('openFunctions')">[ ? Ver funcoes ]</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface MappingRow {
  expression: string
  outputName: string
  type: string
}

const props = defineProps<{
  modelValue?: MappingRow[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: MappingRow[]): void
  (e: 'openFunctions'): void
}>()

const rows = ref<MappingRow[]>([])
let internalUpdate: boolean = false

watch(
  () => props.modelValue,
  (val: MappingRow[] | undefined) => {
    if (internalUpdate) {
      internalUpdate = false
      return
    }

    rows.value = Array.isArray(val)
      ? val.map((r: MappingRow) => ({
          expression: r.expression || '',
          outputName: r.outputName || '',
          type: r.type || 'text'
        }))
      : []
  },
  { immediate: true, deep: true }
)

function addRow(): void {
  rows.value.push({ expression: '', outputName: '', type: 'text' })
  emitChange()
}

function removeRow(i: number): void {
  rows.value.splice(i, 1)
  emitChange()
}

function emitChange(): void {
  internalUpdate = true

  emit(
    'update:modelValue',
    rows.value.map((r: MappingRow) => ({
      expression: r.expression || '',
      outputName: r.outputName || '',
      type: r.type || 'text'
    }))
  )
}
</script>

<style scoped>
.response-mapping { display: flex; flex-direction: column; gap: 4px; }
.rm-header { display: flex; gap: 4px; font-size: 11px; font-weight: 600; color: #555; padding: 2px 0; }
.rm-row { display: flex; gap: 4px; align-items: center; }
.rm-row input, .rm-row select { padding: 5px 6px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; }
.col-expr { flex: 2; }
.col-name { flex: 1.5; }
.col-type { flex: 0.8; }
.btn-remove { background: #e74c3c; color: #fff; border: none; border-radius: 3px; cursor: pointer; padding: 4px 8px; font-size: 11px; }
.btn-add { background: none; border: 1px dashed #999; border-radius: 3px; padding: 5px; cursor: pointer; font-size: 12px; color: #555; margin-top: 2px; }
.func-link { margin-top: 4px; }
.func-link a { font-size: 12px; color: #0070d2; text-decoration: none; }
.func-link a:hover { text-decoration: underline; }
</style>