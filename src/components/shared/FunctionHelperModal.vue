<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <h3>Funções de Transformação</h3>
      <p class="hint">Digite expressões na coluna "Expressão" para transformar valores da resposta.</p>
      <div class="func-group">
        <h4>Texto</h4>
        <div v-for="f in textFuncs" :key="f.name" class="func-row">
          <code>{{ f.syntax }}</code>
          <span>{{ f.desc }}</span>
        </div>
      </div>
      <div class="func-group">
        <h4>Número</h4>
        <div v-for="f in numFuncs" :key="f.name" class="func-row">
          <code>{{ f.syntax }}</code>
          <span>{{ f.desc }}</span>
        </div>
      </div>
      <div class="func-group">
        <h4>Lógica</h4>
        <div v-for="f in logicFuncs" :key="f.name" class="func-row">
          <code>{{ f.syntax }}</code>
          <span>{{ f.desc }}</span>
        </div>
      </div>
      <div class="func-group">
        <h4>Formatação</h4>
        <div v-for="f in formatFuncs" :key="f.name" class="func-row">
          <code>{{ f.syntax }}</code>
          <span>{{ f.desc }}</span>
        </div>
      </div>
      <button class="btn-close" @click="$emit('close')">Fechar</button>
    </div>
  </div>
</template>

<script setup>
defineProps({ visible: Boolean })
defineEmits(['close'])

const textFuncs = [
  { syntax: 'UPPER(v)', desc: 'caixa alta' },
  { syntax: 'LOWER(v)', desc: 'caixa baixa' },
  { syntax: 'PROPER(v)', desc: 'primeira maiúscula' },
  { syntax: 'TRIM(v)', desc: 'sem espaços extras' },
  { syntax: 'LEN(v)', desc: 'tamanho da string' },
  { syntax: 'SUBSTR(v, i, n)', desc: 'substring' },
  { syntax: 'CONCAT(a, b, ...)', desc: 'concatenar' }
]
const numFuncs = [
  { syntax: 'ROUND(v, n)', desc: 'arredondar casas decimais' },
  { syntax: 'ABS(v)', desc: 'valor absoluto' },
  { syntax: 'NUMBER(v)', desc: 'converter para número' }
]
const logicFuncs = [
  { syntax: 'IF(cond, t, f)', desc: 'se/senão' },
  { syntax: 'DEFAULT(v, fb)', desc: 'valor padrão se nulo' },
  { syntax: 'COALESCE(v1, v2, ...)', desc: 'primeiro não nulo' }
]
const formatFuncs = [
  { syntax: 'FORMAT(v, fmt)', desc: 'formatar string' },
  { syntax: 'TEXT(v)', desc: 'converter para texto' },
  { syntax: 'JSONSTR(v)', desc: 'objeto para JSON' }
]
</script>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 6px; padding: 16px 20px; width: 420px; max-height: 80vh; overflow-y: auto; }
.modal h3 { margin: 0 0 8px; }
.hint { font-size: 12px; color: #666; margin-bottom: 12px; }
.func-group { margin-bottom: 12px; }
.func-group h4 { margin: 0 0 4px; font-size: 13px; color: #0070d2; }
.func-row { display: flex; gap: 8px; font-size: 12px; padding: 2px 0; }
.func-row code { font-family: monospace; background: #f5f5f5; padding: 1px 4px; border-radius: 2px; min-width: 160px; }
.btn-close { background: #0070d2; color: #fff; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer; font-size: 13px; margin-top: 8px; }
</style>
