/**
 * ControlsPanel.jsx
 *
 * Purpose:
 * - Right-side control surface for configuring the plate layout.
 * - Provides per-plate dimension inputs (with cm/in toggle), add/remove,
 *   and drag-and-drop reordering (native HTML5 DnD).
 *
 * Best practices used:
 * - Small, focused components (NumberInput, PlateRow).
 * - State source of truth in Zustand store; inputs are controlled.
 * - Unit conversion is handled consistently via store helpers.
 * - DnD implemented with stable handlers and minimal side effects.
 * - Accessibility: aria labels/titles on icon-only buttons.
 */

import React, { useRef, useState } from 'react'
import { usePlatesStore } from '../store/usePlatesStore'

/**
 * useDnD
 * Native HTML5 drag & drop helpers for reordering.
 *
 * onMove(fromIndex: number, toIndex: number): void
 *
 * Notes:
 * - I use a 1x1 transparent drag image to avoid a large snapshot of the card.
 * - I keep the function signatures symmetrical (handleDragOver takes the index
 *   too) even if I don’t need it — simplifies usage where I always pass `idx`.
 */
function useDnD(onMove) {
  const dragIndex = useRef(null)

  const handleDragStart = (i) => (e) => {
    dragIndex.current = i
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      const img = new Image()
      img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
      e.dataTransfer.setDragImage(img, 0, 0)
    }
  }

  // `_i` kept for signature symmetry; currently not used.
  const handleDragOver = (_i) => (e) => {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (i) => (e) => {
    e.preventDefault()
    const from = dragIndex.current
    const to = i
    if (Number.isInteger(from) && Number.isInteger(to) && from !== to) {
      onMove(from, to)
    }
    dragIndex.current = null
  }

  const handleDragEnd = () => {
    dragIndex.current = null
  }

  return { handleDragStart, handleDragOver, handleDrop, handleDragEnd }
}

/**
 * NumberInput
 * A unit-aware numeric input.
 *
 * Props:
 * - valueCm (number): current value in centimeters (source of truth)
 * - onChangeCm (fn): callback with the next value in centimeters
 * - minCm / maxCm (number): validation bounds in centimeters
 * - label (string)
 *
 * Behavior:
 * - Displays in the *active unit* (cm or in) from the store.
 * - Accepts "." or "," decimal separators.
 * - Validates against converted bounds; on blur, reverts if invalid,
 *   otherwise rounds to 1 decimal and commits (converted back to cm).
 */
function NumberInput({ valueCm, onChangeCm, minCm, maxCm, label }) {
  const unit     = usePlatesStore((s) => s.unit)
  const cmToUnit = usePlatesStore((s) => s.cmToUnit)
  const unitToCm = usePlatesStore((s) => s.unitToCm)

  // Convert current cm value to the active unit for display
  const displayValue = React.useMemo(() => {
    const u = cmToUnit(valueCm)
    return String(Math.round(u * 10) / 10)
  }, [valueCm, unit, cmToUnit])

  const [local, setLocal] = useState(displayValue)
  const prevValid = useRef(displayValue)

  // Reset draft when either the value or the selected unit changes
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
    if (invalid) {
      // Revert to last valid unit value
      setLocal(prevValid.current)
      return
    }
    // Round in the active unit, convert back to cm, clamp, then commit
    const roundedU = Math.round(v * 10) / 10
    const cm = unitToCm(roundedU)
    const clampedCm = Math.min(maxCm, Math.max(minCm, Math.round(cm * 10) / 10))
    onChangeCm(clampedCm)

    // Update local draft with the normalized unit value
    const asU = Math.round(cmToUnit(clampedCm) * 10) / 10
    prevValid.current = String(asU)
    setLocal(String(asU))
  }

  return (
    <div className="dim-col">
      <div className="dim-label">
        <span>{label}</span>
        <span className="dim-range">
          {Math.round(minU * 10) / 10}–{Math.round(maxU * 10) / 10} {unit}
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

      {invalid ? (
        <div className="error-msg">
          Bitte {Math.round(minU * 10) / 10}–{Math.round(maxU * 10) / 10} {unit} eingeben.
        </div>
      ) : unit === 'cm' ? (
        <div className="mm-hint">{mm} mm</div>
      ) : (
        <div className="mm-hint">≈ {Math.round(valueCm * 10) / 10} cm</div>
      )}
    </div>
  )
}

