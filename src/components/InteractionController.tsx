/**
 * InteractionController - Mouse vs camera hover logic
 * Supports left/right palette. Produces hoveredAtomId, hoveredPaletteElementId
 */

import React, { useState, useCallback } from 'react';
import type { AtomInstance, Element } from '../types';

const PALETTE_ITEM_SIZE = 56;
const PALETTE_GAP = 40;
const PALETTE_TOP_OFFSET = 100;

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
  paletteSide?: 'left' | 'right';
}

export function InteractionController({
  children,
  containerRef,
  atoms,
  elements,
  handState,
  paletteWidth = 96,
  paletteSide = 'right',
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

    const inPalette = paletteSide === 'right'
      ? px > rect.width - paletteWidth
      : px < paletteWidth;

    if (inPalette) {
      const paletteCenterX = paletteSide === 'right'
        ? rect.width - paletteWidth / 2
        : paletteWidth / 2;
      for (let i = 0; i < elements.length; i++) {
        const centerY = PALETTE_TOP_OFFSET + i * (PALETTE_ITEM_SIZE + PALETTE_GAP) + PALETTE_ITEM_SIZE / 2;
        if (Math.hypot(px - paletteCenterX, py - centerY) < 55) {
          hoveredPaletteElementId = elements[i].id;
          break;
        }
      }
    } else {
      const atom = atoms.find((a) => Math.hypot(a.x - px, a.y - py) < 75);
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
