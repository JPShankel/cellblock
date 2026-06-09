import { useState, useRef, useEffect } from 'react'
import { parseRule } from './parseRule'
import { EXAMPLES, loadExample } from './fileIO'

// ── Drag-to-reorder hook ──────────────────────────────────────────────────────
// onReorder(fromIndex, toIndex) is called with the display-order indices.

function useDragReorder(onReorder) {
  const [dragOver, setDragOver] = useState(null)
  const dragFrom = useRef(null)

  function props(index) {
    return {
      draggable: true,
      onDragStart(e) {
        dragFrom.current = index
        e.dataTransfer.effectAllowed = 'move'
      },
      onDragOver(e) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (dragOver !== index) setDragOver(index)
      },
      onDrop(e) {
        e.preventDefault()
        if (dragFrom.current !== null && dragFrom.current !== index) {
          onReorder(dragFrom.current, index)
        }
        setDragOver(null)
        dragFrom.current = null
      },
      onDragEnd() {
        setDragOver(null)
        dragFrom.current = null
      },
    }
  }

  return { dragOver, props }
}

// ── Layers ────────────────────────────────────────────────────────────────────

function LayerList({ layers, activeLayerId, dispatch }) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')

  const n = layers.length
  // Layers display reversed (top of stack first). Convert display idx → array idx.
  const { dragOver, props: dragProps } = useDragReorder((fromDisplay, toDisplay) => {
    dispatch({ type: 'REORDER_LAYERS', from: n - 1 - fromDisplay, to: n - 1 - toDisplay })
  })

  const startEdit = (e, layer) => {
    e.stopPropagation()
    setEditingId(layer.id)
    setDraft(layer.name)
  }

  const commitEdit = (id, fallback) => {
    dispatch({ type: 'RENAME_LAYER', id, name: draft.trim() || fallback })
    setEditingId(null)
  }

  const reversed = [...layers].reverse()

  return (
    <section className="panel-section">
      <div className="section-head">
        <span className="section-label">Layers</span>
        <button className="add-btn" onClick={() => dispatch({ type: 'ADD_LAYER' })}>+ Add</button>
      </div>
      <ul className="item-list">
        {reversed.map((layer, ri) => {
          const active = layer.id === activeLayerId
          return (
            <li
              key={layer.id}
              className={`item-row${active ? ' active' : ''}${dragOver === ri ? ' drag-over' : ''}`}
              onClick={() => dispatch({ type: 'SET_ACTIVE_LAYER', id: layer.id })}
              {...dragProps(ri)}
            >
              <span className="drag-handle" title="Drag to reorder">⠿</span>
              <button
                className="vis-btn"
                title={layer.visible ? 'Hide layer' : 'Show layer'}
                onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_LAYER_VISIBLE', id: layer.id }) }}
              >
                {layer.visible ? '●' : '○'}
              </button>

              {editingId === layer.id ? (
                <input
                  className="name-input"
                  value={draft}
                  autoFocus
                  onChange={e => setDraft(e.target.value)}
                  onBlur={() => commitEdit(layer.id, layer.name)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.target.blur()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="item-name" onDoubleClick={e => startEdit(e, layer)}>
                  {layer.name}
                </span>
              )}

              <div className="row-actions">
                <button title="Raise in stack" disabled={ri === 0}
                  onClick={e => { e.stopPropagation(); dispatch({ type: 'MOVE_LAYER', id: layer.id, direction: 'up' }) }}>↑</button>
                <button title="Lower in stack" disabled={ri === n - 1}
                  onClick={e => { e.stopPropagation(); dispatch({ type: 'MOVE_LAYER', id: layer.id, direction: 'down' }) }}>↓</button>
                <button title="Clear cells"
                  onClick={e => { e.stopPropagation(); dispatch({ type: 'CLEAR_LAYER', id: layer.id }) }}>⊘</button>
                <button title="Delete layer" disabled={n <= 1}
                  onClick={e => { e.stopPropagation(); dispatch({ type: 'DELETE_LAYER', id: layer.id }) }}>✕</button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ── Species ───────────────────────────────────────────────────────────────────

function SpeciesList({ species, activeSpeciesId, resetSpeciesIds, dispatch }) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')

  const { dragOver, props: dragProps } = useDragReorder((from, to) => {
    dispatch({ type: 'REORDER_SPECIES', from, to })
  })

  const startEdit = (e, sp) => {
    e.stopPropagation()
    setEditingId(sp.id)
    setDraft(sp.name)
  }

  const commitEdit = (id, fallback) => {
    dispatch({ type: 'RENAME_SPECIES', id, name: draft.trim() || fallback })
    setEditingId(null)
  }

  return (
    <section className="panel-section">
      <div className="section-head">
        <span className="section-label">State Species</span>
        <button className="add-btn" onClick={() => dispatch({ type: 'ADD_SPECIES' })}>+ Add</button>
      </div>
      <ul className="item-list">
        {species.map((sp, i) => {
          const active = sp.id === activeSpeciesId
          const inPool = resetSpeciesIds.includes(sp.id)
          return (
            <li
              key={sp.id}
              className={`item-row${active ? ' active' : ''}${dragOver === i ? ' drag-over' : ''}`}
              onClick={() => dispatch({ type: 'SET_ACTIVE_SPECIES', id: sp.id })}
              {...dragProps(i)}
            >
              <span className="drag-handle" title="Drag to reorder">⠿</span>
              <input
                type="color"
                className="color-swatch"
                value={sp.color}
                title="Change color"
                onClick={e => e.stopPropagation()}
                onChange={e => dispatch({ type: 'RECOLOR_SPECIES', id: sp.id, color: e.target.value })}
              />
              <button
                className={`reset-pool-btn${inPool ? ' in-pool' : ''}`}
                title={inPool ? 'Remove from reset fill' : 'Include in reset fill'}
                onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_RESET_SPECIES', id: sp.id }) }}
              >■</button>

              {editingId === sp.id ? (
                <input
                  className="name-input"
                  value={draft}
                  autoFocus
                  onChange={e => setDraft(e.target.value)}
                  onBlur={() => commitEdit(sp.id, sp.name)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.target.blur()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="item-name" onDoubleClick={e => startEdit(e, sp)}>
                  {sp.name}
                </span>
              )}

              <div className="row-actions">
                <button title="Delete species" disabled={species.length <= 1}
                  onClick={e => { e.stopPropagation(); dispatch({ type: 'DELETE_SPECIES', id: sp.id }) }}>✕</button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ── Rules ─────────────────────────────────────────────────────────────────────

function RuleRow({ rule, index, layerId, species, layers, dragOver, dragProps, dispatch }) {
  const parsed = parseRule(rule.raw, species, layers)
  const isValid = parsed.ok
  const isEmpty = !rule.raw.trim()

  return (
    <li
      className={`rule-row${dragOver === index ? ' drag-over' : ''}`}
      {...dragProps(index)}
    >
      <span className="drag-handle" title="Drag to reorder">⠿</span>
      <span
        className={`rule-status ${isEmpty ? 'rule-status-empty' : isValid ? 'rule-status-ok' : 'rule-status-err'}`}
        title={!isValid && !isEmpty ? parsed.error : isValid ? 'Valid' : ''}
      />
      <input
        className="rule-input"
        type="text"
        value={rule.raw}
        placeholder="e.g. Fire + >3Alive -> Dead * 1"
        spellCheck={false}
        onChange={e => dispatch({ type: 'UPDATE_RULE', layerId, ruleId: rule.id, raw: e.target.value })}
      />
      <button
        className="rule-delete"
        title="Delete rule"
        onClick={() => dispatch({ type: 'DELETE_RULE', layerId, ruleId: rule.id })}
      >✕</button>
    </li>
  )
}

function RuleList({ activeLayer, species, layers, dispatch }) {
  if (!activeLayer) return null
  const rules = activeLayer.rules ?? []

  const { dragOver, props: dragProps } = useDragReorder((from, to) => {
    dispatch({ type: 'REORDER_RULES', layerId: activeLayer.id, from, to })
  })

  return (
    <section className="panel-section rules-section">
      <div className="section-head">
        <span className="section-label">Rules — {activeLayer.name}</span>
        <button
          className="add-btn"
          onClick={() => dispatch({ type: 'ADD_RULE', layerId: activeLayer.id })}
        >+ Add</button>
      </div>
      {rules.length === 0 ? (
        <p className="rules-empty">No rules. Click + Add to define a transformation.</p>
      ) : (
        <ul className="rule-list">
          {rules.map((rule, i) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              index={i}
              layerId={activeLayer.id}
              species={species}
              layers={layers}
              dragOver={dragOver}
              dragProps={dragProps}
              dispatch={dispatch}
            />
          ))}
        </ul>
      )}
      <p className="rule-hint">
        Syntax: <code>SUBJECT [+ cond ...] -&gt; RESULT * prob</code><br />
        <code>Fire -&gt; Ash * 0.1</code> — unconditional, 10% chance<br />
        Conditions: <code>&gt;1Fire</code> (neighbors) · <code>Layer:Species</code> (other layer)
      </p>
    </section>
  )
}

// ── Grid dimensions ───────────────────────────────────────────────────────────

function GridControls({ grid, dispatch }) {
  const [cols, setCols] = useState(String(grid.cols))
  const [rows, setRows] = useState(String(grid.rows))

  useEffect(() => {
    setCols(String(grid.cols))
    setRows(String(grid.rows))
  }, [grid.cols, grid.rows])

  const apply = () => {
    const c = Math.max(1, Math.min(400, parseInt(cols, 10) || grid.cols))
    const r = Math.max(1, Math.min(300, parseInt(rows, 10) || grid.rows))
    setCols(String(c))
    setRows(String(r))
    // Fill the available canvas area (viewport minus panel and padding)
    const availW = window.innerWidth - 273 - 56   // 272px panel + 1px border + 28px*2 padding
    const availH = window.innerHeight - 56         // 28px*2 padding
    const s = Math.max(2, Math.floor(Math.min(availW / c, availH / r)))
    dispatch({ type: 'SET_GRID_DIMS', dims: { cols: c, rows: r, cellSize: s } })
  }

  const onKey = e => { if (e.key === 'Enter') { e.target.blur(); apply() } }

  return (
    <div className="grid-row">
      <span className="section-label">Grid</span>
      <input className="dim-input" type="number" value={cols}
        onChange={e => setCols(e.target.value)} onBlur={apply} onKeyDown={onKey}
        min="1" max="400" title="Columns" />
      <span className="dim-sep">×</span>
      <input className="dim-input" type="number" value={rows}
        onChange={e => setRows(e.target.value)} onBlur={apply} onKeyDown={onKey}
        min="1" max="300" title="Rows" />
    </div>
  )
}

// ── Simulation controls ───────────────────────────────────────────────────────

function SimControls({ running, dispatch, onStep }) {
  return (
    <div className="sim-controls">
      <span className="section-label">Simulation</span>
      <div className="sim-btns">
        <button
          className="sim-btn"
          onClick={onStep}
          disabled={running}
          title="Advance one generation"
        >
          Step
        </button>
        <button
          className={`sim-btn sim-run${running ? ' running' : ''}`}
          onClick={() => dispatch({ type: 'SET_RUNNING', running: !running })}
          title={running ? 'Pause simulation' : 'Run simulation'}
        >
          {running ? 'Pause' : 'Run'}
        </button>
      </div>
    </div>
  )
}

// ── Control panel root ────────────────────────────────────────────────────────

export default function ControlPanel({ state, dispatch, onStep, onNew, onSave, onLoad }) {
  const activeLayer = state.layers.find(l => l.id === state.activeLayerId)

  return (
    <aside className="control-panel">
      <header className="panel-header">
        <span className="panel-title">Cellblock</span>
        <div className="file-btns">
          <button className="file-btn" onClick={onNew} title="New session">New</button>
          <button className="file-btn" onClick={onSave} title="Save to JSON file">Save</button>
          <button className="file-btn" onClick={onLoad} title="Load from JSON file">Load</button>
        </div>
      </header>
      <div className="examples-row">
        <select
          className="examples-select"
          value=""
          onChange={e => {
            if (e.target.value) loadExample(e.target.value, data => dispatch({ type: 'LOAD_STATE', data }))
          }}
        >
          <option value="" disabled>Load example…</option>
          {EXAMPLES.map(ex => (
            <option key={ex.file} value={ex.file}>{ex.label}</option>
          ))}
        </select>
      </div>

      <div className="tool-row">
        <span className="section-label">Tool</span>
        <div className="tool-btns">
          <button
            className={`tool-btn${state.tool === 'paint' ? ' selected' : ''}`}
            onClick={() => dispatch({ type: 'SET_TOOL', tool: 'paint' })}
          >Paint</button>
          <button
            className={`tool-btn${state.tool === 'erase' ? ' selected' : ''}`}
            onClick={() => dispatch({ type: 'SET_TOOL', tool: 'erase' })}
          >Erase</button>
          <button
            className="tool-btn tool-btn-reset"
            title="Fill active layer with background species"
            onClick={() => dispatch({ type: 'CLEAR_LAYER', id: state.activeLayerId })}
          >Reset</button>
        </div>
      </div>

      <GridControls grid={state.grid} dispatch={dispatch} />

      <div className="panel-scrollable">
        <LayerList
          layers={state.layers}
          activeLayerId={state.activeLayerId}
          dispatch={dispatch}
        />
        <SpeciesList
          species={state.species}
          activeSpeciesId={state.activeSpeciesId}
          resetSpeciesIds={state.resetSpeciesIds}
          dispatch={dispatch}
        />
        <RuleList
          activeLayer={activeLayer}
          species={state.species}
          layers={state.layers}
          dispatch={dispatch}
        />
      </div>

      <SimControls
        running={state.running}
        dispatch={dispatch}
        onStep={onStep}
      />
    </aside>
  )
}