/**
 * PlateRow
 * One card for a single plate with header controls and two inputs (W × H).
 *
 * Props:
 * - plate: { id, widthCm, heightCm }
 * - idx: index of the plate in the list
 * - total: total plate count (used to disable delete when 1)
 * - dnd: object with DnD handlers from useDnD
 * - canDelete: boolean to enable/disable the delete button
 */
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
      aria-label={`Platte ${idx + 1} verschiebbar`}
    >
      {/* Header (badge + optional arrows + delete) */}
      <div className="plate-card-head">
        <span className="badge">{idx + 1}</span>
        <div className="head-spacer" />
        {/* Arrow fallback in addition to DnD (optional) */}
        <button
          type="button"
          className="ghost-nav"
          disabled={idx === 0}
          onClick={() => movePlate(idx, idx - 1)}
          aria-label="Nach links verschieben"
          title="Nach links verschieben"
        >
          ◀
        </button>
        <button
          type="button"
          className="ghost-nav"
          disabled={idx === total - 1}
          onClick={() => movePlate(idx, idx + 1)}
          aria-label="Nach rechts verschieben"
          title="Nach rechts verschieben"
        >
          ▶
        </button>
        <button
          type="button"
          className="del-pill"
          disabled={!canDelete}
          onClick={() => removeById(plate.id)}
          aria-label="Platte entfernen"
          title="Platte entfernen"
        >
          −
        </button>
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

/**
 * ControlsPanel
 * Top-level panel aggregating units toggle, motif URL, and the plate list.
 */
export default function ControlsPanel() {
  const {
    plates,
    addPlate,
    motifUrl,
    setMotifUrl,
    mirrorEnabled,
    setMirrorEnabled,
    unit,
    setUnit,
    movePlate,
  } = usePlatesStore()

  const [url, setUrl] = useState(motifUrl)
  const canDelete = plates.length > 1
  const dnd = useDnD(movePlate)

  return (
    <div className="panel controls-root">
      <h2 className="headline">Maße. Eingeben.</h2>

      {/* Units toggle (cm / in). Model remains in cm; inputs convert live. */}
      <div className="unit-row">
        <span className="hint">Einheiten</span>
        <div className="seg" role="tablist" aria-label="Einheiten">
          <button
            type="button"
            role="tab"
            aria-selected={unit === 'cm'}
            className={`seg-btn ${unit === 'cm' ? 'active' : ''}`}
            onClick={() => setUnit('cm')}
          >
            cm
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={unit === 'in'}
            className={`seg-btn ${unit === 'in' ? 'active' : ''}`}
            onClick={() => setUnit('in')}
          >
            in
          </button>
        </div>
      </div>

      {/* Motif URL (optional feature) */}
      <div className="url-block">
        <label className="hint" htmlFor="motifUrl">Motif Image URL</label>
        <input
          id="motifUrl"
          className="input full"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setMotifUrl(url)}
          placeholder="https://…"
        />
        <div className="hint">Tipp: Möglichst breites, hochauflösendes Bild verwenden.</div>

        {/* Mirroring toggle (optional extra; spec requires auto-mirroring > 300 cm) */}
        <label className="hint" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
          <input
            type="checkbox"
            checked={mirrorEnabled}
            onChange={(e) => setMirrorEnabled(e.target.checked)}
          />
          Spiegeln bei sehr breiten Layouts
        </label>
      </div>

      {/* Plate list */}
      {plates.map((p, i) => (
        <PlateRow
          key={p.id}
          plate={p}
          idx={i}
          total={plates.length}
          dnd={dnd}
          canDelete={canDelete}
        />
      ))}

      {/* Add plate CTA. Store enforces the 10-plate limit. */}
      <div className="cta-row">
        <button type="button" className="cta-outline" onClick={() => addPlate()}>
          Rückenwand hinzufügen  +
        </button>
      </div>
    </div>
  )
}
