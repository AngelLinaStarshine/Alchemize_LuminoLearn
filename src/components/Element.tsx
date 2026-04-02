/**
 * Element — Circular atoms. (x, y) is the **center** in lab canvas px.
 * Position uses left/top in pixels so visual center = logic center (no translate/scale drift).
 */

import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { Element as ElementType } from '../types';
import { ATOM_DIAMETER_PX, ATOM_RADIUS_PX } from '../utils/reactionLayout';

const HOVER_SCALE = 1.12;
const DRAG_SCALE = 1.06;
const HOVER_GLOW = '0 0 28px';

interface ElementBaseProps {
  element: ElementType;
  isHovered: boolean;
  variant: 'atom' | 'palette';
}

interface AtomElementProps extends ElementBaseProps {
  variant: 'atom';
  instanceId: string;
  x: number;
  y: number;
  /** @deprecated ignored — radius fixed to ATOM_RADIUS_PX for alignment */
  size?: number;
  isDragging?: boolean;
  isInvalidDrop?: boolean;
  onRemove?: () => void;
}

interface PaletteElementProps extends ElementBaseProps {
  variant: 'palette';
}

export type ElementProps = AtomElementProps | PaletteElementProps;

export function Element(props: ElementProps) {
  const { element, isHovered, variant } = props;

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const glowColor = hexToRgba(element.color, 0.6);
  const baseShadow = `0 4px 20px ${hexToRgba(element.color, 0.4)}`;
  const hoverShadow = `${HOVER_GLOW} ${glowColor}, 0 8px 24px ${hexToRgba(element.color, 0.5)}`;

  if (variant === 'palette') {
    return (
      <motion.div
        className="element-palette-item w-14 h-14 rounded-full flex items-center justify-center text-xl font-black select-none touch-none relative box-border"
        style={{
          backgroundColor: element.color,
          color: element.id === 'c' ? 'white' : 'inherit',
          boxShadow: isHovered ? hoverShadow : baseShadow,
          border: `2px solid ${isHovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'}`,
          pointerEvents: 'none',
          transformOrigin: '50% 50%',
        }}
        animate={{
          scale: isHovered ? 1.08 : 1,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {element.symbol}
      </motion.div>
    );
  }

  const atomProps = props as AtomElementProps;
  const { x, y, isDragging = false, isInvalidDrop = false, onRemove } = atomProps;

  return (
    <motion.div
      className={`element-atom absolute rounded-full flex items-center justify-center text-2xl font-black select-none touch-none z-20 box-border ${isInvalidDrop ? 'invalid-drop-shake' : ''}`}
      style={{
        width: ATOM_DIAMETER_PX,
        height: ATOM_DIAMETER_PX,
        backgroundColor: element.color,
        color: element.id === 'c' ? 'white' : 'inherit',
        boxShadow: isHovered && !isDragging ? hoverShadow : baseShadow,
        border: `2px solid ${isHovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)'}`,
        pointerEvents: 'none',
        transformOrigin: '50% 50%',
        willChange: 'left, top, transform',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        left: x - ATOM_RADIUS_PX,
        top: y - ATOM_RADIUS_PX,
        scale: isDragging ? DRAG_SCALE : isHovered ? HOVER_SCALE : 1,
        opacity: 1,
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={
        isDragging
          ? {
              left: { type: 'tween', duration: 0, ease: 'linear' },
              top: { type: 'tween', duration: 0, ease: 'linear' },
              scale: { type: 'spring', stiffness: 520, damping: 38 },
            }
          : { left: { type: 'spring', stiffness: 420, damping: 34 }, top: { type: 'spring', stiffness: 420, damping: 34 }, scale: { type: 'spring', stiffness: 400, damping: 32 } }
      }
    >
      {element.symbol}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemove();
          }}
          className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[var(--lumino-error)]/90 hover:bg-[var(--lumino-error)] text-white flex items-center justify-center shadow-lg opacity-90 hover:opacity-100 transition-opacity z-10 cursor-pointer"
          style={{ pointerEvents: 'auto' }}
          title="Remove element"
        >
          <X className="w-3 h-3" strokeWidth={2.5} />
        </button>
      )}
    </motion.div>
  );
}