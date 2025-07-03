<template>
  <div ref="diagramDiv" style="width: 100%; height: 100%; border: 1px solid #ddd;"></div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import go from 'gojs'
import axios from 'axios'

const diagramDiv = ref(null)
const props = defineProps({
  generate: Boolean
})

let diagram = null

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
  // Template pour les nœuds (événements)
  diagram.nodeTemplate =
    $(go.Node, 'Auto',
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
        // Date au plus tôt (à gauche, rouge) - seulement pour les nœuds intermédiaires
        $(go.TextBlock,
          {
            row: 2,
            column: 0,
            font: 'bold 12pt sans-serif',
            textAlign: 'center',
            stroke: 'red'
          },
          new go.Binding('text', '', data => (data.name === 'DEBUT' || data.name === 'FIN') ? '' : data.earlyTime)
        ),
        // Ligne de séparation verticale - seulement pour les nœuds intermédiaires
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
          new go.Binding('visible', 'name', name => name !== 'DEBUT' && name !== 'FIN')
        ),
        // Dates au plus tard (à droite, bleu) - seulement pour les nœuds intermédiaires
        $(go.Panel, 'Vertical',
          {
            row: 2,
            column: 2,
            alignment: go.Spot.Center
          },
          $(go.TextBlock,
            {
              font: 'bold 12pt sans-serif',
              textAlign: 'center',
              stroke: 'blue',
              maxLines: 6,
              wrap: go.TextBlock.WrapDesiredSize
            },
            new go.Binding('text', '', data => {
              if (data.name === 'DEBUT' || data.name === 'FIN') return ''

              if (data.successorLateFinishes && data.successorLateFinishes.size > 0) {
                // Trier les successeurs par ordre alphabétique
                const sortedSuccessors = Array.from(data.successorLateFinishes.keys()).sort()
                const orderedValues = sortedSuccessors.map(successor =>
                  data.successorLateFinishes.get(successor)
                )
                return orderedValues.join('\n')
              }

              if (data.lateFinishes && data.lateFinishes.length > 0) {
                return data.lateFinishes.join('\n')
              }

              return data.lateTime
            })
          )
        )
      )
    )

  // Template pour les liens (tâches)
  diagram.linkTemplate =
    $(go.Link,
      {
        corner: 10,
        selectable: true,
      },
      $(go.Shape,
        {
          strokeWidth: 2,
          stroke: 'black'
        },
        new go.Binding('stroke', 'isCritical', b => b ? 'red' : 'black'),
        new go.Binding('strokeWidth', 'isCritical', b => b ? 3 : 2),
        new go.Binding('strokeDashArray', 'isFictitious', f => f ? [5, 5] : null)
      ),
      $(go.Shape,
        {
          toArrow: 'Standard',
          fill: 'black',
          stroke: 'black'
        },
        new go.Binding('stroke', 'isCritical', b => b ? 'red' : 'black'),
        new go.Binding('fill', 'isCritical', b => b ? 'red' : 'black')
      ),
      // Étiquette avec nom et durée de la tâche
      $(go.Panel, 'Auto',
        $(go.Shape, 'RoundedRectangle',
          {
            fill: 'white',
            stroke: 'gray',
            strokeWidth: 1
          },
          new go.Binding('fill', 'isCritical', b => b ? '#ffe6e6' : 'white'),
          new go.Binding('stroke', 'isCritical', b => b ? 'red' : 'gray')
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

  // Charger données backend
  const { data } = await axios.get('http://localhost:8006/api/critical-path')

  // Créer les événements et liens
  const events = new Map()
  const links = []

  // Créer l'événement de départ
  events.set('START', {
    key: 'START',
    name: 'DEBUT',
    earlyTime: 0,
    lateTime: 0,
    lateFinishes: [],
    successorLateFinishes: new Map()
  })

  // Créer l'événement final
  events.set('FIN', {
    key: 'FIN',
    name: 'FIN',
    earlyTime: data.duration,
    lateTime: data.duration,
    lateFinishes: []
  })

  // Créer des événements uniques pour chaque point de convergence/divergence
  const taskToStartEvent = new Map()
  const taskToEndEvent = new Map()

  // Première passe : créer les événements de début et fin pour chaque tâche
  Object.entries(data.tasks).forEach(([taskName, task]) => {
    if (taskName !== 'fin') {
      // Événement de début de la tâche
      let startEventKey = 'START'
      if (task.predecessors && task.predecessors.length > 0) {
        // Créer une clé unique basée sur les prédécesseurs
        const predKey = task.predecessors.sort().join('_') + '_END'
        if (!events.has(predKey)) {
          events.set(predKey, {
            key: predKey,
            name: predKey,
            earlyTime: task.earlyStart,
            lateTime: task.lateStart,
            lateFinishes: [],
            successorLateFinishes: new Map()
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
            lateFinishes: task.lateFinishes || [],
            successorLateFinishes: new Map()
          })
        }
      }
      taskToEndEvent.set(taskName, endEventKey)
    }
  })

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
        isFictitious: false
      })

      // Créer des liens vers les successeurs si nécessaire
      if (task.successors && task.successors.length > 0) {
        task.successors.forEach(successor => {
          if (successor !== 'fin') {
            const successorStartEvent = taskToStartEvent.get(successor)
            if (toEvent !== successorStartEvent) {
              // Arc fictif avec durée 0
              links.push({
                from: toEvent,
                to: successorStartEvent,
                // taskName: 'ARC FICTIF',
                duration: 0,
                isCritical: false,
                isFictitious: true
              })
            }
          }
        })
      }
    }
  })

  // Traiter les tâches sans prédécesseurs (connecter à START)
  Object.entries(data.tasks).forEach(([taskName, task]) => {
    if (taskName !== 'fin' && (!task.predecessors || task.predecessors.length === 0)) {
      const taskStartEvent = taskToStartEvent.get(taskName)
      if (taskStartEvent !== 'START') {
        // Créer un arc fictif de START vers le début de la tâche
        links.push({
          from: 'START',
          to: taskStartEvent,
          taskName: 'ARC FICTIF',
          duration: 0,
          isCritical: false,
          isFictitious: true
        })
      }
    }
  })

  // Nettoyer les événements non utilisés et recalculer les temps
  const usedEvents = new Set()
  links.forEach(link => {
    usedEvents.add(link.from)
    usedEvents.add(link.to)
  })
  usedEvents.add('START')
  usedEvents.add('FIN')

  // Filtrer les événements pour ne garder que ceux utilisés
  const filteredEvents = new Map()
  usedEvents.forEach(eventKey => {
    if (events.has(eventKey)) {
      filteredEvents.set(eventKey, events.get(eventKey))
    }
  })

  // Recalculer les temps des événements basés sur les tâches
  Object.entries(data.tasks).forEach(([taskName, task]) => {
    if (taskName !== 'fin') {
      const startEvent = taskToStartEvent.get(taskName)
      const endEvent = taskToEndEvent.get(taskName)

      if (filteredEvents.has(startEvent)) {
        const event = filteredEvents.get(startEvent)
        event.earlyTime = Math.max(event.earlyTime || 0, task.earlyStart)
        event.lateTime = Math.min(event.lateTime || Infinity, task.lateStart)
      }

      if (filteredEvents.has(endEvent)) {
        const event = filteredEvents.get(endEvent)
        event.earlyTime = Math.max(event.earlyTime || 0, task.earlyFinish)
        event.lateTime = Math.min(event.lateTime || Infinity, task.lateFinish)

        // Créer un mapping entre les successeurs et leurs lateFinishes
        if (task.lateFinishes && task.lateFinishes.length > 0 && task.successors) {
          if (!event.successorLateFinishes) {
            event.successorLateFinishes = new Map()
          }

          // Associer chaque successeur à sa lateFinish correspondante
          task.successors.forEach((successor, index) => {
            if (index < task.lateFinishes.length) {
              event.successorLateFinishes.set(successor, task.lateFinishes[index])
            }
          })
        }
      }
    }
  })

  // Convertir les événements en format GoJS
  const nodes = Array.from(filteredEvents.values())

  diagram.model = new go.GraphLinksModel(nodes, links)
}

const emit = defineEmits(["planFinished"])

watch(() => props.generate, (newValue) => {
  if (newValue) {
    generateCPM()
    emit("planFinished", true)
  } else {
    console.log("kbi  ")
  }
})

onMounted(() => {
  if (props.generate) generateCPM()
})
</script>