<template>
  <div class="cpm-container">
    <!-- Bouton pour basculer le panneau de contrôle -->
    <button 
      @click="toggleControlPanel" 
      class="toggle-panel-btn"
      :class="{ 'panel-hidden': !showControlPanel }"
    >
      <span v-if="showControlPanel">📊</span>
      <span v-else>🎛️</span>
    </button>

    <!-- Panneau de contrôle -->
    <div class="control-panel" v-show="showControlPanel">
      <h3>Contrôles d'affichage CPM</h3>
      <div class="button-group">
        <button 
          @click="setDisplayMode('schema')" 
          :class="{ active: displayMode === 'schema' }"
          class="control-btn"
        >
          1. Schéma de base
        </button>
        <button 
          @click="setDisplayMode('earlyTimes')" 
          :class="{ active: displayMode === 'earlyTimes' }"
          class="control-btn"
        >
          2. Dates au plus tôt
        </button>
        <button 
          @click="setDisplayMode('lateTimes')" 
          :class="{ active: displayMode === 'lateTimes' }"
          class="control-btn"
        >
          3. Dates au plus tard
        </button>
        <button 
          @click="setDisplayMode('floats')" 
          :class="{ active: displayMode === 'floats' }"
          class="control-btn"
        >
          4. Marges (Float)
        </button>
        <button 
          @click="setDisplayMode('criticalPath')" 
          :class="{ active: displayMode === 'criticalPath' }"
          class="control-btn"
        >
          5. Chemin critique
        </button>
        <button 
          @click="setDisplayMode('linkByLink')" 
          :class="{ active: displayMode === 'linkByLink' }"
          class="control-btn"
        >
          6. Arcs un par un
        </button>
        <button 
          @click="setDisplayMode('complete')" 
          :class="{ active: displayMode === 'complete' }"
          class="control-btn complete"
        >
          Affichage complet
        </button>
      </div>

      <!-- Contrôles pour affichage un par un -->
      <div class="step-controls" v-if="displayMode === 'linkByLink'">
        <h4>Navigation des arcs :</h4>
        <div class="nav-controls">
          <button @click="previousStep" :disabled="currentStep === 0" class="nav-btn">
            ← Précédent
          </button>
          <span class="step-info">
            {{ currentStep + 1 }} / {{ maxSteps }}
            <span v-if="currentLinkName"> - {{ currentLinkName }}</span>
          </span>
          <button @click="nextStep" :disabled="currentStep >= maxSteps - 1" class="nav-btn">
            Suivant →
          </button>
        </div>
      </div>
      
      <!-- Légende -->
      <div class="legend" v-if="displayMode !== 'schema'">
        <h4>Légende :</h4>
        <div class="legend-grid">
          <div class="legend-item" v-if="displayMode === 'earlyTimes' || displayMode === 'complete'">
            <span class="legend-color early-time"></span>
            Date au plus tôt (rouge)
          </div>
          <div class="legend-item" v-if="displayMode === 'lateTimes' || displayMode === 'complete'">
            <span class="legend-color late-time"></span>
            Date au plus tard (bleu)
          </div>
          <div class="legend-item" v-if="displayMode === 'floats' || displayMode === 'complete'">
            <span class="legend-color float-time"></span>
            Marge libre (orange)
          </div>
          <div class="legend-item" v-if="displayMode === 'criticalPath' || displayMode === 'complete'">
            <span class="legend-color critical-path"></span>
            Chemin critique (rouge)
          </div>
        </div>
      </div>
    </div>

    <!-- Diagramme -->
    <div ref="diagramDiv" class="diagram-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import go from 'gojs'
import axios from 'axios'

const diagramDiv = ref(null)
let diagram = null
let originalData = null
const displayMode = ref('schema')
const currentStep = ref(0)
const maxSteps = ref(0)
const currentLinkName = ref('')
const showControlPanel = ref(true)

const props = defineProps({
  generate: Boolean
})
const emit = defineEmits(["planFinished"])

// Fonction pour basculer l'affichage du panneau de contrôle
function toggleControlPanel() {
  showControlPanel.value = !showControlPanel.value
}

