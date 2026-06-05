export function saveToFile(state) {
  const data = {
    version: 1,
    grid: state.grid,
    species: state.species,
    layers: state.layers,
    activeLayerId: state.activeLayerId,
    activeSpeciesId: state.activeSpeciesId,
    resetSpeciesIds: state.resetSpeciesIds,
  }
  const name = window.prompt('Save as:', 'cellblock')
  if (name === null) return
  const filename = name.trim() || 'cellblock'
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function loadFromFile(onLoad) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.species?.length || !data.layers?.length || !data.grid) {
          alert('Invalid Cellblock file.')
          return
        }
        onLoad(data)
      } catch {
        alert('Could not parse file.')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}
