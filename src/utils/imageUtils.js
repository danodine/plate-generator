/**
 * imageUtils.js
 *
 * Utilities for loading images and computing how to map them into a
 * virtual canvas using a CSS-like “cover” strategy, plus a helper to
 * mirror-extend an image horizontally for ultra-wide layouts.
 *
 * Notes / Best Practices:
 * - CORS: Using `crossOrigin = 'anonymous'` + proper server headers is
 *   required if you plan to read pixels (e.g., `toDataURL`) without
 *   tainting the canvas. Remote images without CORS will break export.
 * - Errors: Don’t assign `onerror` twice. Keep one handler to reject with
 *   a useful error message.
 * - Safety: Guard against zero / invalid dimensions to avoid NaN/Infinity.
 * - Performance: For very large images you may consider `createImageBitmap`
 *   and/or `OffscreenCanvas` when available (not used here to keep it simple).
 */

/**
 * Load an image and resolve with the HTMLImageElement when ready.
 * The returned <img> is safe to draw to canvas if the server provides CORS headers.
 *
 * @param {string} url - Image URL or data URL
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Allow cross-origin drawing if the server sends appropriate headers.
    img.crossOrigin = 'anonymous'
    // Suppress referrer leakage for some CDNs (optional, depends on your needs).
    img.referrerPolicy = 'no-referrer'

    img.onload = () => resolve(img)
    img.onerror = (e) => {
      // Provide a clear error (avoid assigning onerror twice).
      const msg = e?.message || (e?.error && String(e.error)) || 'unknown error'
      reject(new Error(`Failed to load image: ${url} ${msg ? `(${msg})` : ''}`))
    }

    img.src = url
  })
}

/**
 * Compute CSS-like “cover” mapping for an image inside a target canvas.
 * That is, scale the image so it fully covers the canvas, and center-crop.
 *
 * @param {number} imgW - intrinsic image width in px
 * @param {number} imgH - intrinsic image height in px
 * @param {number} canvasW - target canvas width (virtual units, e.g., cm)
 * @param {number} canvasH - target canvas height (virtual units)
 * @returns {{ scaledW:number, scaledH:number, offsetX:number, offsetY:number, scale:number }}
 */
export function computeCover(imgW, imgH, canvasW, canvasH) {
  // Defensive guards to avoid division by zero / NaN
  const iw = Math.max(1, imgW | 0)
  const ih = Math.max(1, imgH | 0)
  const cw = Math.max(1, +canvasW || 0)
  const ch = Math.max(1, +canvasH || 0)

  const scale = Math.max(cw / iw, ch / ih)
  const scaledW = iw * scale
  const scaledH = ih * scale
  // Center the image within the canvas (excess over target becomes offset)
  const offsetX = (scaledW - cw) / 2
  const offsetY = (scaledH - ch) / 2
  return { scaledW, scaledH, offsetX, offsetY, scale }
}

/**
 * Mirror-extend an image horizontally until at least `targetWidth` is reached.
 * The pattern alternates normal and horizontally flipped tiles to create a
 * seamless extension. Returns a JPEG data URL of the extended strip.
 *
 * Caveats:
 * - If the source image is cross-origin without proper CORS headers, the
 *   resulting canvas becomes “tainted” and `toDataURL` may throw.
 * - `maxWidth` caps the resulting bitmap size to avoid memory issues.
 *
 * @param {HTMLImageElement} img - Loaded image element
 * @param {number} targetWidth - Desired minimum output width in px
 * @param {number} [maxWidth=8192] - Safety cap on output width in px
 * @returns {string} dataURL - JPEG data URL of the mirrored strip
 */
export function mirrorExtendHorizontal(img, targetWidth, maxWidth = 8192) {
  // Intrinsic single-tile width (one “unit” we’ll repeat/flip)
  const unit = Math.max(1, img.width | 0)
  const height = Math.max(1, img.height | 0)

  // Number of tiles needed to reach the target width, clamped by maxWidth
  const layers = Math.min(
    Math.max(1, Math.ceil((+targetWidth || 0) / unit)),
    Math.max(1, Math.floor(maxWidth / unit))
  )

  const width = Math.max(unit, layers * unit)

  // Create a scratch canvas; use OffscreenCanvas when you control the environment
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    // Extremely unlikely in modern browsers, but fail fast with a clear message.
    throw new Error('2D canvas context not available')
  }

  // Tile horizontally, flipping every other tile for a mirrored look
  for (let i = 0; i < layers; i++) {
    const x = i * unit
    if (i % 2 === 0) {
      // Even tiles: draw as-is
      ctx.drawImage(img, x, 0, unit, height)
    } else {
      // Odd tiles: mirror horizontally
      ctx.save()
      ctx.translate(x + unit, 0) // move origin to the right edge of this tile
      ctx.scale(-1, 1)           // flip horizontally
      ctx.drawImage(img, 0, 0, unit, height)
      ctx.restore()
    }
  }

  // Quality 0.92 strikes a balance; tweak if you need smaller/bigger output.
  return canvas.toDataURL('image/jpeg', 0.92)
}
