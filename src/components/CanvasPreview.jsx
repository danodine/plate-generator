/**
 * CanvasPreview.jsx
 *
 * Purpose:
 * - Renders a realistic visual preview of a multi-plate layout (units in cm),
 *   using a single shared "motif" image mapped across all plates.
 * - Automatically mirror-extends the motif when the total width exceeds 300 cm,
 *   per spec, to preserve visual coverage on very wide panoramas.
 * - Provides an optional PNG export (offscreen canvas).
 *
 * Notes:
 * - CORS: PNG export (toDataURL) requires a CORS-allowed image source.
 *   If not, export will fail — caller is notified via alert.
 * - Performance: mirroring uses an offscreen <canvas> once per change; preview
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  computeCover,
  loadImage,
  mirrorExtendHorizontal,
} from "../utils/imageUtils";

/**
 * useElementSize
 * Observes the size (content box) of a container element so the preview can
 * auto-fit into available space.
 *
 * Returns:
 *  - ref: attach to the element you want to observe
 *  - size: { width, height } in CSS pixels
 *
 * Implementation detail:
 * - ResizeObserver is supported in modern browsers. If supporting very old
 *   browsers, consider a ponyfill or a fallback (window.onresize).
 */
function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setSize({ width: cr.width, height: cr.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, size };
}

/**
 * CanvasPreview
 *
 * Props:
 *  - plates: Array<{ id: string, widthCm: number, heightCm: number }>
 *  - motifUrl: string (URL or DataURL) for the shared motif image
 *
 * Coordinate systems:
 *  - "Virtual space" is measured in centimeters (cm) to match the spec.
 *  - I compute a scale factor to map cm -> screen pixels based on available space.
 */