// Fonction pour changer le mode d'affichage
function setDisplayMode(mode) {
  displayMode.value = mode
  currentStep.value = 0
  if (originalData) {
    if (mode === 'linkByLink') {
      const { links } = generateModelData(originalData)
      maxSteps.value = links.length
      currentLinkName.value = links[0]?.taskName || ''
    }
    generateCPM()
  }
}

// Navigation pour l'affichage un par un
function nextStep() {
  if (currentStep.value < maxSteps.value - 1) {
    currentStep.value++
    updateStepInfo()
    generateCPM()
  }
}

function previousStep() {
  if (currentStep.value > 0) {
    currentStep.value--
    updateStepInfo()
    generateCPM()
  }
}

function updateStepInfo() {
  if (displayMode.value === 'linkByLink' && originalData) {
    const { links } = generateModelData(originalData)
    const currentLink = links[currentStep.value]
    currentLinkName.value = currentLink?.taskName || ''
  }
}

async function generateCPM() {
  const $ = go.GraphObject.make

  if (diagram) diagram.clear()
  else {
    diagram = $(go.Diagram, diagramDiv.value, {
      'undoManager.isEnabled': true,
      layout: $(go.LayeredDigraphLayout, {
        layerSpacing: 150,
        columnSpacing: 150,
      })
    })
  }

  // Template pour les nœuds (événements) - adapté selon le mode
  diagram.nodeTemplate = createNodeTemplate($)
  
  // Template pour les liens (tâches) - adapté selon le mode
  diagram.linkTemplate = createLinkTemplate($)

  // Charger données backend si pas déjà fait
  if (!originalData) {
    const { data } = await axios.get('http://localhost:8006/api/critical-path')
    originalData = data
  }

  // Générer le modèle selon le mode d'affichage
  const { nodes, links } = generateModelData(originalData)
  
  // Filtrer selon le mode d'affichage
  let filteredNodes = nodes
  let filteredLinks = links
  
  if (displayMode.value === 'linkByLink') {
    // Afficher seulement les arcs jusqu'à l'étape courante
    filteredLinks = links.slice(0, currentStep.value + 1)
    // Afficher tous les nœuds nécessaires pour les arcs visibles
    const neededNodes = new Set()
    filteredLinks.forEach(link => {
      neededNodes.add(link.from)
      neededNodes.add(link.to)
    })
    filteredNodes = nodes.filter(node => neededNodes.has(node.key))
  }
  
  diagram.model = new go.GraphLinksModel(filteredNodes, filteredLinks)
}

function createNodeTemplate($) {
  return $(go.Node, 'Auto',
    $(go.Shape, 'Circle',
      {
        fill: 'white',
        strokeWidth: 2,
        stroke: 'black',
        width: 150,
        height: 150
      }
    ),
    $(go.Panel, 'Table',
      { margin: 4 },
      // Nom de l'événement (seulement pour DEBUT et FIN)
      $(go.TextBlock,
        {
          row: 0,
          columnSpan: 3,
          font: 'bold 14pt sans-serif',
          textAlign: 'center',
          stroke: 'black',
          margin: new go.Margin(0, 0, 2, 0)
        },
        new go.Binding('text', 'name', name => (name === 'DEBUT' || name === 'FIN') ? name : '')
      ),
      // Valeur pour DEBUT (0) et FIN (durée du projet)
      $(go.TextBlock,
        {
          row: 1,
          columnSpan: 3,
          font: 'bold 12pt sans-serif',
          textAlign: 'center',
          stroke: 'black'
        },
        new go.Binding('text', '', data => {
          if (data.name === 'DEBUT') return '0'
          if (data.name === 'FIN') return data.earlyTime.toString()
          return ''
        })
      ),
      // Date au plus tôt (à gauche, rouge)
      $(go.TextBlock,
        {
          row: 2,
          column: 0,
          font: 'bold 12pt sans-serif',
          textAlign: 'center',
          stroke: 'red'
        },
        new go.Binding('text', '', data => {
          if (data.name === 'DEBUT' || data.name === 'FIN') return ''
          if (displayMode.value === 'earlyTimes' || displayMode.value === 'complete') {
            return data.earlyTime
          }
          return ''
        })
      ),
      // Ligne de séparation verticale
      $(go.Shape, 'LineV',
        {
          row: 2,
          column: 1,
          stroke: 'black',
          strokeWidth: 1,
          width: 1,
          height: 40,
          margin: new go.Margin(0, 3, 0, 3)
        },
        new go.Binding('visible', '', data => {
          if (data.name === 'DEBUT' || data.name === 'FIN') return false
          return (displayMode.value === 'earlyTimes' || displayMode.value === 'lateTimes' || displayMode.value === 'complete')
        })
      ),
      // Date au plus tard (à droite, bleu)
      $(go.TextBlock,
        {
          row: 2,
          column: 2,
          font: 'bold 12pt sans-serif',
          textAlign: 'center',
          stroke: 'blue'
        },
        new go.Binding('text', '', data => {
          if (data.name === 'DEBUT' || data.name === 'FIN') return ''
          if (displayMode.value === 'lateTimes' || displayMode.value === 'complete') {
            return data.lateTime
          }
          return ''
        })
      ),
      // Float (en bas, orange)
      $(go.TextBlock,
        {
          row: 3,
          columnSpan: 3,
          font: 'bold 10pt sans-serif',
          textAlign: 'center',
          stroke: 'orange',
          margin: new go.Margin(2, 0, 0, 0)
        },
        new go.Binding('text', '', data => {
          if (data.name === 'DEBUT' || data.name === 'FIN') return ''
          if (displayMode.value === 'floats' || displayMode.value === 'complete') {
            return `Float: ${data.float || 0}`
          }
          return ''
        })
      )
    )
  )
}

