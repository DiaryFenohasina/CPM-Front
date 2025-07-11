<template>
  <div class="cpm-container">
    <button @click="toggleControlPanel" class="toggle-panel-btn" :class="{ 'panel-hidden': !showControlPanel }">
      <span v-if="showControlPanel">📊</span>
      <span v-else>🎛️</span>
    </button>

    <div class="control-panel" v-show="showControlPanel">
      <h3>Contrôles d'affichage CPM</h3>
      <div class="button-group">
        <button @click="setDisplayMode('schema')" :class="{ active: displayMode === 'schema' }" class="control-btn">
          1. Schéma de base
        </button>
        <button @click="setDisplayMode('earlyTimes')" :class="{ active: displayMode === 'earlyTimes' }"
          class="control-btn">
          2. Dates au plus tôt
        </button>
        <button @click="setDisplayMode('lateTimes')" :class="{ active: displayMode === 'lateTimes' }"
          class="control-btn">
          3. Dates au plus tard
        </button>
        <button @click="setDisplayMode('floats')" :class="{ active: displayMode === 'floats' }" class="control-btn">
          4. Marges (Float)
        </button>
        <button @click="setDisplayMode('criticalPath')" :class="{ active: displayMode === 'criticalPath' }"
          class="control-btn">
          5. Chemin critique
        </button>
        <button @click="setDisplayMode('linkByLink')" :class="{ active: displayMode === 'linkByLink' }"
          class="control-btn">
          6. Arcs un par un
        </button>
        <button @click="setDisplayMode('complete')" :class="{ active: displayMode === 'complete' }"
          class="control-btn complete">
          Affichage complet
        </button>
      </div>

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

    <div ref="diagramDiv" class="diagram-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import go from 'gojs'
import { api } from '@/config/axiosConfig'

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

function toggleControlPanel() {
  showControlPanel.value = !showControlPanel.value
}

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

  diagram.nodeTemplate = createNodeTemplate($)

  diagram.linkTemplate = createLinkTemplate($)

  if (!originalData) {
    try {

      const { data } = await api.get('/critical-path')
      originalData = data
    } catch (error) {
      originalData = {
        tasks: {},
        duration: 0,
        criticalPath: []
      }
    }
  }

  const { nodes, links } = generateModelData(originalData)

  let filteredNodes = nodes
  let filteredLinks = links

  if (displayMode.value === 'linkByLink') {
    filteredLinks = links.slice(0, currentStep.value + 1)
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
        $(go.TextBlock,
          {
            row: 0,
            font: 'bold 12pt sans-serif',
            textAlign: 'center'
          },
          new go.Binding('text', 'taskName')
        ),
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
  const events = new Map()
  const links = []

  events.set('START', {
    key: 'START',
    name: 'DEBUT',
    earlyTime: 0,
    lateTime: 0,
    float: 0
  })

  events.set('FIN', {
    key: 'FIN',
    name: 'FIN',
    earlyTime: data.duration,
    lateTime: data.duration,
    float: 0
  })

  const taskToStartEvent = new Map()
  const taskToEndEvent = new Map()

  Object.entries(data.tasks).forEach(([taskName, task]) => {
    if (taskName !== 'fin') {
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

  Object.entries(data.tasks).forEach(([taskName, task]) => {
    if (taskName !== 'fin') {
      const fromEvent = taskToStartEvent.get(taskName)
      const toEvent = taskToEndEvent.get(taskName)

      links.push({
        from: fromEvent,
        to: toEvent,
        taskName: taskName.toUpperCase(),
        duration: task.duration,
        isCritical: data.criticalPath.includes(taskName),
        isFictitious: false,
        isCriticalFictitious: false
      })

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
@import url("../assets/css/graph-style.css");
</style>