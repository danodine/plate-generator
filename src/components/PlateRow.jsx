import React from "react";
import { usePlatesStore } from "../store/usePlatesStore";
import NumberInput from "./NumberInput";
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
export default function PlateRow({ plate, idx, total, dnd, canDelete }) {
  const updatePlate = usePlatesStore((s) => s.updatePlate);
  const movePlate = usePlatesStore((s) => s.movePlate);
  const removeById = usePlatesStore((s) => s.removeById);

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
      </div>

      {/* Inputs */}
      <div className="dims-row">
        <span className="badge">{idx + 1}</span>
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
    </div>
  );
}
