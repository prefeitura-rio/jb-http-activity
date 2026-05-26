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
      <optgroup label="Atividades anteriores">
        <option v-for="v in interactionVars" :key="v" :value="v">{{ v }}</option>
      </optgroup>
    </select>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['insert'])

const props = defineProps({
  schema: { type: Array, default: () => [] }
})

const selected = ref('')
const contextVars = ['{{Context.IsTest}}', '{{Context.DefinitionId}}']
const interactionVars = ['{{Interaction.HTTP-1.httpStatusCode}}', '{{Interaction.HTTP-1.httpSuccess}}']

const contactVars = computed(() => {
  if (!props.schema || !props.schema.length) {
    return ['{{Contact.Key}}']
  }
  return props.schema.map(s => '{{' + s.key + '}}')
})

function insert() {
  if (selected.value) {
    emit('insert', selected.value)
    selected.value = ''
  }
}
</script>

<style scoped>
.var-picker select { width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; }
</style>
