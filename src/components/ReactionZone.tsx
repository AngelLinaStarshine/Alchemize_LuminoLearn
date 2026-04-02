/**
 * ReactionZone — bottom drop strip (decorative frame + caption only).
 * Ghost slot circles are rendered in ReactionWorkspace with the same pixel centers as snap math.
 */

import React from 'react';
import type { WorkspaceBounds } from '../utils/dropZones';
import { REACTION_RECT_HEIGHT, REACTION_RECT_MARGIN } from '../utils/dropZones';

interface ReactionZoneProps {
  bounds: WorkspaceBounds | null;
  isDragActive?: boolean;
  /** Highlight / pulse bottom strip when user is near a slot */
  slotProximityActive?: boolean;
  slotCount?: number;
}

export function ReactionZone({
  bounds,
  isDragActive = false,
  slotProximityActive = false,
  slotCount = 0,
}: ReactionZoneProps) {
  if (!bounds) return null;

  const stripHeight = REACTION_RECT_HEIGHT + REACTION_RECT_MARGIN;
  const energized = isDragActive || slotProximityActive;

  return (
    <div
      className="absolute left-0 right-0 bottom-0 z-[5] box-border"
      style={{
        height: stripHeight,
        paddingLeft: REACTION_RECT_MARGIN,
        paddingRight: REACTION_RECT_MARGIN,
        paddingBottom: REACTION_RECT_MARGIN,
      }}
    >
      <div
        className={`relative w-full h-full rounded-2xl border-2 transition-all duration-300 reaction-zone-grid box-border ${
          energized
            ? 'border-[var(--lumino-turquoise)] border-opacity-90 bg-[var(--lumino-turquoise)]/12 shadow-[0_0_50px_var(--lumino-turquoise-glow)]'
            : 'border-[var(--lumino-turquoise)]/40 bg-[var(--lumino-turquoise)]/5'
        }`}
        style={{
          boxShadow: energized
            ? 'inset 0 0 60px rgba(125,207,182,0.1), 0 0 44px rgba(125,207,182,0.3)'
            : 'inset 0 0 40px rgba(125,207,182,0.05), 0 0 20px rgba(125,207,182,0.15)',
        }}
        aria-label={
          slotCount > 0
            ? `Drop zone: ${slotCount} slot${slotCount === 1 ? '' : 's'} above`
            : 'Drop zone for atoms'
        }
      >
        <span className="absolute left-0 right-0 bottom-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--lumino-turquoise)]/80 text-center leading-tight px-1 pointer-events-none">
          {slotCount > 0
            ? `Place ${slotCount} atom${slotCount === 1 ? '' : 's'} in the circles`
            : 'Drop here'}
        </span>
      </div>
    </div>
  );
}
