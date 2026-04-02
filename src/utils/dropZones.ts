/**
 * Drop zone validation for Reaction Workspace
 * - Reaction Zone: rectangle at bottom - valid drop target
 * - Palette Zone: right side - invalid drop
 */

export interface WorkspaceBounds {
  width: number;
  height: number;
}

export interface ReactionRectConfig {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface PaletteZoneConfig {
  topY: number;
}

const DEFAULT_PALETTE_TOP_OFFSET = 140;
export const REACTION_RECT_HEIGHT = 140;
/** Horizontal inset from workspace edges — smaller = wider drop field */
export const REACTION_RECT_MARGIN = 4;

export function getReactionRectConfig(bounds: WorkspaceBounds): ReactionRectConfig {
  const top = bounds.height - REACTION_RECT_HEIGHT - REACTION_RECT_MARGIN;
  const bottom = bounds.height - REACTION_RECT_MARGIN;
  return {
    left: REACTION_RECT_MARGIN,
    top,
    right: bounds.width - REACTION_RECT_MARGIN,
    bottom,
  };
}

export function getPaletteZoneConfig(bounds: WorkspaceBounds, topOffset = DEFAULT_PALETTE_TOP_OFFSET): PaletteZoneConfig {
  return {
    topY: bounds.height - topOffset,
  };
}

/** Check if (x, y) is inside the reaction zone (valid drop) - rectangle at bottom */
export function isInReactionZone(
  x: number,
  y: number,
  config: ReactionRectConfig
): boolean {
  return x >= config.left && x <= config.right && y >= config.top && y <= config.bottom;
}

/** Check if (x, y) is in the palette zone (invalid drop) */
export function isInPaletteZone(
  x: number,
  y: number,
  config: PaletteZoneConfig
): boolean {
  return y > config.topY;
}

export interface DropValidationResult {
  isValid: boolean;
  inReactionZone: boolean;
  inPaletteZone: boolean;
  /** Clamped position if valid (within reaction zone, not in palette) */
  clampedX?: number;
  clampedY?: number;
}

/**
 * Validate drop position. Elements can ONLY be dropped inside Reaction Zone.
 */
export function validateDrop(
  x: number,
  y: number,
  bounds: WorkspaceBounds,
  atomSize = 32,
  options?: { paletteTopOffset?: number }
): DropValidationResult {
  const reactionConfig = getReactionRectConfig(bounds);
  const paletteConfig = getPaletteZoneConfig(bounds, options?.paletteTopOffset ?? DEFAULT_PALETTE_TOP_OFFSET);

  const inPalette = isInPaletteZone(x, y, paletteConfig);
  const inReaction = isInReactionZone(x, y, reactionConfig);

  if (inPalette || !inReaction) {
    return {
      isValid: false,
      inReactionZone: inReaction,
      inPaletteZone: inPalette,
    };
  }

  const half = atomSize;
  const clampedX = Math.max(reactionConfig.left + half, Math.min(reactionConfig.right - half, x));
  const clampedY = Math.max(reactionConfig.top + half, Math.min(reactionConfig.bottom - half, y));

  return {
    isValid: true,
    inReactionZone: true,
    inPaletteZone: false,
    clampedX,
    clampedY,
  };
}
