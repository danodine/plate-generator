import React, { useState } from 'react'
import { usePlatesStore } from '../store/usePlatesStore'

function NumberInput({ value, onChange, min, max, label }) {
  const [local, setLocal] = useState(String(value))
  return (
    <div className="col" style={{ width: 120 }}>
      <label className="hint">{label}</label>
      <input
        className="input"
        inputMode="decimal"
        value={local}
        onChange={(e) => setLocal(e.target.value.replace(',', '.'))}
        onBlur={() => {
          const v = parseFloat(local)
          const clamped = isFinite(v) ? Math.min(max, Math.max(min, Math.round(v * 10) / 10)) : value
          setLocal(String(clamped))
          onChange(clamped)
        }}
      />
      <div className="hint">{min}–{max} cm</div>
    </div>
  )
}

function PlateRow({ plate, idx, total }) {
  const updatePlate = usePlatesStore(s => s.updatePlate)
  const movePlate = usePlatesStore(s => s.movePlate)
  return (
    <div className="panel" style={{ padding: 10, marginBottom: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>Plate {idx + 1}</strong>
        <div className="row">
          <button className="btn ghost" disabled={idx===0} onClick={() => movePlate(idx, idx-1)}>◀</button>
          <button className="btn ghost" disabled={idx===total-1} onClick={() => movePlate(idx, idx+1)}>▶</button>
        </div>
      </div>
      <div className="row" style={{ gap: 16, marginTop: 8 }}>
        <NumberInput label="Width" value={plate.widthCm} min={20} max={300} onChange={(v)=>updatePlate(plate.id, { widthCm: v })} />
        <NumberInput label="Height" value={plate.heightCm} min={30} max={120} onChange={(v)=>updatePlate(plate.id, { heightCm: v })} />
      </div>
    </div>
  )
}

export default function ControlsPanel() {
  const { plates, addPlate, removeLast, duplicateLast, motifUrl, setMotifUrl } = usePlatesStore()
  const [url, setUrl] = useState(motifUrl)

  return (
    <div className="panel">
      <h2>Controls</h2>
      <div className="col" style={{ gap: 12 }}>
        <div className="col">
          <label className="hint">Motif Image URL</label>
          <input className="input full" value={url} onChange={(e)=>setUrl(e.target.value)} onBlur={()=>setMotifUrl(url)} placeholder="https://..." />
          <div className="hint">Tip: Use a high-res, wide image; mirroring is auto-applied if needed.</div>
        </div>

        <div className="separator"></div>

        {plates.map((p, i) => (
          <PlateRow key={p.id} plate={p} idx={i} total={plates.length} />
        ))}

        <div className="toolbar">
          <button className="btn primary" onClick={()=>addPlate()}>+ Add plate</button>
          <button className="btn" onClick={()=>duplicateLast()}>⧉ Duplicate last</button>
          <button className="btn danger" onClick={()=>removeLast()} disabled={plates.length<=1}>− Remove last</button>
        </div>

        <div className="hint">Between 1 and 10 plates are allowed. Inputs accept decimals with . or ,</div>
      </div>
    </div>
  )
}
