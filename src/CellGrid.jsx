import { useRef, useEffect, useMemo, useCallback, useState } from 'react'

const BG = '#0b0b16'
const GRID_LINE = '#181828'

export default function CellGrid({ grid, cells, species, hoverFill, onCellInteract }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const lastKey = useRef(null)
  const [hover, setHover] = useState(null)

  const { cols, rows, cellSize } = grid
  const W = cols * cellSize
  const H = rows * cellSize

  const speciesById = useMemo(
    () => Object.fromEntries(species.map(s => [s.id, s])),
    [species]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)

    // Render only the active layer's cells
    for (const [key, spId] of Object.entries(cells)) {
      const sp = speciesById[spId]
      if (!sp) continue
      const comma = key.indexOf(',')
      const cx = parseInt(key.slice(0, comma), 10)
      const cy = parseInt(key.slice(comma + 1), 10)
      ctx.fillStyle = sp.color
      ctx.fillRect(cx * cellSize + 1, cy * cellSize + 1, cellSize - 2, cellSize - 2)
    }

    // Hover preview
    if (hover && hoverFill) {
      ctx.fillStyle = hoverFill
      ctx.fillRect(hover.x * cellSize + 1, hover.y * cellSize + 1, cellSize - 2, cellSize - 2)
    }

    // Grid lines
    ctx.strokeStyle = GRID_LINE
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= cols; x++) {
      ctx.moveTo(x * cellSize + 0.5, 0)
      ctx.lineTo(x * cellSize + 0.5, H)
    }
    for (let y = 0; y <= rows; y++) {
      ctx.moveTo(0, y * cellSize + 0.5)
      ctx.lineTo(W, y * cellSize + 0.5)
    }
    ctx.stroke()
  }, [cells, speciesById, grid, hover, hoverFill, W, H, cellSize, cols, rows])

  const getCell = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / cellSize)
    const y = Math.floor((e.clientY - rect.top) / cellSize)
    if (x < 0 || x >= cols || y < 0 || y >= rows) return null
    return { x, y }
  }, [cellSize, cols, rows])

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    drawing.current = true
    lastKey.current = null
    const cell = getCell(e)
    if (!cell) return
    const key = `${cell.x},${cell.y}`
    lastKey.current = key
    onCellInteract(cell.x, cell.y, e.button === 2)
  }, [getCell, onCellInteract])

  const handleMouseMove = useCallback((e) => {
    const cell = getCell(e)
    setHover(cell)
    if (!drawing.current || !cell) return
    const key = `${cell.x},${cell.y}`
    if (key === lastKey.current) return
    lastKey.current = key
    onCellInteract(cell.x, cell.y, e.buttons === 2)
  }, [getCell, onCellInteract])

  const stopDrawing = useCallback(() => {
    drawing.current = false
    lastKey.current = null
  }, [])

  return (
    <div className="grid-wrapper">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="grid-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={() => { stopDrawing(); setHover(null) }}
        onContextMenu={e => e.preventDefault()}
      />
    </div>
  )
}
