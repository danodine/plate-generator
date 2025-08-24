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

import React, { useState } from "react";
import { usePlatesStore } from "../store/usePlatesStore";
import PlateRow from "./PlateRow";
import { useDnD } from "../hooks/useDnD";
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
  } = usePlatesStore();

  const [url, setUrl] = useState(motifUrl);
  const canDelete = plates.length > 1;
  const dnd = useDnD(movePlate);

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
            aria-selected={unit === "cm"}
            className={`seg-btn ${unit === "cm" ? "active" : ""}`}
            onClick={() => setUnit("cm")}
          >
            cm
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={unit === "in"}
            className={`seg-btn ${unit === "in" ? "active" : ""}`}
            onClick={() => setUnit("in")}
          >
            in
          </button>
        </div>
      </div>

      {/* Motif URL (optional feature) */}
      <div className="url-block">
        <label className="hint" htmlFor="motifUrl">
          Motif Image URL
        </label>
        <input
          id="motifUrl"
          className="input full"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => setMotifUrl(url)}
          placeholder="https://…"
        />
        <div className="hint">
          Tipp: Möglichst breites, hochauflösendes Bild verwenden.
        </div>

        {/* Mirroring toggle (optional extra; spec requires auto-mirroring > 300 cm) */}
        <label
          className="hint"
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 6,
          }}
        >
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
        <button
          type="button"
          className="cta-outline"
          onClick={() => addPlate()}
        >
          Rückenwand hinzufügen +
        </button>
      </div>
    </div>
  );
}
