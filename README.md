# Plate Generator (React + Vite)

A small tool to configure multi-panel “plates” that share one image (motif). You set each plate’s width/height, and the preview shows how the image will look across all plates. State is saved in the browser.

## What it does
- Visual preview with realistic proportions (no distortion)
- Shared motif mapped across all plates
- Automatic mirroring for very wide layouts (total width > 300 cm)
- Add, remove (except last), and reorder plates (drag & drop or arrows)
- Inputs accept `.` or `,` as decimals
- Optional: change the motif via URL; export preview as PNG
- Units toggle: centimeters / inches (internally stored as cm)

## Using the app
- Set Breite (width) and Höhe (height) for each plate.
- Ranges: Width 20–300 cm, Height 30–128 cm.
- Type decimals with . or ,; values clamp/validate on blur.
- Click Rückenwand hinzufügen + to add a plate (max 10).
- Reorder with drag & drop (or the ◀ ▶ buttons).
- Remove a plate with the red − (at least one plate must remain).
- (Optional) Enter a Motif Image URL.
- (Optional) Toggle cm / in in the header; the UI converts values.
- (Optional) Export PNG from the preview header.

## Notes:

PNG export of remote images requires CORS; otherwise upload/host with permissive headers.

State is persisted to localStorage under the key plate-generator.
Reset via browser console:

## Quick start
```bash
npm install
npm run dev
# Production:
npm run build
npm run preview

