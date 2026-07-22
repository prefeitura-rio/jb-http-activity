<template>
  <div class="var-picker">
    <select v-model="selected" @change="insert">
      <option value="" disabled>Inserir variavel</option>
      <optgroup label="Dados do Contato">
        <option v-for="v in contactVars" :key="v" :value="v">{{ v }}</option>
      </optgroup>
      <optgroup label="Contexto da Jornada">
        <option v-for="v in contextVars" :key="v" :value="v">{{ v }}</option>
      </optgroup>
      <option disabled class="divider">─── Atividades anteriores ───</option>
      <option disabled class="hint">💡 Digite manualmente:</option>
      <option disabled class="hint-code" v-text="'{{Interaction.NomeDaAtividade.campo}}'"></option>
      <option disabled class="hint-code" v-text="'Ex: {{Interaction.ConsultaDivida.status}}'"></option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{
  (e: 'insert', val: string): void
}>()

const props = defineProps<{
  schema?: { key: string }[]
}>()

const selected = ref<string>('')
const contextVars: string[] = ['{{Context.IsTest}}', '{{Context.DefinitionId}}']

const contactVars = computed<string[]>(() => {
  if (!props.schema || !props.schema.length) {
    return ['{{Contact.Key}}']
  }
  return props.schema.map((s: { key: string }) => '{{' + s.key + '}}')
})

function insert(): void {
  if (selected.value) {
    emit('insert', selected.value)
    selected.value = ''
  }
}
</script>

<style scoped>
.var-picker { flex-shrink: 0; }
.var-picker select { width: 130px; max-width: 130px; padding: 5px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; }
</style>
