<template>
  <div class="container-fluid shadow-sm bg-light p-2 h-100">
    <div class="header-sidebar p-3">
      <h3
        class="text-center mx-3 py-2 fw-bold text-white bg-primary fs-1 rounded"
      >
        CPM
      </h3>
    </div>
    <div class="action-controler d-flex justify-content-around p-2 my-4">
      <button class="btn btn-outline-primary" @click="handleModal">
        <i class="bi bi-plus-lg"></i> tâche
      </button>

      <button class="btn btn-outline-danger" @click="clearDataTask">
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
              <th>Succésseur</th>
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
                <span
                  v-for="s of task.successors"
                  :key="s"
                  class="me-1 badge bg-warning"
                >
                  {{ s }}
                </span>
              </td>
              <td class="">
                <i class="me-2 bi bi-trash text-danger"></i>
                <!-- <i class="bi bi-pencil text-success"></i> -->
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="container-fluid d-flex justify-content-end gap-2">
        <button class="btn btn-outline-secondary" @click="onGenerateData">
          Générer les données
        </button>
        <button class="btn btn-success" :disabled="!canGenerateSchema" >Générer le schema</button>
      </div>
    </div>
    <div class="modal d-block" v-if="showModal">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Ajouter une nouvelle tâche</h5>
            <button
              type="button"
              class="btn-close"
              @click="handleModal"
            ></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="onSubmit">
              <div class="mb-3">
                <label class="form-label">Nom de la tâche</label>
                <input class="form-control" required v-model="formTaskName" />
              </div>
              <div class="mb-3">
                <label class="form-label">Durée de tâche</label>
                <input
                  type="number"
                  class="form-control"
                  required
                  v-model="formTaskDuration"
                />
              </div>
              <div class="mb-3">
                <label class="form-label">
                  Succésseur (à séparer par des virgules)
                </label>
                <input class="form-control" v-model="formTaskSuccessor" />
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
import axios from "axios";
import { ref } from "vue";

const showModal = ref(false);
const tasks = ref([]);
const canGenerateSchema = ref(false)

const handleModal = () => {
  showModal.value = !showModal.value;
};

const clearForm = () => {
  formTaskDuration.value = "";
  formTaskName.value = "";
  formTaskSuccessor.value = "";
};

const clearDataTask = () => {
  tasks.value = []
  canGenerateSchema.value = false
}

const formTaskName = ref("");
const formTaskDuration = ref("");
const formTaskSuccessor = ref("");

function onSubmit() {
  if (
    !formTaskName.value &&
    !formTaskDuration.value &&
    !formTaskSuccessor.value
  )
    return;

  const taskSuccessor =
    formTaskSuccessor.value.length > 0
      ? formTaskSuccessor.value
          .split(",")
          .map((item) => item.trim().toLocaleLowerCase())
      : ["deb"];

  tasks.value.push({
    name: formTaskName.value.toLowerCase(),
    duration: formTaskDuration.value,
    successors: taskSuccessor,
  });
  handleModal();
  clearForm();
}

async function onGenerateData() {
  try {
    const data = {
      tasks: tasks.value,
    };
    
    const response = await axios.post("http://localhost:8006/api/cpm", data);

    if (response.status >= 200) canGenerateSchema.value = true 
  } catch (error) {
    console.log(error);
  }
}


</script>