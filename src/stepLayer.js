import { parseRule } from './parseRule'

function countNeighbors(x, y, speciesId, cells) {
  let n = 0
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue
      if (cells[`${x + dx},${y + dy}`] === speciesId) n++
    }
  }
  return n
}

function compare(actual, op, target) {
  switch (op) {
    case '>':  return actual > target
    case '<':  return actual < target
    case '=':  return actual === target
    case '>=': return actual >= target
    case '<=': return actual <= target
    default:   return false
  }
}

// Returns the new cells object for layer after applying its rules once.
// allLayers is the CURRENT (pre-step) state of all layers, used for
// cross-layer conditions; this ensures all layers step simultaneously.
export function stepLayer(layer, allLayers, species) {
  const { cells, rules = [] } = layer
  if (rules.length === 0) return cells

  // Parse and keep only valid rules
  const parsed = rules.flatMap(r => {
    const p = parseRule(r.raw, species, allLayers)
    return p.ok ? [p] : []
  })
  if (parsed.length === 0) return cells

  const next = { ...cells }

  for (const [key, spId] of Object.entries(cells)) {
    const comma = key.indexOf(',')
    const x = parseInt(key.slice(0, comma), 10)
    const y = parseInt(key.slice(comma + 1), 10)

    for (const rule of parsed) {
      if (rule.subjectId !== spId) continue

      // Check every condition against the pre-step state
      let pass = true
      for (const cond of rule.conditions) {
        if (cond.type === 'neighbor') {
          const n = countNeighbors(x, y, cond.speciesId, cells)
          if (!compare(n, cond.comparator, cond.count)) { pass = false; break }
        } else if (cond.type === 'layer') {
          const tl = allLayers.find(l => l.id === cond.layerId)
          if (!tl || tl.cells[key] !== cond.speciesId) { pass = false; break }
        }
      }

      if (!pass) continue
      if (Math.random() > rule.probability) continue

      // Apply transformation; first matching rule wins
      next[key] = rule.resultId
      break
    }
  }

  return next
}
