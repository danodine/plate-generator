/**
 * usePlatesStore.js
 *
 * Centralized app state using Zustand (+ persist) for the plate generator.
 *
 * Responsibilities:
 * - Store and persist the list of plates (width/height in cm).
 * - Keep the current motif image URL.
 * - Handle required plate operations: add, remove (except last), update, reorder.
 * - Provide unit conversion helpers (cm <-> in) for the UI.
 * - (Optional) mirrorEnabled flag to allow a UI toggle; spec requires automatic mirroring > 300 cm.
 *
 * Persistence:
 * - Stored in localStorage under key: "plate-generator".
 *
 * Notes:
 * - All dimensions are stored internally in centimeters (cm) as the source of truth.
 * - Validation ranges are enforced on "add" and in the consuming inputs on edit.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Clamp a numeric value into [min, max]. */
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/**
 * Simple UUID helper.
 * Uses crypto.randomUUID if available; falls back to time + random for older browsers.
 */
const uuid = () =>
  (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))

/** Constant for cm <-> inches conversion. */
const CM_PER_IN = 2.54

/**
 * Initial/default plate set.
 * Note: This array (and its first plate's id) is created once at module load.
 * If you need a fresh id on every reset, consider using a factory function instead.
 */
const defaultPlates = [{ id: uuid(), widthCm: 120, heightCm: 60 }]

/**
 * Zustand store (with persistence).
 */
export const usePlatesStore = create(
  persist(
    (set, get) => ({
      /**
       * Plates in the current configuration.
       * Each plate: { id: string, widthCm: number, heightCm: number }
       * Constraints (spec): 1–10 plates; widths 20–300 cm; heights 30–128 cm.
       */
      plates: defaultPlates,

      /**
       * The shared motif image URL (can be a remote URL or a Data URL).
       * CORS note: exporting PNG from a tainted canvas will fail for non-CORS images.
       */
      motifUrl:
        'https://rueckwand24.com/cdn/shop/files/Kuechenrueckwand-Kuechenrueckwand-Gruene-frische-Kraeuter-KR-000018-HB.jpg?v=1695288356&width=1200',

      /** Update motif URL (keeps the previous value if an empty/falsey value is passed). */
      setMotifUrl: (url) => set({ motifUrl: url || get().motifUrl }),

      /**
       * Optional: toggle for mirroring (UI extra).
       * The spec requires automatic mirroring when total width > 300 cm; this flag
       * can allow users to disable/enable it, if you choose to expose it in the UI.
       */
      mirrorEnabled: false,
      setMirrorEnabled: (v) => set({ mirrorEnabled: !!v }),

      /**
       * Active unit for UI ("cm" | "in"). Internally I always store cm.
       * Use cmToUnit / unitToCm helpers to convert for display and input.
       */
      unit: 'cm',
      setUnit: (u) => set({ unit: u === 'in' ? 'in' : 'cm' }),

      /** Convert a cm value to the active unit. */
      cmToUnit: (cm) => (get().unit === 'in' ? cm / CM_PER_IN : cm),

      /** Convert a value in the active unit back to cm. */
      unitToCm: (val) => (get().unit === 'in' ? val * CM_PER_IN : val),

      /**
       * Add a new plate (appends to the end).
       * - Enforces 10-plate maximum.
       * - Applies clamping to width/height (and rounds to 0.1 cm).
       */
      addPlate: (plate = {}) =>
        set((state) => {
          if (state.plates.length >= 10) return state
          const p = {
            id: uuid(),
            widthCm: clamp(Math.round((plate.widthCm ?? 100) * 10) / 10, 20, 300),
            heightCm: clamp(Math.round((plate.heightCm ?? 60) * 10) / 10, 30, 128),
          }
          return { plates: [...state.plates, p] }
        }),

      /**
       * Remove a plate by id.
       * - Guard: keep at least one plate in the layout (spec).
       */
      removeById: (id) =>
        set((state) => {
          if (state.plates.length <= 1) return state
          const next = state.plates.filter((p) => p.id !== id)
          return next.length ? { plates: next } : state
        }),

      /**
       * Update a plate by id with a partial patch (e.g., { widthCm } or { heightCm }).
       * - Does not clamp here; consumers (inputs) should validate before calling.
       */
      updatePlate: (id, patch) =>
        set((state) => ({
          plates: state.plates.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      /**
       * Reorder plates: move an item from index `from` to index `to`.
       * - Used by both DnD and arrow buttons in the UI.
       */
      movePlate: (from, to) =>
        set((state) => {
          const arr = state.plates.slice()
          if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return state
          const [item] = arr.splice(from, 1)
          arr.splice(to, 0, item)
          return { plates: arr }
        }),

      /**
       * Reset to defaults.
       * Note: returns the same array reference defined at module scope.
       * If you want a fresh id on reset, replace with a factory (e.g., [{ id: uuid(), ... }]).
       */
      reset: () => ({ plates: defaultPlates }),
    }),
    {
      name: 'plate-generator', // localStorage key
      // You can add versioning/migrations here if the schema evolves:
      // version: 1,
      // migrate: (persistedState, version) => persistedState,
    }
  )
)
