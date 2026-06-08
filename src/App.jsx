import { useReducer, useCallback, useEffect, useRef } from 'react'
import CellGrid from './CellGrid'
import ControlPanel from './ControlPanel'
import { stepLayer } from './stepLayer'
import { saveToFile, loadFromFile } from './fileIO'
import './App.css'

let _uid = 1
function genId() { return `_${_uid++}` }

function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

const GRID = { cols: 60, rows: 44, cellSize: 13 }

function createFilledCells(cols, rows, speciesId) {
  const cells = {}
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      cells[`${x},${y}`] = speciesId
    }
  }
  return cells
}

function reorder(arr, from, to) {
  const result = [...arr]
  const [item] = result.splice(from, 1)
  result.splice(to, 0, item)
  return result
}

function createRandomCells(cols, rows, speciesIds) {
  const cells = {}
  const n = speciesIds.length
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      cells[`${x},${y}`] = speciesIds[Math.floor(Math.random() * n)]
    }
  }
  return cells
}

const initialState = {
  grid: GRID,
  species: [
    { id: 'sp1', name: 'Ground', color: '#243424' },
  ],
  layers: [
    { id: 'l1', name: 'Base', visible: true, cells: createFilledCells(GRID.cols, GRID.rows, 'sp1'), rules: [] },
  ],
  activeLayerId: 'l1',
  activeSpeciesId: 'sp1',
  resetSpeciesIds: [],
  tool: 'paint',
  running: false,
}

