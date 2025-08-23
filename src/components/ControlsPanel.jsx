import React, { useState } from 'react'
import { usePlatesStore } from '../store/usePlatesStore'

function NumberInput({ value, onChange, min, max, label, hint }) {
  const [local, setLocal] = useState(String(value))
  const mm = Math.round((parseFloat(local.replace(',', '.')) || value) * 10)

  return (
    <div className="dim-col">
      <div className="dim-label">
        <span>{label}</span>
        <span className="dim-range">{hint}</span>
      </div>

      <div className="big-input-wrap">
        <input
          className="big-input"
          inputMode="decimal"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            const v = parseFloat(local.replace(',', '.'))
            const clamped = isFinite(v) ? Math.min(max, Math.max(min, Math.round(v * 10) / 10)) : value
            setLocal(String(clamped))
            onChange(clamped)
          }}
        />
        <span className="unit-pill">cm</span>
      </div>

      <div className="mm-hint">{mm} mm</div>
    </div>
  )
}

function PlateRow({ plate, idx, total }) {
  const updatePlate   = usePlatesStore((s) => s.updatePlate)
  const movePlate     = usePlatesStore((s) => s.movePlate)
  const removeById    = usePlatesStore((s) => s.removeById)

  return (
    <div className="plate-card">
      <div className="plate-card-head">
        <span className="badge">{idx + 1}</span>
        <div className="head-spacer" />
        <button className="ghost-nav" disabled={idx === 0} onClick={() => movePlate(idx, idx - 1)}>◀</button>
        <button className="ghost-nav" disabled={idx === total - 1} onClick={() => movePlate(idx, idx + 1)}>▶</button>
        <button className="del-pill" disabled={total <= 1} onClick={() => removeById(plate.id)}>−</button>
      </div>

      <div className="dims-row">
        <NumberInput
          label="Breite"
          hint="20 – 300 cm"
          value={plate.widthCm}
          min={20}
          max={300}
          onChange={(v) => updatePlate(plate.id, { widthCm: v })}
        />
        <div className="times">×</div>
        <NumberInput
          label="Höhe"
          hint="30 – 128 cm"
          value={plate.heightCm}
          min={30}
          max={128}
          onChange={(v) => updatePlate(plate.id, { heightCm: v })}
        />
      </div>
    </div>
  )
}

export default function ControlsPanel() {
  const { plates, addPlate, duplicateLast, removeLast, motifUrl, setMotifUrl, mirrorEnabled, setMirrorEnabled } = usePlatesStore()
  const [url, setUrl] = useState(motifUrl)

  return (
    <div className="panel controls-root">
      <h2 className="headline">Maße. Eingeben.</h2>

      {/* keep URL input (optional task) */}
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
        <PlateRow key={p.id} plate={p} idx={i} total={plates.length} />
      ))}

      <div className="cta-row">
        <button className="cta-outline" onClick={() => addPlate()}>Rückenwand hinzufügen  +</button>
      </div>

      <div className="toolbar">
        <button className="btn" onClick={() => duplicateLast()}>⧉ Duplicate last</button>
        <button className="btn danger" onClick={() => removeLast()} disabled={plates.length <= 1}>− Remove last</button>
      </div>
    </div>
  )
}
