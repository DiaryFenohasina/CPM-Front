<template>
  <div class="container-fluid shadow-sm bg-light p-2 h-100">
    <div class="header-sidebar p-3">
      <h3 class="text-center mx-3 py-2 fw-bold text-white bg-primary fs-1 rounded">
        CPM
      </h3>
    </div>
    <div class="action-controler d-flex justify-content-around p-2 my-4">
      <button class="btn btn-outline-primary" @click="handleModal">
        <i class="bi bi-plus-lg"></i> tâche
      </button>
      <button class="btn btn-outline-secondary">Générer le schema</button>
      <button class="btn btn-outline-danger">
        <i class="bi bi-arrow-clockwise"></i>
      </button>
    </div>
    <div class="tasks-list p-2 my-4">
      <h3 class="text-center fs-3 text-primary">Liste des tâches</h3>
      <div class="table-list-container">
        <table class="table text-center table-borderless mt-4">
          <thead>
            <tr class="table-light">
              <th></th>
              <th>Tâche</th>
              <th>Durée de la tâche</th>
              <th>Prédecesseur</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr class="fs-5" v-for="task of tasks" :key="task.name">
              <td class="">
                <i class="bi bi-grip-horizontal"></i>
              </td>
              <td>
                <span class="badge bg-info">{{ task.name }}</span>
              </td>
              <td>
                <span>{{ task.duration }}j</span>
              </td>
              <td>
                <span v-for="p of task.predecessors" :key="p" class="me-1 badge bg-warning">
                  {{ p }}
                </span>

              </td>
              <td class="">
                <i class="me-2 bi bi-trash text-danger"></i>
                <i class="bi bi-pencil text-success"></i>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal d-block" v-if="showModal">
      <div class="modal-dialog shadow">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Ajouter une nouvelle tâche</h5>
            <button type="button" class="btn-close" @click="handleModal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="onSubmit">
              <div class="mb-3">
                <label class="form-label">Nom de la tâche</label>
                <input class="form-control" required v-model="formTaskName" />

              </div>
              <div class="mb-3">
                <label class="form-label">Durée de tâche</label>
                <input type="number" class="form-control" required v-model="formTaskDuration" />
              </div>
              <div class="mb-3">
                <label class="form-label">
                  Prédecesseur (à séparer par des virgules)
                </label>
                <input class="form-control" v-model="formTaskPredecessor" />
              </div>
              <div class="mb-3 text-end">
                <button class="btn btn-primary">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
<script setup>
import { ref } from 'vue';

const showModal = ref(false);

const handleModal = () => {
  showModal.value = !showModal.value
}

const clearForm = () => {
  formTaskDuration.value = "";
  formTaskName.value = ""
  formTaskPredecessor.value = ""
}

const formTaskName = ref("")
const formTaskDuration = ref("")
const formTaskPredecessor = ref("")

function onSubmit() {
  if (!formTaskName.value && !formTaskDuration.value && !formTaskPredecessor.value) return;

  const taskPredecessor = formTaskPredecessor.value.length > 0
    ? formTaskPredecessor.value.split(",").map((item) => item.trim().toLocaleLowerCase())
    : ["deb"];

  tasks.value.push({
    name: formTaskName.value.toLowerCase(),
    duration: formTaskDuration.value,
    predecessors: taskPredecessor,
  })
  handleModal();
  clearForm();
}

const tasks = ref([]);

</script>