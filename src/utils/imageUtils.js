export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.onerror = (e) => reject(new Error (`Failed to load image: ${url} ${e.message}`))
    img.src = url
  })
}

export function computeCover(imgW, imgH, canvasW, canvasH) {
  const scale = Math.max(canvasW / imgW, canvasH / imgH)
  const scaledW = imgW * scale
  const scaledH = imgH * scale
  const offsetX = (scaledW - canvasW) / 2
  const offsetY = (scaledH - canvasH) / 2
  return { scaledW, scaledH, offsetX, offsetY, scale }
}

// Mirror-extend image horizontally to reach a target width; returns data URL.
export function mirrorExtendHorizontal(img, targetWidth, maxWidth = 8192) {
  const unit = img.width
  const layers = Math.min(Math.ceil(targetWidth / unit), Math.floor(maxWidth / unit))
  const width = Math.max(unit, layers * unit)
  const height = img.height
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  for (let i = 0; i < layers; i++) {
    const x = i * unit
    if (i % 2 === 0) {
      ctx.drawImage(img, x, 0, unit, height)
    } else {
      ctx.save()
      ctx.translate(x + unit, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(img, 0, 0, unit, height)
      ctx.restore()
    }
  }
  return canvas.toDataURL('image/jpeg', 0.92)
}
