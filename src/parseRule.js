// Parse a rule string like:
//   "TREE + >1FIRE -> FIRE * 0.5"
//   "TREE + LIGHTNING:STRIKE -> FIRE * 1"
//   "FIRE -> EMPTY * 0.1"
//
// species: [{ id, name }]
// layers:  [{ id, name }]
// Returns: { ok, subjectId, conditions, resultId, probability } | { ok: false, error }

function findSpecies(name, species) {
  return species.find(s => s.name.toLowerCase() === name.trim().toLowerCase()) ?? null
}

function findLayer(name, layers) {
  return layers.find(l => l.name.toLowerCase() === name.trim().toLowerCase()) ?? null
}

function parseCondition(part, species, layers) {
  part = part.trim()
  if (!part) return { ok: false, error: 'Empty condition' }

  // Layer condition — contains ':'
  const colonIdx = part.indexOf(':')
  if (colonIdx !== -1) {
    const layerName = part.slice(0, colonIdx).trim()
    const speciesName = part.slice(colonIdx + 1).trim()
    const layer = findLayer(layerName, layers)
    if (!layer) return { ok: false, error: `Unknown layer "${layerName}"` }
    const sp = findSpecies(speciesName, species)
    if (!sp) return { ok: false, error: `Unknown species "${speciesName}"` }
    return { ok: true, type: 'layer', layerId: layer.id, speciesId: sp.id }
  }

  // Neighbor condition — optional comparator + optional count + species name
  // Examples: ">1FIRE"  "=0FIRE"  ">=2ALIVE"  "FIRE" (defaults to >=1)
  let rest = part
  let comparator = '>='
  let count = 1

  const compM = rest.match(/^(>=|<=|>|<|=)/)
  if (compM) {
    comparator = compM[1]
    rest = rest.slice(compM[1].length).trimStart()
  }

  const numM = rest.match(/^(\d+)/)
  if (numM) {
    count = parseInt(numM[1], 10)
    rest = rest.slice(numM[1].length).trimStart()
    // A bare number with no comparator means exact match
    if (!compM) comparator = '='
  }

  const speciesName = rest.trim()
  if (!speciesName) return { ok: false, error: 'Missing species name in condition' }
  const sp = findSpecies(speciesName, species)
  if (!sp) return { ok: false, error: `Unknown species "${speciesName}"` }

  return { ok: true, type: 'neighbor', comparator, count, speciesId: sp.id }
}

export function parseRule(raw, species, layers) {
  const text = (raw ?? '').trim()
  if (!text) return { ok: false, error: '' }

  const arrowIdx = text.indexOf('->')
  if (arrowIdx === -1) return { ok: false, error: 'Missing ->' }

  const lhs = text.slice(0, arrowIdx).trim()
  const rhs = text.slice(arrowIdx + 2).trim()

  // Right side: RESULT * probability
  const starIdx = rhs.lastIndexOf('*')
  if (starIdx === -1) return { ok: false, error: 'Right side must be: SPECIES * probability' }

  const resultName = rhs.slice(0, starIdx).trim()
  const probStr = rhs.slice(starIdx + 1).trim()
  const probability = parseFloat(probStr)
  if (isNaN(probability) || probability < 0 || probability > 1) {
    return { ok: false, error: 'Probability must be a number 0–1' }
  }

  if (resultName.toUpperCase() === 'EMPTY') {
    return { ok: false, error: 'EMPTY is not a valid result — every cell must have a species' }
  }
  const resultSpecies = findSpecies(resultName, species)
  if (!resultSpecies) return { ok: false, error: `Unknown result species "${resultName}"` }
  const resultId = resultSpecies.id

  // Left side: SUBJECT (+ CONDITION)*
  const parts = lhs.split('+').map(s => s.trim())
  if (!parts[0]) return { ok: false, error: 'Missing subject species' }

  const subject = findSpecies(parts[0], species)
  if (!subject) return { ok: false, error: `Unknown subject "${parts[0]}"` }

  const conditions = []
  for (const part of parts.slice(1)) {
    const cond = parseCondition(part, species, layers)
    if (!cond.ok) return { ok: false, error: cond.error }
    conditions.push(cond)
  }

  return { ok: true, subjectId: subject.id, conditions, resultId, probability }
}