function createLinkTemplate($) {
  return $(go.Link,
    {
      corner: 10,
      selectable: true,
    },
    $(go.Shape,
      {
        strokeWidth: 2,
        stroke: 'black'
      },
      new go.Binding('stroke', '', data => {
        if (displayMode.value === 'criticalPath' || displayMode.value === 'complete') {
          if (data.isCritical) return 'red'
          if (data.isFictitious && data.isCriticalFictitious) return 'red'
        }
        return 'black'
      }),
      new go.Binding('strokeWidth', '', data => {
        if (displayMode.value === 'criticalPath' || displayMode.value === 'complete') {
          if (data.isCritical) return 3
          if (data.isFictitious && data.isCriticalFictitious) return 3
        }
        return 2
      }),
      new go.Binding('strokeDashArray', 'isFictitious', f => f ? [5, 5] : null)
    ),
    $(go.Shape,
      {
        toArrow: 'Standard',
        fill: 'black',
        stroke: 'black'
      },
      new go.Binding('stroke', '', data => {
        if (displayMode.value === 'criticalPath' || displayMode.value === 'complete') {
          if (data.isCritical) return 'red'
          if (data.isFictitious && data.isCriticalFictitious) return 'red'
        }
        return 'black'
      }),
      new go.Binding('fill', '', data => {
        if (displayMode.value === 'criticalPath' || displayMode.value === 'complete') {
          if (data.isCritical) return 'red'
          if (data.isFictitious && data.isCriticalFictitious) return 'red'
        }
        return 'black'
      })
    ),
    // Étiquette avec nom et durée de la tâche
    $(go.Panel, 'Auto',
      $(go.Shape, 'RoundedRectangle',
        {
          fill: 'white',
          stroke: 'gray',
          strokeWidth: 1
        },
        new go.Binding('fill', '', data => {
          if (displayMode.value === 'criticalPath' || displayMode.value === 'complete') {
            if (data.isCritical) return '#ffe6e6'
            if (data.isFictitious && data.isCriticalFictitious) return '#ffe6e6'
          }
          return 'white'
        }),
        new go.Binding('stroke', '', data => {
          if (displayMode.value === 'criticalPath' || displayMode.value === 'complete') {
            if (data.isCritical) return 'red'
            if (data.isFictitious && data.isCriticalFictitious) return 'red'
          }
          return 'gray'
        })
      ),
      $(go.Panel, 'Table',
        { margin: 4 },
        // Nom de la tâche
        $(go.TextBlock,
          {
            row: 0,
            font: 'bold 12pt sans-serif',
            textAlign: 'center'
          },
          new go.Binding('text', 'taskName')
        ),
        // Durée
        $(go.TextBlock,
          {
            row: 1,
            font: '10pt sans-serif',
            textAlign: 'center'
          },
          new go.Binding('text', 'duration', d => `${d}`)
        )
      )
    )
  )
}

