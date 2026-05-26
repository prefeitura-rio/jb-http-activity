<template>
  <div class="activity-name">
    <input type="text" v-model="name" placeholder="Nome da atividade" @input="onChange" />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const name = ref('')

function setName(val) { name.value = val }
function getName() { return name.value }
function onChange() {}

defineExpose({ setName, getName })
</script>

<style scoped>
.activity-name { margin-bottom: 12px; }
.activity-name input { width: 100%; padding: 8px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
</style>
