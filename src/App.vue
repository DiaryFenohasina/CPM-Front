<template>
  <div class="row p-0 m-0 vh-100">
    <div class="col-3 p-0 h-100">
      <SidebarComponent @generate-c-p-m="handleGenerate" />
    </div>
    <div class="col-9 p-0">
      <CPMGraph :generate="generateCpm" @plan-finished="isFinished" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import SidebarComponent from './components/SidebarComponent.vue';
import CPMGraph from './views/CPMGraph.vue';

const generateCpm = ref(false)

const handleGenerate = (data) => {
  generateCpm.value = data ? true : false
}

const isFinished = (data) => {
  generateCpm.value = data ? false : true
}

</script>

<style></style>
