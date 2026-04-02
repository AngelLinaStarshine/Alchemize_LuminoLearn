/**
 * Ghost targets + optional debug — positioned in lab canvas space (same parent as atoms).
 * Centers must match getDropSlotCenters() exactly.
 */

import React from 'react';
import {
  DROP_SLOT_SIZE,
  DROP_SLOT_RADIUS_PX,
  SNAP_MAGNET_OUTER_PX,
  ATOM_RADIUS_PX,
  distance2D,
} from '../utils/reactionLayout';

export interface DropSlotOverlayProps {
  centers: { x: number; y: number }[];
  isDragActive: boolean;
  /** Slot index to emphasize (magnetic hover) */
  glowSlotIndex?: number;
  /** `?debugSlots=1` */
  debug?: boolean;
  /** Hand position in same coordinate system as centers (full workspace height; y includes palette — callers should pass lab-space y only when debugging atoms) */
  debugHandLab?: { x: number; y: number } | null;
  /** Dragged atom center for debug */
  debugAtomCenter?: { x: number; y: number } | null;
}

export function DropSlotOverlay({
  centers,
  isDragActive,
  glowSlotIndex = -1,
  debug = false,
  debugHandLab = null,
  debugAtomCenter = null,
}: DropSlotOverlayProps) {
  if (centers.length === 0 && !debug) return null;

  return (
    <div className="absolute inset-0 z-[15] pointer-events-none overflow-visible" aria-hidden>
      {centers.map((c, i) => {
        const left = c.x - DROP_SLOT_RADIUS_PX;
        const top = c.y - DROP_SLOT_RADIUS_PX;
        const glow = glowSlotIndex === i;
        return (
          <div
            key={`slot-${i}`}
            className="absolute rounded-full border-2 border-dashed transition-all duration-200 ease-out box-border"
            style={{
              left,
              top,
              width: DROP_SLOT_SIZE,
              height: DROP_SLOT_SIZE,
              borderColor: glow
                ? 'rgba(125, 207, 182, 0.95)'
                : isDragActive
                  ? 'rgba(125, 207, 182, 0.55)'
                  : 'rgba(125, 207, 182, 0.35)',
              backgroundColor: glow
                ? 'rgba(125, 207, 182, 0.12)'
                : 'rgba(15, 23, 42, 0.4)',
              boxShadow: glow
                ? 'inset 0 0 20px rgba(125,207,182,0.2), 0 0 28px rgba(125,207,182,0.45)'
                : 'inset 0 2px 14px rgba(0,0,0,0.35), 0 0 20px rgba(125, 207, 182, 0.1)',
            }}
          />
        );
      })}

      {debug && (
        <svg className="absolute inset-0 w-full h-full overflow-visible">
          {centers.map((c, i) => (
            <g key={`dbg-${i}`}>
              <circle
                cx={c.x}
                cy={c.y}
                r={3}
                fill="#f472b6"
                stroke="#fff"
                strokeWidth={1}
              />
              <circle
                cx={c.x}
                cy={c.y}
                r={SNAP_MAGNET_OUTER_PX}
                fill="none"
                stroke="rgba(244,114,182,0.35)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <title>
                {`slot ${i} center (${c.x.toFixed(1)}, ${c.y.toFixed(1)})`}
              </title>
            </g>
          ))}
          {debugAtomCenter && (
            <circle
              cx={debugAtomCenter.x}
              cy={debugAtomCenter.y}
              r={ATOM_RADIUS_PX}
              fill="none"
              stroke="rgba(96,165,250,0.9)"
              strokeWidth={2}
            />
          )}
          {debugAtomCenter && (
            <circle
              cx={debugAtomCenter.x}
              cy={debugAtomCenter.y}
              r={3}
              fill="#60a5fa"
            />
          )}
          {debugHandLab && (
            <>
              <circle cx={debugHandLab.x} cy={debugHandLab.y} r={4} fill="#fbbf24" />
              <text
                x={debugHandLab.x + 8}
                y={debugHandLab.y}
                fill="#fbbf24"
                fontSize={10}
                fontFamily="monospace"
              >
                {`hand ${debugHandLab.x.toFixed(0)},${debugHandLab.y.toFixed(0)}`}
              </text>
            </>
          )}
        </svg>
      )}

      {debug && debugAtomCenter && centers.length > 0 && (
        <div className="absolute top-2 left-2 text-[10px] font-mono text-lime-300/95 bg-black/70 px-2 py-1 rounded max-w-[min(280px,90vw)] space-y-0.5">
          {centers.map((c, i) => {
            const d = distance2D(debugAtomCenter!.x, debugAtomCenter!.y, c.x, c.y);
            return (
              <div key={i}>
                slot {i}: dist {d.toFixed(1)}px {d <= SNAP_MAGNET_OUTER_PX ? '● magnet' : '○'}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