function generateModelData(data) {
  // Même logique que l'original pour créer les événements et liens
  const events = new Map()
  const links = []

  // Créer l'événement de départ
  events.set('START', {
    key: 'START',
    name: 'DEBUT',
    earlyTime: 0,
    lateTime: 0,
    float: 0
  })

  // Créer l'événement final
  events.set('FIN', {
    key: 'FIN',
    name: 'FIN',
    earlyTime: data.duration,
    lateTime: data.duration,
    float: 0
  })

  const taskToStartEvent = new Map()
  const taskToEndEvent = new Map()

  // Première passe : créer les événements de début et fin pour chaque tâche
  Object.entries(data.tasks).forEach(([taskName, task]) => {
    if (taskName !== 'fin') {
      // Événement de début de la tâche
      let startEventKey = 'START'
      if (task.predecessors && task.predecessors.length > 0) {
        const predKey = task.predecessors.sort().join('_') + '_END'
        if (!events.has(predKey)) {
          events.set(predKey, {
            key: predKey,
            name: predKey,
            earlyTime: task.earlyStart,
            lateTime: task.lateStart,
            float: task.lateStart - task.earlyStart
          })
        }
        startEventKey = predKey
      }
      taskToStartEvent.set(taskName, startEventKey)

      // Événement de fin de la tâche
      let endEventKey = 'FIN'
      if (task.successors && task.successors.length > 0 && !task.successors.includes('fin')) {
        endEventKey = taskName + '_END'
        if (!events.has(endEventKey)) {
          events.set(endEventKey, {
            key: endEventKey,
            name: endEventKey,
            earlyTime: task.earlyFinish,
            lateTime: task.lateFinish,
            float: task.lateFinish - task.earlyFinish
          })
        }
      }
      taskToEndEvent.set(taskName, endEventKey)
    }
  })

  // Fonction pour vérifier si un arc fictif relie deux nœuds du chemin critique
  function isOnCriticalPath(eventKey, tasks, criticalPath) {
    for (const [taskName, task] of Object.entries(tasks)) {
      if (taskName !== 'fin' && criticalPath.includes(taskName)) {
        const taskStart = taskToStartEvent.get(taskName)
        const taskEnd = taskToEndEvent.get(taskName)
        if (eventKey === taskStart || eventKey === taskEnd) {
          return true
        }
      }
    }
    return eventKey === 'START' || eventKey === 'FIN'
  }

  // Deuxième passe : créer les liens entre les événements
  Object.entries(data.tasks).forEach(([taskName, task]) => {
    if (taskName !== 'fin') {
      const fromEvent = taskToStartEvent.get(taskName)
      const toEvent = taskToEndEvent.get(taskName)

      // Créer le lien principal pour la tâche
      links.push({
        from: fromEvent,
        to: toEvent,
        taskName: taskName.toUpperCase(),
        duration: task.duration,
        isCritical: data.criticalPath.includes(taskName),
        isFictitious: false,
        isCriticalFictitious: false
      })

      // Créer des liens vers les successeurs si nécessaire
      if (task.successors && task.successors.length > 0) {
        task.successors.forEach(successor => {
          if (successor !== 'fin') {
            const successorStartEvent = taskToStartEvent.get(successor)
            if (toEvent !== successorStartEvent) {
              const isCriticalFictitious = isOnCriticalPath(toEvent, data.tasks, data.criticalPath) && 
                                         isOnCriticalPath(successorStartEvent, data.tasks, data.criticalPath)
              
              links.push({
                from: toEvent,
                to: successorStartEvent,
                taskName: 'ARC FICTIF',
                duration: 0,
                isCritical: false,
                isFictitious: true,
                isCriticalFictitious: isCriticalFictitious
              })
            }
          }
        })
      }
    }
  })

  // Traiter les tâches sans prédécesseurs
  Object.entries(data.tasks).forEach(([taskName, task]) => {
    if (taskName !== 'fin' && (!task.predecessors || task.predecessors.length === 0)) {
      const taskStartEvent = taskToStartEvent.get(taskName)
      if (taskStartEvent !== 'START') {
        const isCriticalFictitious = isOnCriticalPath('START', data.tasks, data.criticalPath) && 
                                   isOnCriticalPath(taskStartEvent, data.tasks, data.criticalPath)
        
        links.push({
          from: 'START',
          to: taskStartEvent,
          taskName: 'ARC FICTIF',
          duration: 0,
          isCritical: false,
          isFictitious: true,
          isCriticalFictitious: isCriticalFictitious
        })
      }
    }
  })

  // Nettoyer les événements non utilisés
  const usedEvents = new Set()
  links.forEach(link => {
    usedEvents.add(link.from)
    usedEvents.add(link.to)
  })
  usedEvents.add('START')
  usedEvents.add('FIN')

  const filteredEvents = new Map()
  usedEvents.forEach(eventKey => {
    if (events.has(eventKey)) {
      filteredEvents.set(eventKey, events.get(eventKey))
    }
  })

  // Recalculer les temps des événements
  Object.entries(data.tasks).forEach(([taskName, task]) => {
    if (taskName !== 'fin') {
      const startEvent = taskToStartEvent.get(taskName)
      const endEvent = taskToEndEvent.get(taskName)

      if (filteredEvents.has(startEvent)) {
        const event = filteredEvents.get(startEvent)
        event.earlyTime = Math.max(event.earlyTime || 0, task.earlyStart)
        event.lateTime = Math.min(event.lateTime || Infinity, task.lateStart)
        event.float = event.lateTime - event.earlyTime
      }

      if (filteredEvents.has(endEvent)) {
        const event = filteredEvents.get(endEvent)
        event.earlyTime = Math.max(event.earlyTime || 0, task.earlyFinish)
        event.lateTime = Math.min(event.lateTime || Infinity, task.lateFinish)
        event.float = event.lateTime - event.earlyTime
      }
    }
  })

  return {
    nodes: Array.from(filteredEvents.values()),
    links: links
  }
}

