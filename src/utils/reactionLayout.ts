/**
 * Shared layout: drop slots + palette + atom geometry (single source of truth).
 * All draggable atoms use (x, y) = center point in **lab canvas** coordinates (reaction area div).
 */

import { REACTION_RECT_HEIGHT, REACTION_RECT_MARGIN } from './dropZones';

/** Rendered atom diameter — use px everywhere so logic matches DOM regardless of rem scaling */
export const ATOM_DIAMETER_PX = 64;
export const ATOM_RADIUS_PX = ATOM_DIAMETER_PX / 2;

export const DROP_SLOT_SIZE = 64;
export const DROP_SLOT_GAP = 18;
export const DROP_SLOT_RADIUS_PX = DROP_SLOT_SIZE / 2;

export const PALETTE_ITEM_SIZE = 56;
export const PALETTE_GAP = 24;

export const PALETTE_BOTTOM_HEIGHT = 96;

/** Euclidean distance */
export function distance2D(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/** Center of axis-aligned box (for snapping math) */
export function boxCenter(left: number, top: number, w: number, h: number): { x: number; y: number } {
  return { x: left + w / 2, y: top + h / 2 };
}

/** Pixels from bottom of lab canvas to bottom edge of ghost slot boxes (matches ReactionStrip) */
export const DROP_SLOT_ROW_BOTTOM_OFFSET = 36;

/** Ghost / snap row — center Y in lab canvas space (origin top-left of lab area) */
export function getDropSlotCenterY(contentHeight: number): number {
  return contentHeight - DROP_SLOT_ROW_BOTTOM_OFFSET - DROP_SLOT_RADIUS_PX;
}

/** Slot centers for snapping and rendering — same numbers for ghost circles and physics */
export function getDropSlotCenters(
  contentWidth: number,
  contentHeight: number,
  slotCount: number
): { x: number; y: number }[] {
  if (slotCount <= 0) return [];
  const rowW = slotCount * DROP_SLOT_SIZE + (slotCount - 1) * DROP_SLOT_GAP;
  const inset = REACTION_RECT_MARGIN;
  const avail = contentWidth - 2 * inset;
  const offset = Math.max(0, (avail - rowW) / 2);
  const y = getDropSlotCenterY(contentHeight);
  const centers: { x: number; y: number }[] = [];
  for (let i = 0; i < slotCount; i++) {
    const x = inset + offset + DROP_SLOT_RADIUS_PX + i * (DROP_SLOT_SIZE + DROP_SLOT_GAP);
    centers.push({ x, y });
  }
  return centers;
}

/** "Occupied" if another atom's center is close to this slot */
const SLOT_CLAIM_DIST = ATOM_RADIUS_PX + 6;

/**
 * Pick pinch/hand point (primary) blended with atom center for slot choice — feels intentional on release.
 */
export function snapDropToNearestFreeSlot(
  atomCenterX: number,
  atomCenterY: number,
  handOrPinchX: number | null,
  handOrPinchY: number | null,
  centers: { x: number; y: number }[],
  otherAtoms: { x: number; y: number }[]
): { x: number; y: number } {
  if (centers.length === 0) return { x: atomCenterX, y: atomCenterY };

  let refX = atomCenterX;
  let refY = atomCenterY;
  if (handOrPinchX != null && handOrPinchY != null) {
    refX = atomCenterX * 0.25 + handOrPinchX * 0.75;
    refY = atomCenterY * 0.25 + handOrPinchY * 0.75;
  }

  const claimed = new Set<number>();
  for (const a of otherAtoms) {
    let bestI = -1;
    let bd = Infinity;
    centers.forEach((c, i) => {
      const d = distance2D(a.x, a.y, c.x, c.y);
      if (d < bd) {
        bd = d;
        bestI = i;
      }
    });
    if (bestI >= 0 && bd < SLOT_CLAIM_DIST) claimed.add(bestI);
  }

  const ranked = centers
    .map((c, i) => ({ c, i, d: distance2D(refX, refY, c.x, c.y) }))
    .sort((a, b) => a.d - b.d);

  for (const { c, i } of ranked) {
    if (!claimed.has(i)) return { x: c.x, y: c.y };
  }
  return { x: ranked[0].c.x, y: ranked[0].c.y };
}

/** Outside this radius, atom follows hand 1:1. Inside, pull toward nearest slot center. */
export const SNAP_MAGNET_OUTER_PX = 80;
export const SNAP_MAGNET_INNER_PX = 28;

export function magnetAtomTowardSlots(
  x: number,
  y: number,
  centers: { x: number; y: number }[]
): { x: number; y: number } {
  if (centers.length === 0) return { x, y };
  let bx = x;
  let by = y;
  let bd = Infinity;
  for (const c of centers) {
    const d = distance2D(x, y, c.x, c.y);
    if (d < bd) {
      bd = d;
      bx = c.x;
      by = c.y;
    }
  }
  if (bd >= SNAP_MAGNET_OUTER_PX) return { x, y };
  const t =
    bd <= SNAP_MAGNET_INNER_PX
      ? 1
      : 1 - (bd - SNAP_MAGNET_INNER_PX) / (SNAP_MAGNET_OUTER_PX - SNAP_MAGNET_INNER_PX);
  const k = t * t * (3 - 2 * t);
  return {
    x: x + (bx - x) * k * 0.92,
    y: y + (by - y) * k * 0.92,
  };
}

/** Index of nearest slot to point, or -1 */
export function nearestSlotIndex(
  x: number,
  y: number,
  centers: { x: number; y: number }[]
): number {
  if (centers.length === 0) return -1;
  let best = 0;
  let bd = Infinity;
  centers.forEach((c, i) => {
    const d = distance2D(x, y, c.x, c.y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}
