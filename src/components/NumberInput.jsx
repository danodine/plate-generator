import React, { useRef, useState } from "react";
import { usePlatesStore } from "../store/usePlatesStore";
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
export default function NumberInput({ valueCm, onChangeCm, minCm, maxCm, label }) {
  const unit = usePlatesStore((s) => s.unit);
  const cmToUnit = usePlatesStore((s) => s.cmToUnit);
  const unitToCm = usePlatesStore((s) => s.unitToCm);

  // Convert current cm value to the active unit for display
  const displayValue = React.useMemo(() => {
    const u = cmToUnit(valueCm);
    return String(Math.round(u * 10) / 10);
  }, [valueCm, unit, cmToUnit]);

  const [local, setLocal] = useState(displayValue);
  const prevValid = useRef(displayValue);

  // Reset draft when either the value or the selected unit changes
  React.useEffect(() => {
    setLocal(displayValue);
    prevValid.current = displayValue;
  }, [displayValue]);

  const parse = (s) => {
    const v = parseFloat((s ?? "").toString().replace(",", "."));
    return Number.isFinite(v) ? v : NaN;
  };

  const v = parse(local);
  const minU = cmToUnit(minCm);
  const maxU = cmToUnit(maxCm);
  const invalid = !(Number.isFinite(v) && v >= minU && v <= maxU);

  const mm = Math.round(valueCm * 10);

  const commit = () => {
    if (invalid) {
      // Revert to last valid unit value
      setLocal(prevValid.current);
      return;
    }
    // Round in the active unit, convert back to cm, clamp, then commit
    const roundedU = Math.round(v * 10) / 10;
    const cm = unitToCm(roundedU);
    const clampedCm = Math.min(
      maxCm,
      Math.max(minCm, Math.round(cm * 10) / 10)
    );
    onChangeCm(clampedCm);

    // Update local draft with the normalized unit value
    const asU = Math.round(cmToUnit(clampedCm) * 10) / 10;
    prevValid.current = String(asU);
    setLocal(String(asU));
  };

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
          className={`big-input${invalid ? " error" : ""}`}
          inputMode="decimal"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
        />
        <span className="unit-pill">{unit}</span>
      </div>

      {invalid ? (
        <div className="error-msg">
          Bitte {Math.round(minU * 10) / 10}–{Math.round(maxU * 10) / 10} {unit}{" "}
          eingeben.
        </div>
      ) : unit === "cm" ? (
        <div className="mm-hint">{mm} mm</div>
      ) : (
        <div className="mm-hint">≈ {Math.round(valueCm * 10) / 10} cm</div>
      )}
    </div>
  );
}
