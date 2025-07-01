<template>
   <div ref="diagramDiv" style="width: 100vw; height: 100vh; border: 1px solid #ddd;"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import go from 'gojs'
import axios from 'axios'

const diagramDiv = ref(null)

onMounted(async () => {
  const $ = go.GraphObject.make
  const diagram = $(go.Diagram, diagramDiv.value, {
    'undoManager.isEnabled': true,
    layout: $(go.LayeredDigraphLayout, {
        layerSpacing: 150,
        columnSpacing: 150,
    }) // layout orienté top-down auto
  })


  // Template pour les nœuds (événements)
  diagram.nodeTemplate =
    $(go.Node, 'Auto',
      $(go.Shape, 'Circle',
        { 
          fill: 'white', 
          strokeWidth: 2,
          stroke: 'black',
          width: 80,
          height: 80
        }
      ),
      $(go.Panel, 'Table',
        { margin: 4 },
        // Date au plus tôt (en haut)
        $(go.TextBlock, 
          { 
            row: 0, 
            font: 'bold 12pt sans-serif',
            textAlign: 'center',
            stroke: 'red'
          },
          new go.Binding('text', 'earlyDate')
        ),
        // Ligne de séparation visuelle
        $(go.Shape, 'LineH',
          {
            row: 1,
            stroke: 'black',
            strokeWidth: 1,
            width: 50,
            height: 1,
            margin: new go.Margin(2, 0, 2, 0)
          }
        ),
        // Date au plus tard (en bas)
        $(go.TextBlock, 
          { 
            row: 2, 
            font: 'bold 12pt sans-serif',
            textAlign: 'center',
            stroke: 'blue'
          },
          new go.Binding('text', 'lateDate')
        )
      )
    )

  // Template pour les liens (tâches)
  diagram.linkTemplate =
    $(go.Link,
      { 
        // routing: go.Link.Orthogonal,
        corner: 10,
        selectable: true,
      },
      $(go.Shape,
        { 
          strokeWidth: 2,
          stroke: 'black'
        },
        new go.Binding('stroke', 'isCritical', b => b ? 'red' : 'black'),
        new go.Binding('strokeWidth', 'isCritical', b => b ? 3 : 2)
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
            new go.Binding('text', 'duration', d => ` ${d}`)
          )
        )
      )
    )

  // Charger données backend
  const { data } = await axios.get('http://localhost:8006/api/critical-path')

  // Transformer en format GoJS avec la structure originale
  const nodes = []
  const links = []

  // Créer les nœuds pour chaque tâche
  Object.entries(data.tasks).forEach(([name, task]) => {
    if (name !== 'fin') {
      nodes.push({
        key: name.toUpperCase(),
        earlyDate: task.earlyStart,
        lateDate: task.lateStart,
        isCritical: data.criticalPath.includes(name)
      })
    }
  })

  // Ajouter le nœud de fin
  nodes.push({
    key: 'FIN',
    earlyDate: data.duration,
    lateDate: 'FIN',
    isCritical: true
  })

  // Créer les liens avec les noms et durées sur les arcs
  Object.entries(data.tasks).forEach(([name, task]) => {
    if (task.successors && name !== 'fin') {
      task.successors.forEach(succ => {
        const targetKey = succ === 'fin' ? 'FIN' : succ.toUpperCase()
        links.push({
          from: name.toUpperCase(),
          to: targetKey,
          taskName: name.toUpperCase(),
          duration: task.duration,
          isCritical: data.criticalPath.includes(name) && (succ === 'fin' || data.criticalPath.includes(succ))
        })
      })
    }
  })

  diagram.model = new go.GraphLinksModel(nodes, links)
})
</script>