export default function CanvasPreview({ plates, motifUrl }) {
  const { ref, size } = useElementSize();

  // imgInfo stores the final image that will be painted:
  //  - either the original motif
  //  - or a mirror-extended version (DataURL)
  const [imgInfo, setImgInfo] = useState(null);

  /**
   * Derived virtual canvas dimensions (in cm):
   * - totalW: sum of all plate widths (for the unified background)
   * - maxH:   max of plate heights (all plates sit on the same baseline)
   *
   * Memoized to avoid recalculation on unrelated renders.
   */
  const virtual = useMemo(() => {
    const totalW = plates.reduce((acc, p) => acc + p.widthCm, 0);
    const maxH = plates.reduce((m, p) => Math.max(m, p.heightCm), 0);
    return { totalW, maxH };
  }, [plates]);

  /**
   * Load the motif (or mirror-extended motif) whenever:
   * - motifUrl changes
   * - virtual dimensions change (totalW/maxH affects aspect comparison)
   *
   * Spec rule:
   * - Mirror-extend iff total width > 300 cm
   *
   * Best practices:
   * - Guard against setState after unmount (isMounted flag).
   * - Clamp generated canvas width in mirrorExtendHorizontal (util handles it).
   */
  useEffect(() => {
    let isMounted = true;

    async function run() {
      try {
        const img = await loadImage(motifUrl);

        const shouldMirror = virtual.totalW > 300;

        if (shouldMirror) {
          const neededWidth = Math.min(
            Math.ceil(
              img.height * (virtual.totalW / Math.max(1, virtual.maxH))
            ),
            8192 // safety cap, also enforced in the util
          );

          const dataUrl = mirrorExtendHorizontal(img, neededWidth);
          if (!isMounted) return;

          const extended = await loadImage(dataUrl);
          if (!isMounted) return;

          setImgInfo({ url: dataUrl, w: extended.width, h: extended.height });
        } else {
          if (!isMounted) return;
          setImgInfo({ url: motifUrl, w: img.width, h: img.height });
        }
      } catch (e) {
        console.error("Failed to load motif", e);
        setImgInfo(null);
      }
    }

    run();
    return () => {
      isMounted = false;
    };
  }, [motifUrl, virtual.totalW, virtual.maxH]);

  /**
   * Compute the preview scale (cm -> px) so the whole virtual canvas fits
   * inside the visible "canvas" box with some internal padding.
   */
  const preview = useMemo(() => {
    const pad = 12; // px padding inside the preview frame
    const availW = Math.max(0, size.width - pad * 2);
    const availH = Math.max(0, size.height - pad * 2);
    const s = Math.min(
      availW / Math.max(1, virtual.totalW),
      availH / Math.max(1, virtual.maxH)
    );
    return { scale: isFinite(s) ? s : 1 };
  }, [size, virtual]);

  /**
   * For positioning each plate in the unified virtual canvas:
   * - x0: accumulated width of previous plates
   * - y0: baseline alignment so plate bottoms sit on the same line
   */
  const offsets = useMemo(() => {
    let x = 0;
    return plates.map((p) => {
      const off = { x0: x, y0: virtual.maxH - p.heightCm };
      x += p.widthCm;
      return off;
    });
  }, [plates, virtual.maxH]);

  /**
   * Background mapping parameters for a single "cover" image painted behind all plates.
   * I reuse these with CSS background props on each plate so the image aligns seamlessly.
   *
   * - computeCover gives us the scaled image size and the offsets required to center-crop.
   * - posX/posY convert from cm-space offsets to CSS px-space based on the preview scale.
   */
  const bg = useMemo(() => {
    if (!imgInfo) return null;
    const cover = computeCover(
      imgInfo.w,
      imgInfo.h,
      virtual.totalW,
      virtual.maxH
    );
    const s = preview.scale;
    return {
      sizeW: cover.scaledW * s,
      sizeH: cover.scaledH * s,
      posX: (xCm) => -(xCm + cover.offsetX) * s,
      posY: (yCm) => -(yCm + cover.offsetY) * s,
      url: imgInfo.url,
    };
  }, [imgInfo, virtual.totalW, virtual.maxH, preview.scale]);

  /**
   * Export the current preview as a PNG.
   *
   * Implementation:
   * - Draw the "cover" image once on an offscreen canvas at a fixed px-per-cm.
   * - Then clip each plate to show the correct segment; add shadow + 1px border.
   *
   * Best practices:
   * - Limit canvas dimensions to avoid memory issues (here capped to 8000 px).
   * - Catch CORS-tainted canvas errors and inform the user.
   */
  const handleExport = async () => {
    if (!imgInfo) return;
    try {
      const pxPerCm = 8;

      const W = Math.max(1, Math.round(virtual.totalW * pxPerCm));
      const H = Math.max(1, Math.round(virtual.maxH * pxPerCm));

      const canvas = document.createElement("canvas");
      canvas.width = Math.min(W, 8000);
      canvas.height = Math.min(H, 8000);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#f5f6f7";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cover = computeCover(
        imgInfo.w,
        imgInfo.h,
        virtual.totalW,
        virtual.maxH
      );
      const s = pxPerCm;
      const sx = -cover.offsetX * s;
      const sy = -cover.offsetY * s;
      const sw = cover.scaledW * s;
      const sh = cover.scaledH * s;

      // Reuse the same image source used in the preview
      const img = await loadImage(imgInfo.url);

      ctx.drawImage(img, sx, sy, sw, sh);

      const r = 6 * (pxPerCm / 8); // scale corner radius with export density
      ctx.save();
      let xAcc = 0;
      for (const p of plates) {
        const x = xAcc * s;
        const y = (virtual.maxH - p.heightCm) * s;
        const w = p.widthCm * s;
        const h = p.heightCm * s;

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.18)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 8;
        roundRect(ctx, x, y, w, h, r);
        ctx.fillStyle = "rgba(255,255,255,0.001)";
        ctx.fill();
        ctx.restore();

        ctx.save();
        roundRect(ctx, x, y, w, h, r);
        ctx.clip();
        ctx.drawImage(img, sx, sy, sw, sh);
        ctx.restore();

        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#cccccc";
        roundRect(ctx, x, y, w, h, r);
        ctx.stroke();
        ctx.restore();

        xAcc += p.widthCm;
      }
      ctx.restore();

      // Export to PNG and trigger a download
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "plate-preview.png";
      a.click();
    } catch (err) {
      // Most common failure: CORS-tainted canvas with remote images
      alert(
        "Export failed. If you used a remote image without CORS, upload the image instead."
      );
      console.error(err);
    }
  };

  return (
    <div className="canvas-wrap panel">
      <div className="preview-head">
        <div className="preview-title">Visual Preview</div>
        <button className="btn" onClick={handleExport}>
          Export PNG
        </button>
      </div>

      <div className="canvas gradient-card" ref={ref}>
        <div
          className="canvas-inner"
          style={{
            width: virtual.totalW * preview.scale,
            height: virtual.maxH * preview.scale,
          }}
        >
          {bg &&
            plates.map((p, idx) => {
              const off = offsets[idx];
              const width = p.widthCm * preview.scale;
              const height = p.heightCm * preview.scale;

              return (
                <div
                  key={p.id}
                  className="plate anim-plate"
                  style={{
                    left: off.x0 * preview.scale,
                    width,
                    height,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url(${bg.url})`,
                      backgroundSize: `${bg.sizeW}px ${bg.sizeH}px`,
                      backgroundPosition: `${bg.posX(off.x0)}px ${bg.posY(
                        off.y0
                      )}px`,
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                </div>
              );
            })}
        </div>
      </div>

      <div className="hint">Scale auto-fit (1 cm → preview px)</div>
    </div>
  );
}

/**
 * roundRect
 * Draws a rounded rectangle path into the current 2D context.
 * - radius is clamped to half the smallest dimension to avoid artifacts.
 */
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
