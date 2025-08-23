import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))

const defaultPlates = [
  { id: uuid(), widthCm: 120, heightCm: 60 },
]

export const usePlatesStore = create(persist((set, get) => ({
  plates: defaultPlates,
  motifUrl: 'https://rueckwand24.com/cdn/shop/files/Kuechenrueckwand-Kuechenrueckwand-Gruene-frische-Kraeuter-KR-000018-HB.jpg?v=1695288356&width=1200',
  setMotifUrl: (url) => set({ motifUrl: url || get().motifUrl }),
  addPlate: (plate = {}) => set((state) => {
    if (state.plates.length >= 10) return state
    const p = {
      id: uuid(),
      widthCm: clamp(Math.round((plate.widthCm ?? 100) * 10) / 10, 20, 300),
      heightCm: clamp(Math.round((plate.heightCm ?? 60) * 10) / 10, 30, 120),
    }
    return { plates: [...state.plates, p] }
  }),
  removeLast: () => set((state) => {
    if (state.plates.length <= 1) return state
    return { plates: state.plates.slice(0, -1) }
  }),
  duplicateLast: () => set((state) => {
    if (state.plates.length >= 10) return state
    const last = state.plates[state.plates.length - 1]
    const copy = { ...last, id: uuid() }
    return { plates: [...state.plates, copy] }
  }),
  movePlate: (from, to) => set((state) => {
    const arr = state.plates.slice()
    if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return state
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    return { plates: arr }
  }),
  updatePlate: (id, patch) => set((state) => ({
    plates: state.plates.map(p => p.id === id ? { ...p, ...patch } : p)
  })),
  reset: () => ({ plates: defaultPlates })
}), { name: 'plate-generator' }))
