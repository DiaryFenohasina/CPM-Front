<template>
  <!-- Toggle Button -->
  <!-- Bascule -->
  <button type="button"
    class="position-absolute d-flex align-items-center justify-content-center bg-primary text-white border-0 shadow rounded-circle"
    :style="{
      zIndex: 999,
      right: '-15px',
      top: '20px',
      width: '32px',
      height: '32px',
      cursor: 'pointer',
    }" @click="toggleSidebar">
    <i :class="[
      'transition-transform',
      props.collapsed ? 'bi bi-caret-right-fill' : 'bi bi-caret-left-fill',
    ]" />
  </button>

  <!-- Sidebar Container -->
  <div class="container-fluid bg-white border-end shadow-sm p-0 h-100">
    <div :class="props.collapsed ? 'd-none' : 'd-block'">
      <!-- Sidebar Header -->
      <div class="bg-primary text-center py-4">
        <h2 class="text-white fw-bold m-0">CPM</h2>
      </div>

      <!-- Task Section -->
      <div class="p-3 d-flex flex-column">
        <!-- Header Controls -->
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h4 class="text-primary fw-bold m-0">Liste des tâches</h4>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-primary" @click="openModal">
              <i class="bi bi-plus-lg"></i> Ajouter
            </button>
            <button class="btn btn-sm btn-outline-danger" @click="resetTasks">
              <i class="bi bi-trash"></i> Vider
            </button>
          </div>
        </div>

        <!-- Tasks Table -->
        <div class="table-responsive flex-grow-1 overflow-auto mb-3" style="max-height: calc(100vh - 250px);">
          <table class="table table-hover align-middle">
            <thead class="table-light sticky-top">
              <tr>
                <th>Nom</th>
                <th>Durée</th>
                <th>Successeurs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody v-if="tasks.length > 0">
              <tr v-for="task in tasks" :key="task.name">
                <td>
                  <span class="badge bg-primary">{{ task.name }}</span>
                </td>
                <td>{{ task.duration }} j</td>
                <td>
                  <span v-for="s in task.successors" :key="s" class="badge bg-secondary me-1">
                    {{ s }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-success me-1" @click="editTask(task)">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="deleteTask(task.name)">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr>
                <td colspan="4" class="text-center text-muted">
                  Aucune tâche enregistrée.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Generate Button -->
        <div class="text-end">
          <button class="btn btn-success" :disabled="tasks.length === 0" @click="generateCPM">
            Générer le schéma
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Task Modal -->
  <div class="modal fade show d-block bg-dark bg-opacity-50" v-if="showModal">
    <div class="modal-dialog">
      <div class="modal-content shadow">
        <div class="modal-header">
          <h5 class="modal-title">
            {{ isEditing ? "Modifier la tâche" : "Nouvelle tâche" }}
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="submitTask">
            <div class="mb-3">
              <label class="form-label">Nom</label>
              <input class="form-control" required v-model="formTaskName" :disabled="isEditing" />
            </div>
            <div class="mb-3">
              <label class="form-label">Durée</label>
              <input type="number" min="1" class="form-control" required v-model="formTaskDuration" />
            </div>
            <div class="mb-3">
              <label class="form-label">Successeurs</label>
              <input class="form-control" placeholder="Séparés par des virgules" v-model="formTaskSuccessor" />
            </div>
            <div class="text-end">
              <button class="btn btn-primary">
                {{ isEditing ? "Mettre à jour" : "Ajouter" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { onMounted, ref } from "vue";
import axios from "axios";

const emit = defineEmits(["generateCPM", "toggleSidebar"]);
const props = defineProps({
  collapsed: Boolean,
});

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
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const newTask = {
    name: formTaskName.value.trim().toUpperCase(),
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

const deleteTask = async (taskName) => {
  try {
    const res = await axios.delete("http://localhost:8006/api/tasks/" + taskName);
    if (res.status === 200){
      tasks.value = tasks.value.filter((task) => task.name !== taskName);
    }
  } catch (error) {
    // console.log(error)
  }
};

const editTask = (task) => {
  const index = tasks.value.findIndex((t) => t.name === task.name);
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
    if (response) emit("generateCPM", true);
  } catch (error) {
    // console.error("Erreur lors de la génération du CPM :", error);
  }
};

const toggleSidebar = () => {
  emit("toggleSidebar");
};

onMounted(async () => {
  try {
    const res = await axios.get("http://localhost:8006/api/cpm");
    if (res) {
      tasks.value = res.data;
    }
  } catch (error) {
    // console.log(error);
  }
});
</script>

<style>
.transition-transform {
  transition: transform 0.2s ease;
}
</style>
