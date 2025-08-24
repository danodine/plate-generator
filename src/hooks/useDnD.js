import { useRef } from "react";
/**
 * useDnD
 * Native HTML5 drag & drop helpers for reordering.
 *
 * onMove(fromIndex: number, toIndex: number): void
 *
 * Notes:
 * - I use a 1x1 transparent drag image to avoid a large snapshot of the card.
 * - I keep the function signatures symmetrical (handleDragOver takes the index
 *   too) even if I don’t need it — simplifies usage where I always pass `idx`.
 */
export function useDnD(onMove) {
  const dragIndex = useRef(null);

  const handleDragStart = (i) => (e) => {
    dragIndex.current = i;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      const img = new Image();
      img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
      e.dataTransfer.setDragImage(img, 0, 0);
    }
  };

  // `_i` kept for signature symmetry; currently not used.
  const handleDragOver = (_i) => (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (i) => (e) => {
    e.preventDefault();
    const from = dragIndex.current;
    const to = i;
    if (Number.isInteger(from) && Number.isInteger(to) && from !== to) {
      onMove(from, to);
    }
    dragIndex.current = null;
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
  };

  return { handleDragStart, handleDragOver, handleDrop, handleDragEnd };
}