function reducer(state, action) {
  switch (action.type) {

    case 'PAINT_CELL': {
      const { x, y } = action
      const layers = state.layers.map(l =>
        l.id !== state.activeLayerId ? l :
        { ...l, cells: { ...l.cells, [`${x},${y}`]: state.activeSpeciesId } }
      )
      return { ...state, layers }
    }

    // Erase = reset cell to the first species (background)
    case 'ERASE_CELL': {
      const { x, y } = action
      const bgId = state.species[0].id
      const layers = state.layers.map(l =>
        l.id !== state.activeLayerId ? l :
        { ...l, cells: { ...l.cells, [`${x},${y}`]: bgId } }
      )
      return { ...state, layers }
    }

    case 'SET_TOOL':
      return { ...state, tool: action.tool }

    case 'SET_ACTIVE_LAYER':
      return { ...state, activeLayerId: action.id }

    case 'SET_ACTIVE_SPECIES':
      return { ...state, activeSpeciesId: action.id }

    case 'ADD_LAYER': {
      const id = genId()
      const layer = {
        id,
        name: `Layer ${state.layers.length + 1}`,
        visible: true,
        cells: createFilledCells(state.grid.cols, state.grid.rows, state.species[0].id),
        rules: [],
      }
      return { ...state, layers: [...state.layers, layer], activeLayerId: id }
    }

    case 'DELETE_LAYER': {
      if (state.layers.length <= 1) return state
      const layers = state.layers.filter(l => l.id !== action.id)
      const activeLayerId = state.activeLayerId === action.id
        ? layers[layers.length - 1].id
        : state.activeLayerId
      return { ...state, layers, activeLayerId }
    }

    case 'RENAME_LAYER':
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === action.id ? { ...l, name: action.name } : l
        )
      }

    case 'TOGGLE_LAYER_VISIBLE':
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === action.id ? { ...l, visible: !l.visible } : l
        )
      }

    case 'MOVE_LAYER': {
      const idx = state.layers.findIndex(l => l.id === action.id)
      const newIdx = action.direction === 'up' ? idx + 1 : idx - 1
      if (newIdx < 0 || newIdx >= state.layers.length) return state
      const layers = [...state.layers]
      ;[layers[idx], layers[newIdx]] = [layers[newIdx], layers[idx]]
      return { ...state, layers }
    }

    // Clear = fill with reset pool (random) or background species if pool is empty
    case 'CLEAR_LAYER': {
      const fillIds = state.resetSpeciesIds.length > 0 ? state.resetSpeciesIds : [state.species[0].id]
      const cells = fillIds.length === 1
        ? createFilledCells(state.grid.cols, state.grid.rows, fillIds[0])
        : createRandomCells(state.grid.cols, state.grid.rows, fillIds)
      return {
        ...state,
        layers: state.layers.map(l => l.id === action.id ? { ...l, cells } : l)
      }
    }

    case 'ADD_SPECIES': {
      const id = genId()
      const sp = { id, name: `State ${state.species.length + 1}`, color: '#a78bfa' }
      return { ...state, species: [...state.species, sp], activeSpeciesId: id }
    }

    // Delete species = remap its cells to the first remaining species
    case 'DELETE_SPECIES': {
      if (state.species.length <= 1) return state
      const species = state.species.filter(s => s.id !== action.id)
      const fallbackId = species[0].id
      const layers = state.layers.map(l => ({
        ...l,
        cells: Object.fromEntries(
          Object.entries(l.cells).map(([key, sid]) => [key, sid === action.id ? fallbackId : sid])
        )
      }))
      const activeSpeciesId = state.activeSpeciesId === action.id ? species[0].id : state.activeSpeciesId
      const resetSpeciesIds = state.resetSpeciesIds.filter(id => id !== action.id)
      return { ...state, species, layers, activeSpeciesId, resetSpeciesIds }
    }

    case 'RENAME_SPECIES':
      return {
        ...state,
        species: state.species.map(s =>
          s.id === action.id ? { ...s, name: action.name } : s
        )
      }

    case 'RECOLOR_SPECIES':
      return {
        ...state,
        species: state.species.map(s =>
          s.id === action.id ? { ...s, color: action.color } : s
        )
      }

    case 'ADD_RULE':
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id !== action.layerId ? l :
          { ...l, rules: [...(l.rules ?? []), { id: genId(), raw: '' }] }
        )
      }

    case 'UPDATE_RULE':
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id !== action.layerId ? l :
          { ...l, rules: l.rules.map(r => r.id === action.ruleId ? { ...r, raw: action.raw } : r) }
        )
      }

    case 'DELETE_RULE':
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id !== action.layerId ? l :
          { ...l, rules: l.rules.filter(r => r.id !== action.ruleId) }
        )
      }

    case 'APPLY_STEP': {
      const cellsById = Object.fromEntries(action.newLayerCells.map(({ id, cells }) => [id, cells]))
      return {
        ...state,
        layers: state.layers.map(l => ({ ...l, cells: cellsById[l.id] ?? l.cells }))
      }
    }

    case 'SET_GRID_DIMS': {
      const newGrid = { ...state.grid, ...action.dims }
      const { cols, rows } = newGrid
      if (cols === state.grid.cols && rows === state.grid.rows) {
        return { ...state, grid: newGrid }
      }
      const bgId = state.species[0].id
      const layers = state.layers.map(l => {
        const cells = {}
        for (let x = 0; x < cols; x++)
          for (let y = 0; y < rows; y++) {
            const key = `${x},${y}`
            cells[key] = l.cells[key] ?? bgId
          }
        return { ...l, cells }
      })
      return { ...state, grid: newGrid, layers }
    }

    case 'REORDER_LAYERS':
      return { ...state, layers: reorder(state.layers, action.from, action.to) }

    case 'REORDER_SPECIES':
      return { ...state, species: reorder(state.species, action.from, action.to) }

    case 'REORDER_RULES':
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id !== action.layerId ? l :
          { ...l, rules: reorder(l.rules, action.from, action.to) }
        )
      }

    case 'TOGGLE_RESET_SPECIES': {
      const has = state.resetSpeciesIds.includes(action.id)
      const resetSpeciesIds = has
        ? state.resetSpeciesIds.filter(id => id !== action.id)
        : [...state.resetSpeciesIds, action.id]
      return { ...state, resetSpeciesIds }
    }

    case 'SET_RUNNING':
      return { ...state, running: action.running }

    case 'NEW_SESSION':
      return initialState

    case 'LOAD_STATE': {
      const { grid, species, layers, activeLayerId, activeSpeciesId } = action.data
      const validLayerId = layers.find(l => l.id === activeLayerId) ? activeLayerId : layers[0].id
      const validSpeciesId = species.find(s => s.id === activeSpeciesId) ? activeSpeciesId : species[0].id
      const resetSpeciesIds = (action.data.resetSpeciesIds ?? []).filter(id => species.find(s => s.id === id))
      return { grid, species, layers, activeLayerId: validLayerId, activeSpeciesId: validSpeciesId, resetSpeciesIds, tool: 'paint', running: false }
    }

    default:
      return state
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const stateRef = useRef(state)
  stateRef.current = state

  const handleCellInteract = useCallback((x, y, forceErase) => {
    if (forceErase || state.tool === 'erase') {
      dispatch({ type: 'ERASE_CELL', x, y })
    } else {
      dispatch({ type: 'PAINT_CELL', x, y })
    }
  }, [state.tool])

  const doStep = useCallback(() => {
    const { layers, species } = stateRef.current
    const newLayerCells = layers.map(layer => ({
      id: layer.id,
      cells: layer.rules?.length > 0 ? stepLayer(layer, layers, species) : layer.cells,
    }))
    dispatch({ type: 'APPLY_STEP', newLayerCells })
  }, [])

  useEffect(() => {
    if (!state.running) return
    const id = setInterval(doStep, 150)
    return () => clearInterval(id)
  }, [state.running, doStep])

  const activeLayer = state.layers.find(l => l.id === state.activeLayerId)
  const activeSpecies = state.species.find(s => s.id === state.activeSpeciesId)
  const hoverFill = state.tool === 'erase'
    ? hexToRgba(state.species[0].color, 0.55)
    : activeSpecies ? hexToRgba(activeSpecies.color, 0.5) : null

  return (
    <div className="app">
      <CellGrid
        grid={state.grid}
        cells={activeLayer?.cells ?? {}}
        species={state.species}
        hoverFill={hoverFill}
        onCellInteract={handleCellInteract}
      />
      <ControlPanel
        state={state}
        dispatch={dispatch}
        onStep={doStep}
        onNew={() => { if (window.confirm('Start a new session? Unsaved work will be lost.')) dispatch({ type: 'NEW_SESSION' }) }}
        onSave={() => saveToFile(state)}
        onLoad={() => loadFromFile(data => dispatch({ type: 'LOAD_STATE', data }))}
      />
    </div>
  )
}
