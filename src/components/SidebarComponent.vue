<template>
  <div class="container-fluid shadow-sm bg-light p-2 h-100 position-relative">

    <!-- Header -->
    <div class="header-sidebar p-3">
      <h3 class="text-center mx-3 py-2 fw-bold text-white bg-primary fs-1 rounded">
        CPM
      </h3>
    </div>

    <!-- Task list -->
    <div class="tasks-list p-2 my-4">
      <div class="header d-flex justify-content-between align-items-center">
        <h3 class="fs-3 text-primary">Liste des tâches</h3>
        <div class="action-controler d-flex gap-2">
          <button class="btn btn-outline-primary" @click="openModal()">
            <i class="bi bi-plus-lg"></i> tâche
          </button>
          <button class="btn btn-outline-danger" @click="resetTasks">
            <i class="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      <table class="table text-center table-borderless mt-4">
        <thead>
          <tr class="table-light">
            <th>Tâche</th>
            <th>Durée</th>
            <th>Successeurs</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in tasks" :key="task.name" class="fs-5">
            <td><span class="badge bg-info">{{ task.name }}</span></td>
            <td>{{ task.duration }}j</td>
            <td>
              <span v-for="s in task.successors" :key="s" class="me-1 badge bg-warning">
                {{ s }}
              </span>
            </td>
            <td>
              <i class="me-3 bi bi-trash text-danger" style="cursor: pointer;" @click="deleteTask(task.name)"></i>
              <i class="bi bi-pencil text-success" style="cursor: pointer;" @click="editTask(task)"></i>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="d-flex justify-content-end gap-2">
        <button class="btn btn-success" :disabled="tasks.length === 0" @click="generateCPM">
          Générer le schéma
        </button>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal d-block" v-if="showModal">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditing ? "Modifier la tâche" : "Ajouter une nouvelle tâche" }}</h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="submitTask">
              <div class="mb-3">
                <label class="form-label">Nom de la tâche</label>
                <input class="form-control" required v-model="formTaskName" :disabled="isEditing" />
              </div>
              <div class="mb-3">
                <label class="form-label">Durée</label>
                <input type="number" min="1" class="form-control" required v-model="formTaskDuration" />
              </div>
              <div class="mb-3">
                <label class="form-label">Successeurs (séparés par des virgules)</label>
                <input class="form-control" v-model="formTaskSuccessor" />
              </div>
              <div class="text-end">
                <button class="btn btn-primary">{{ isEditing ? "Mettre à jour" : "Ajouter" }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";

const emit = defineEmits(["generateCPM"]);

const showModal = ref(false);
const tasks = ref([]);
const isEditing = ref(false);
const editIndex = ref(null);

const formTaskName = ref("");
const formTaskDuration = ref("");
const formTaskSuccessor = ref("");

const openModal = () => {
  resetForm();
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  resetForm();
};

const resetForm = () => {
  formTaskName.value = "";
  formTaskDuration.value = "";
  formTaskSuccessor.value = "";
  isEditing.value = false;
  editIndex.value = null;
};

const submitTask = () => {
  if (!formTaskName.value || !formTaskDuration.value) return;

  const successors = formTaskSuccessor.value
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  const newTask = {
    name: formTaskName.value.trim().toLowerCase(),
    duration: parseInt(formTaskDuration.value),
    successors,
  };

  if (isEditing.value && editIndex.value !== null) {
    tasks.value[editIndex.value] = newTask;
  } else {
    tasks.value.push(newTask);
  }

  closeModal();
};

const deleteTask = (taskName) => {
  tasks.value = tasks.value.filter(task => task.name !== taskName);
};

const editTask = (task) => {
  const index = tasks.value.findIndex(t => t.name === task.name);
  if (index !== -1) {
    formTaskName.value = task.name;
    formTaskDuration.value = task.duration;
    formTaskSuccessor.value = task.successors.join(",");
    isEditing.value = true;
    editIndex.value = index;
    showModal.value = true;
  }
};

const resetTasks = () => {
  tasks.value = [];
};

const generateCPM = async () => {
  try {
    const response = await axios.post("http://localhost:8006/api/cpm", {
      tasks: tasks.value,
    });
    if (response.status >= 200) emit("generateCPM", true);
  } catch (error) {
    console.error("Erreur lors de la génération du CPM :", error);
  }
};
</script>
