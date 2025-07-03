<template>
  <div class="row p-0 m-0 vh-100">
    <div class="p-0 h-100 position-relative col-3" :style="{ width: sidebarCollapsed ? '20px' : '' }"
      style="transition: all 0.3s ease;">
      <SidebarComponent :collapsed="sidebarCollapsed" @toggle-sidebar="() => sidebarCollapsed = !sidebarCollapsed"
        @generate-c-p-m="handleGenerate" />
    </div>
    <div class="col-9 p-0" :style="{ width: sidebarCollapsed ? 'calc(100% - 20px)' : '' }">
      <CPMGraph :generate="generateCpm" @plan-finished="isFinished" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import SidebarComponent from './components/SidebarComponent.vue';
import CPMGraph from './views/CPMGraph.vue';

const generateCpm = ref(false)
const sidebarCollapsed = ref(false)

const handleGenerate = (data) => {
  generateCpm.value = data ? true : false
}

const isFinished = (data) => {
  generateCpm.value = data ? false : true
}

</script>

<style></style>
