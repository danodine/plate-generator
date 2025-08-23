import React, { useEffect, useMemo, useRef, useState } from 'react'
import { computeCover, loadImage, mirrorExtendHorizontal } from '../utils/imageUtils'

function useElementSize() {
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const cr = e.contentRect
        setSize({ width: cr.width, height: cr.height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, size }
}

export default function CanvasPreview({ plates, motifUrl }) {
  const { ref, size } = useElementSize()
  const [imgInfo, setImgInfo] = useState(null)

  const virtual = useMemo(() => {
    const totalW = plates.reduce((acc, p) => acc + p.widthCm, 0)
    const maxH = plates.reduce((m, p) => Math.max(m, p.heightCm), 0)
    return { totalW, maxH }
  }, [plates])

  // Load and possibly mirror-extend the image to fit wide panoramas
  useEffect(() => {
    let isMounted = true
    async function run() {
      try {
        const img = await loadImage(motifUrl)
        const virtualAspect = virtual.totalW / Math.max(1, virtual.maxH)
        const imgAspect = img.width / img.height
        if (virtualAspect > imgAspect * 1.2) {
          const neededWidth = Math.min(Math.ceil(img.height * virtualAspect), 8192)
          const dataUrl = mirrorExtendHorizontal(img, neededWidth)
          if (!isMounted) return
          const extended = await loadImage(dataUrl)
          if (!isMounted) return
          setImgInfo({ url: dataUrl, w: extended.width, h: extended.height })
        } else {
          if (!isMounted) return
          setImgInfo({ url: motifUrl, w: img.width, h: img.height })
        }
      } catch (e) {
        console.error('Failed to load motif', e)
        setImgInfo(null)
      }
    }
    run()
    return () => { isMounted = false }
  }, [motifUrl, virtual.totalW, virtual.maxH])

  const preview = useMemo(() => {
    const pad = 12
    const availW = Math.max(0, size.width - pad * 2)
    const availH = Math.max(0, size.height - pad * 2)
    const s = Math.min(
      availW / Math.max(1, virtual.totalW),
      availH / Math.max(1, virtual.maxH)
    )
    return { scale: isFinite(s) ? s : 1 }
  }, [size, virtual])

  const offsets = useMemo(() => {
    let x = 0
    return plates.map(p => {
      const off = { x0: x, y0: virtual.maxH - p.heightCm }
      x += p.widthCm
      return off
    })
  }, [plates, virtual.maxH])

  const bg = useMemo(() => {
    if (!imgInfo) return null
    const cover = computeCover(imgInfo.w, imgInfo.h, virtual.totalW, virtual.maxH)
    const scalePx = preview.scale
    return {
      sizeW: cover.scaledW * scalePx,
      sizeH: cover.scaledH * scalePx,
      posX: (xCm) => -(xCm - cover.offsetX) * scalePx,
      posY: (yCm) => -(yCm - cover.offsetY) * scalePx,
      url: imgInfo.url,
    }
  }, [imgInfo, virtual.totalW, virtual.maxH, preview.scale])

  return (
    <div className="canvas-wrap panel">
      <h2>Visual Preview</h2>
      <div className="canvas" ref={ref}>
        <div
          className="canvas-inner"
          style={{ width: virtual.totalW * preview.scale, height: virtual.maxH * preview.scale }}
        >
          {bg && plates.map((p, idx) => {
            const off = offsets[idx]
            const width = p.widthCm * preview.scale
            const height = p.heightCm * preview.scale
            return (
              <div
                key={p.id}
                className="plate"
                style={{
                  left: off.x0 * preview.scale,
                  width,
                  height,
                }}
              >
                <div className="legend">{p.widthCm}×{p.heightCm} cm</div>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${bg.url})`,
                    backgroundSize: `${bg.sizeW}px ${bg.sizeH}px`,
                    backgroundPosition: `${bg.posX(off.x0)}px ${bg.posY(off.y0)}px`,
                    backgroundRepeat: 'no-repeat'
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
      <div className="hint">Scale auto-fit (1 cm → preview px)</div>
    </div>
  )
}
