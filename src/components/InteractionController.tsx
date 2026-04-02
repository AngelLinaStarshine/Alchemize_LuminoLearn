/**
 * InteractionController - Mouse vs camera hover logic
 * Palette: right (desktop) or bottom (mobile)
 */

import React, { useState, useCallback } from 'react';
import type { AtomInstance, Element } from '../types';
import {
  ATOM_RADIUS_PX,
  PALETTE_BOTTOM_HEIGHT as DEFAULT_PALETTE_BOTTOM_HEIGHT,
  PALETTE_GAP,
  PALETTE_ITEM_SIZE,
} from '../utils/reactionLayout';

export interface InteractionState {
  hoveredAtomId: string | null;
  hoveredPaletteElementId: string | null;
}

export interface InteractionControllerProps {
  children: (state: InteractionState) => React.ReactNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
  atoms: AtomInstance[];
  elements: Element[];
  handState: { x: number; y: number; isPinching?: boolean; isGrabbing?: boolean } | null;
  paletteWidth?: number;
  paletteSide?: 'left' | 'right' | 'bottom';
  paletteBottomHeight?: number;
}

export function InteractionController({
  children,
  containerRef,
  atoms,
  elements,
  handState,
  paletteWidth = 96,
  paletteSide = 'right',
  paletteBottomHeight = DEFAULT_PALETTE_BOTTOM_HEIGHT,
}: InteractionControllerProps) {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [containerRef]
  );

  const handleMouseLeave = useCallback(() => setMousePos(null), []);

  const rect = containerRef.current?.getBoundingClientRect();
  const handPos = handState && rect ? { x: handState.x * rect.width, y: handState.y * rect.height } : null;
  const isDragging = atoms.some((a) => a.isDragging);
  const hasAnyPointer = mousePos || handPos;

  let hoveredAtomId: string | null = null;
  let hoveredPaletteElementId: string | null = null;

  if (rect && hasAnyPointer && !isDragging) {
    const px = handPos ? handPos.x : mousePos!.x;
    const py = handPos ? handPos.y : mousePos!.y;

    let inPalette = false;
    if (paletteSide === 'bottom') {
      inPalette = py > rect.height - paletteBottomHeight;
    } else if (paletteSide === 'right') {
      inPalette = px > rect.width - paletteWidth;
    } else {
      inPalette = px < paletteWidth;
    }

    if (inPalette) {
      if (paletteSide === 'bottom') {
        const n = elements.length;
        const totalW = n * PALETTE_ITEM_SIZE + (n - 1) * PALETTE_GAP;
        const startX = (rect.width - totalW) / 2 + PALETTE_ITEM_SIZE / 2;
        const cy = rect.height - paletteBottomHeight / 2;
        for (let i = 0; i < n; i++) {
          const cx = startX + i * (PALETTE_ITEM_SIZE + PALETTE_GAP);
          if (Math.hypot(px - cx, py - cy) < 50) {
            hoveredPaletteElementId = elements[i].id;
            break;
          }
        }
      } else {
        const paletteCenterX = paletteSide === 'right'
          ? rect.width - paletteWidth / 2
          : paletteWidth / 2;
        const topOffset = 100;
        for (let i = 0; i < elements.length; i++) {
          const centerY = topOffset + i * (PALETTE_ITEM_SIZE + 40) + PALETTE_ITEM_SIZE / 2;
          if (Math.hypot(px - paletteCenterX, py - centerY) < 55) {
            hoveredPaletteElementId = elements[i].id;
            break;
          }
        }
      }
    } else {
      const atom = atoms.find((a) => Math.hypot(a.x - px, a.y - py) < ATOM_RADIUS_PX + 28);
      if (atom) hoveredAtomId = atom.instanceId;
    }
  }

  return (
    <>
      {children({ hoveredAtomId, hoveredPaletteElementId })}
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="absolute inset-0 z-[1]"
        style={{ pointerEvents: 'auto' }}
        aria-hidden
      />
    </>
  );
}
