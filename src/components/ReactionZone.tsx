/**
 * ReactionZone - LuminoDesign drop target
 * Rectangle at bottom of workspace
 */

import React from 'react';
import type { WorkspaceBounds } from '../utils/dropZones';

const ZONE_HEIGHT = 140;
const HORIZONTAL_MARGIN = 16;

interface ReactionZoneProps {
  bounds: WorkspaceBounds | null;
  isDragActive?: boolean;
}

export function ReactionZone({
  bounds,
  isDragActive = false,
}: ReactionZoneProps) {
  if (!bounds) return null;

  return (
    <div
      className="absolute left-0 right-0 bottom-0 z-5 px-4 pb-4"
      style={{ height: ZONE_HEIGHT + 16 }}
    >
      <div
        className={`w-full h-full rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-300 reaction-zone-grid ${
          isDragActive
            ? 'border-[var(--lumino-turquoise)] border-opacity-80 bg-[var(--lumino-turquoise)]/10 shadow-[0_0_50px_var(--lumino-turquoise-glow)]'
            : 'border-[var(--lumino-turquoise)]/40 bg-[var(--lumino-turquoise)]/5'
        }`}
        style={{
          boxShadow: isDragActive
            ? 'inset 0 0 60px rgba(125,207,182,0.08), 0 0 40px rgba(125,207,182,0.25)'
            : 'inset 0 0 40px rgba(125,207,182,0.05), 0 0 20px rgba(125,207,182,0.15)',
        }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--lumino-turquoise)]/80 text-center">
          Drop here
        </span>
      </div>
    </div>
  );
}
