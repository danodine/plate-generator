import React from 'react'
import CanvasPreview from './components/CanvasPreview'
import ControlsPanel from './components/ControlsPanel'
import { usePlatesStore } from './store/usePlatesStore'

export default function App() {
  const plates = usePlatesStore(s => s.plates)
  const motif = usePlatesStore(s => s.motifUrl)

  return (
    <div className="container">
      <CanvasPreview plates={plates} motifUrl={motif} />
      <ControlsPanel />
    </div>
  )
}