// Watcher pour régénérer le diagramme quand le mode change
watch(displayMode, () => {
  if (originalData) {
    generateCPM()
  }
})

watch(() => props.generate, (newValue) => {
  if (newValue) {
    generateCPM()
    emit("planFinished", true)
  }
})

onMounted(() => {
  generateCPM()
})
</script>

<style scoped>
.toggle-panel-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  padding: 12px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0,123,255,0.3);
  transition: all 0.3s ease;
}

.toggle-panel-btn:hover {
  background: #0056b3;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,123,255,0.4);
}

.toggle-panel-btn.panel-hidden {
  background: #28a745;
}

.toggle-panel-btn.panel-hidden:hover {
  background: #1e7e34;
}

.cpm-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  gap: 20px;
}

.control-panel {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.control-panel h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.button-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.control-btn {
  padding: 10px 16px;
  border: 2px solid #007bff;
  background: white;
  color: #007bff;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.control-btn:hover {
  background: #007bff;
  color: white;
}

.control-btn.active {
  background: #007bff;
  color: white;
  box-shadow: 0 2px 8px rgba(0,123,255,0.3);
}

.control-btn.complete {
  border-color: #28a745;
  color: #28a745;
}

.control-btn.complete:hover,
.control-btn.complete.active {
  background: #28a745;
  color: white;
}

.step-controls {
  margin-top: 15px;
  padding: 15px;
  background: #e9ecef;
  border-radius: 6px;
}

.step-controls h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 16px;
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.nav-btn {
  padding: 8px 16px;
  border: 1px solid #007bff;
  background: white;
  color: #007bff;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.nav-btn:hover:not(:disabled) {
  background: #007bff;
  color: white;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: #ccc;
  color: #666;
}

.step-info {
  font-weight: 500;
  color: #333;
  padding: 0 10px;
}

.legend {
  border-top: 1px solid #dee2e6;
  padding-top: 15px;
}

.legend h4 {
  margin: 0 0 10px 0;
  color: #555;
  font-size: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  margin-right: 10px;
}

.legend-color.early-time {
  background: red;
}

.legend-color.late-time {
  background: blue;
}

.legend-color.float-time {
  background: orange;
}

.legend-color.critical-path {
  background: red;
  border: 2px solid red;
}

.diagram-container {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 6px;
  min-height: 500px;
}
</style>