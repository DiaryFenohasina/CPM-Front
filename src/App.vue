<template>
  <div class="row p-0 m-0 vh-100">
    <div class="col-3 p-0 h-100">
      <SidebarComponent @generate-c-p-m="handleGenerate" />
    </div>
    <div class="col-9 p-0">
      <!-- <div class="container h-100 d-flex align-items-center justify-content-center" v-if="showPlan">
        <div class="text-center alert alert-info d-flex gap-2 align-items-center"><i class="bi bi-info-circle fs-5"></i>
          <p class="m-0">Pas encore de graphe à visualiser! Creez des taches ensuite générez le</p>
        </div>
      </div> -->
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
