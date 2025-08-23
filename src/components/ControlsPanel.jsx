import React, { useRef, useState } from 'react'
import { usePlatesStore } from '../store/usePlatesStore'

function useDnD(onMove) {
  const dragIndex = useRef(null)
  const handleDragStart = (i) => (e) => {
    dragIndex.current = i
    e.dataTransfer.effectAllowed = 'move'
    const img = new Image(); img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
    e.dataTransfer.setDragImage(img, 0, 0)
  }
  const handleDragOver = () => (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const handleDrop = (i) => (e) => {
    e.preventDefault()
    const from = dragIndex.current
    const to = i
    if (Number.isInteger(from) && Number.isInteger(to) && from !== to) onMove(from, to)
    dragIndex.current = null
  }
  const handleDragEnd = () => { dragIndex.current = null }
  return { handleDragStart, handleDragOver, handleDrop, handleDragEnd }
}

function NumberInput({ valueCm, onChangeCm, minCm, maxCm, label }) {
  const unit      = usePlatesStore(s => s.unit)
  const cmToUnit  = usePlatesStore(s => s.cmToUnit)
  const unitToCm  = usePlatesStore(s => s.unitToCm)

  const displayValue = React.useMemo(() => {
    const u = cmToUnit(valueCm)
    return String(Math.round(u * 10) / 10)
  }, [valueCm, unit])

  const [local, setLocal] = React.useState(displayValue)
  const prevValid = React.useRef(displayValue)

  React.useEffect(() => {
    setLocal(displayValue)
    prevValid.current = displayValue
  }, [displayValue])

  const parse = (s) => {
    const v = parseFloat((s ?? '').toString().replace(',', '.'))
    return Number.isFinite(v) ? v : NaN
  }

  const v    = parse(local)
  const minU = cmToUnit(minCm)
  const maxU = cmToUnit(maxCm)
  const invalid = !(Number.isFinite(v) && v >= minU && v <= maxU)

  const mm = Math.round(valueCm * 10)

  const commit = () => {
    if (invalid) { setLocal(prevValid.current); return }
    const roundedU = Math.round(v * 10) / 10
    const cm = unitToCm(roundedU)
    const clampedCm = Math.min(maxCm, Math.max(minCm, Math.round(cm * 10) / 10))
    onChangeCm(clampedCm)
    const asU = Math.round(cmToUnit(clampedCm) * 10) / 10
    prevValid.current = String(asU)
    setLocal(String(asU))
  }

  return (
    <div className="dim-col">
      <div className="dim-label">
        <span>{label}</span>
        <span className="dim-range">
          {Math.round(minU*10)/10}–{Math.round(maxU*10)/10} {unit}
        </span>
      </div>

      <div className="big-input-wrap">
        <input
          className={`big-input${invalid ? ' error' : ''}`}
          inputMode="decimal"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
        />
        <span className="unit-pill">{unit}</span>
      </div>

      {invalid
        ? <div className="error-msg">Bitte {Math.round(minU*10)/10}–{Math.round(maxU*10)/10} {unit} eingeben.</div>
        : (unit === 'cm' ? <div className="mm-hint">{mm} mm</div>
                          : <div className="mm-hint">≈ {Math.round(valueCm*10)/10} cm</div>)
      }
    </div>
  )
}


function PlateRow({ plate, idx, total, dnd, canDelete }) {
  const updatePlate = usePlatesStore((s) => s.updatePlate)
  const movePlate   = usePlatesStore((s) => s.movePlate)
  const removeById  = usePlatesStore((s) => s.removeById)

  return (
    <div
      className="plate-card fade-in"
      draggable
      onDragStart={dnd.handleDragStart(idx)}
      onDragOver={dnd.handleDragOver(idx)}
      onDrop={dnd.handleDrop(idx)}
      onDragEnd={dnd.handleDragEnd}
      aria-grabbed="true"
    >
      {/* Header (badge + optional arrows + delete) */}
      <div className="plate-card-head">
        <span className="badge">{idx + 1}</span>
        <div className="head-spacer" />
        {/* keep arrows if you want; DnD also works */}
        <button className="ghost-nav" disabled={idx === 0} onClick={() => movePlate(idx, idx - 1)}>◀</button>
        <button className="ghost-nav" disabled={idx === total - 1} onClick={() => movePlate(idx, idx + 1)}>▶</button>
        <button className="del-pill" disabled={!canDelete} onClick={() => removeById(plate.id)}>−</button>
      </div>

      {/* Inputs */}
      <div className="dims-row">
        <NumberInput
          label="Breite"
          valueCm={plate.widthCm}
          minCm={20}
          maxCm={300}
          onChangeCm={(cm) => updatePlate(plate.id, { widthCm: cm })}
        />
        <div className="times">×</div>
        <NumberInput
          label="Höhe"
          valueCm={plate.heightCm}
          minCm={30}
          maxCm={128}
          onChangeCm={(cm) => updatePlate(plate.id, { heightCm: cm })}
        />
      </div>
    </div>
  )
}

export default function ControlsPanel() {
  const { plates, addPlate, motifUrl, setMotifUrl, mirrorEnabled, setMirrorEnabled, unit, setUnit, movePlate } = usePlatesStore()
  const [url, setUrl] = useState(motifUrl)
  const canDelete = plates.length > 1
  const dnd = useDnD(movePlate)

  return (
    <div className="panel controls-root">
      <h2 className="headline">Maße. Eingeben.</h2>

      <div className="unit-row">
        <span className="hint">Einheiten</span>
        <div className="seg">
          <button className={`seg-btn ${unit==='cm'?'active':''}`} onClick={()=>setUnit('cm')}>cm</button>
          <button className={`seg-btn ${unit==='in'?'active':''}`} onClick={()=>setUnit('in')}>in</button>
        </div>
      </div>

      <div className="url-block">
        <label className="hint">Motif Image URL</label>
        <input
          className="input full"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setMotifUrl(url)}
          placeholder="https://…"
        />
        <div className="hint">Tipp: Möglichst breites, hochauflösendes Bild verwenden.</div>
        <label className="hint" style={{ display:'flex', gap:8, alignItems:'center', marginTop:6 }}>
          <input type="checkbox" checked={mirrorEnabled} onChange={e => setMirrorEnabled(e.target.checked)} />
          Spiegeln bei sehr breiten Layouts
        </label>
      </div>

      {plates.map((p, i) => (
        <PlateRow key={p.id} plate={p} idx={i} total={plates.length} dnd={dnd} canDelete={canDelete} />
      ))}

      <div className="cta-row">
        <button className="cta-outline" onClick={() => addPlate()}>Rückenwand hinzufügen  +</button>
      </div>
    </div>
  )
}
