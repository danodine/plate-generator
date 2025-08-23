import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))
const CM_PER_IN = 2.54

const defaultPlates = [{ id: uuid(), widthCm: 120, heightCm: 60 }]

export const usePlatesStore = create(
  persist(
    (set, get) => ({
      plates: defaultPlates,

      motifUrl:
        'https://rueckwand24.com/cdn/shop/files/Kuechenrueckwand-Kuechenrueckwand-Gruene-frische-Kraeuter-KR-000018-HB.jpg?v=1695288356&width=1200',
      setMotifUrl: (url) => set({ motifUrl: url || get().motifUrl }),

      mirrorEnabled: false,
      setMirrorEnabled: (v) => set({ mirrorEnabled: !!v }),

      unit: 'cm',
      setUnit: (u) => set({ unit: u === 'in' ? 'in' : 'cm' }),
      cmToUnit: (cm) => (get().unit === 'in' ? cm / CM_PER_IN : cm),
      unitToCm: (val) => (get().unit === 'in' ? val * CM_PER_IN : val),

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

      removeById: (id) =>
        set((state) => {
          if (state.plates.length <= 1) return state
          const next = state.plates.filter((p) => p.id !== id)
          return next.length ? { plates: next } : state
        }),

      updatePlate: (id, patch) =>
        set((state) => ({
          plates: state.plates.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      movePlate: (from, to) =>
        set((state) => {
          const arr = state.plates.slice()
          if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return state
          const [item] = arr.splice(from, 1)
          arr.splice(to, 0, item)
          return { plates: arr }
        }),

      reset: () => ({ plates: defaultPlates }),
    }),
    { name: 'plate-generator' }
  )
)
