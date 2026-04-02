import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ReactionEngine } from '../engine';
import { MoleculeAnimation } from './MoleculeAnimation';
import { Element } from './Element';
import { ReactionZone } from './ReactionZone';
import { DropSlotOverlay } from './DropSlotOverlay';
import { InteractionController } from './InteractionController';
import type { AtomInstance, Element as ElementType } from '../types';
import type { TaskRequirement } from '../data/tasks';
import { expandRequirementToSlots } from '../utils/taskRequirement';
import { REACTION_RECT_HEIGHT, REACTION_RECT_MARGIN } from '../utils/dropZones';
import {
  PALETTE_BOTTOM_HEIGHT,
  PALETTE_GAP,
  getDropSlotCenters,
  nearestSlotIndex,
  distance2D,
  SNAP_MAGNET_OUTER_PX,
} from '../utils/reactionLayout';

const PALETTE_WIDTH = 96;

interface ReactionWorkspaceProps {
  atoms: AtomInstance[];
  onAtomsChange: (atoms: AtomInstance[]) => void;
  workspaceRef?: React.RefObject<HTMLDivElement | null>;
  feedback?: { type: 'success' | 'error' | 'info'; errorType?: string } | null;
  successReaction?: { id?: string; name: string; formula: string } | null;
  onMoleculeComplete?: () => void;
  videoRef?: (node: HTMLVideoElement | null) => void;
  canvasRef?: (node: HTMLCanvasElement | null) => void;
  handState?: { x: number; y: number; isPinching?: boolean; isGrabbing?: boolean } | null;
  isReady?: boolean;
  elements: ElementType[];
  showCamera?: boolean;
  onAddAtom?: (elementId: string, x?: number, y?: number) => void;
  completedMolecules?: { name: string; formula: string }[];
  /** Current challenge stoichiometry — renders that many ghost circles in the drop zone */
  taskRequirement?: TaskRequirement;
  /** When set (e.g. H2O), ghost order follows formula left-to-right */
  taskFormula?: string;
  /** Append ?debugSlots=1 to URL — slot centers, magnet radii, live coords */
  debugInteraction?: boolean;
}

export function ReactionWorkspace({
  atoms,
  onAtomsChange,
  workspaceRef: externalRef,
  feedback,
  successReaction,
  onMoleculeComplete,
  videoRef,
  canvasRef,
  handState,
  isReady = true,
  elements,
  showCamera = false,
  onAddAtom,
  completedMolecules = [],
  taskRequirement,
  taskFormula,
  debugInteraction = false,
}: ReactionWorkspaceProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = externalRef || internalRef;
  const canvasRefInternal = useRef<HTMLCanvasElement | null>(null);
  const [bounds, setBounds] = useState<{ width: number; height: number } | null>(null);
  const reactionAreaWidth = bounds ? bounds.width : 0;
  const reactionContentHeight = bounds
    ? bounds.height - PALETTE_BOTTOM_HEIGHT
    : 0;

  const updateBounds = useCallback(() => {
    const el = ref.current;
    if (el && el.clientWidth > 0 && el.clientHeight > 0) {
      setBounds({ width: el.clientWidth, height: el.clientHeight });
    }
  }, []);

  useEffect(() => {
    updateBounds();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(updateBounds);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateBounds]);

  const isDragActive = atoms.some((a) => a.isDragging);
  const reactionBounds = bounds
    ? { width: reactionAreaWidth, height: reactionContentHeight }
    : null;

  const requirementSlots = useMemo(
    () => expandRequirementToSlots(taskRequirement, elements, taskFormula),
    [taskRequirement, elements, taskFormula]
  );

  const slotCenters = useMemo(() => {
    if (!reactionBounds) return [];
    return getDropSlotCenters(
      reactionBounds.width,
      reactionBounds.height,
      requirementSlots.length
    );
  }, [reactionBounds, requirementSlots]);

  const draggingAtom = atoms.find((a) => a.isDragging);
  let glowSlotIndex = -1;
  if (draggingAtom && slotCenters.length > 0) {
    const ni = nearestSlotIndex(draggingAtom.x, draggingAtom.y, slotCenters);
    const c = slotCenters[ni];
    if (c && distance2D(draggingAtom.x, draggingAtom.y, c.x, c.y) <= SNAP_MAGNET_OUTER_PX + 10) {
      glowSlotIndex = ni;
    }
  }

  const handOverlayPos =
    handState && bounds
      ? { x: handState.x * bounds.width, y: handState.y * bounds.height }
      : null;

  useEffect(() => {
    const el = ref.current;
    const canvas = canvasRefInternal.current;
    if (!el || !canvas) return;
    const sync = () => {
      canvas.width = el.clientWidth;
      canvas.height = el.clientHeight;
    };
    sync();
    const canvasRo = new ResizeObserver(sync);
    canvasRo.observe(el);
    return () => canvasRo.disconnect();
  }, [showCamera]);

  return (
    <div
      ref={ref}
      className="relative flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-[var(--lumino-border)] lumino-card min-h-[200px]"
      style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.5) 100%)' }}
    >
      <InteractionController
        containerRef={ref}
        atoms={atoms}
        elements={elements}
        handState={handState ?? null}
        paletteWidth={PALETTE_WIDTH}
        paletteSide="bottom"
        paletteBottomHeight={PALETTE_BOTTOM_HEIGHT}
      >
        {({ hoveredAtomId, hoveredPaletteElementId }) => (
          <>
      {/* Lab canvas — full width, palette is a separate strip below */}
      <div className="relative flex-1 min-w-0 min-h-0 reaction-zone-grid order-1">
        {/* Camera layer */}
        {showCamera && videoRef && canvasRef && (
          <>
            <div className="absolute inset-0 z-0">
              <video
                ref={videoRef}
                className="w-full h-full object-cover scale-x-[-1] opacity-25"
                playsInline
                muted
              />
              <canvas
                ref={(el) => {
                  canvasRefInternal.current = el;
                  if (canvasRef) canvasRef(el);
                  if (el && ref.current) {
                    el.width = ref.current.clientWidth;
                    el.height = ref.current.clientHeight;
                  }
                }}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                style={{ width: '100%', height: '100%' }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(to bottom, rgba(15,23,42,0.4) 0%, transparent 30%, transparent 70%, rgba(15,23,42,0.3) 100%)',
                }}
              />
            </div>
            {!isReady && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--lumino-bg)]/90">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-[var(--lumino-turquoise)] border-t-transparent rounded-full animate-spin" />
                  <p className="text-[var(--lumino-turquoise)] font-bold text-sm">Starting camera...</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Completed molecules strip */}
        {completedMolecules.length > 0 && (
          <div className="absolute top-3 left-0 right-0 z-10 flex items-center justify-center gap-2 flex-wrap px-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--lumino-text-muted)] mr-2">Formed:</span>
            {completedMolecules.map((m, i) => (
              <motion.div
                key={`${m.formula}_${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-3 py-2 rounded-lg border border-[var(--lumino-turquoise)]/40 bg-[var(--lumino-turquoise)]/10 flex items-center gap-2"
              >
                <span className="text-sm font-bold text-[var(--lumino-text)]">{m.formula}</span>
                <span className="text-[10px] font-medium text-[var(--lumino-turquoise)]">{m.name}</span>
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {successReaction && feedback?.type === 'success' && (
            <MoleculeAnimation reaction={successReaction} onComplete={onMoleculeComplete} />
          )}
        </AnimatePresence>

        <ReactionZone
          bounds={reactionBounds}
          isDragActive={isDragActive}
          slotProximityActive={glowSlotIndex >= 0}
          slotCount={requirementSlots.length}
        />

        <DropSlotOverlay
          centers={slotCenters}
          isDragActive={isDragActive}
          glowSlotIndex={glowSlotIndex}
          debug={debugInteraction}
          debugHandLab={handOverlayPos}
          debugAtomCenter={draggingAtom ? { x: draggingAtom.x, y: draggingAtom.y } : null}
        />

        {/* Equation display */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 sm:gap-2 max-w-[calc(100%-1rem)] px-2 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-[var(--lumino-border)] lumino-card text-xs sm:text-sm"
          style={{ top: completedMolecules.length > 0 ? 52 : 16 }}
        >
          {(() => {
            const w = reactionBounds?.width ?? reactionAreaWidth;
            const h = reactionBounds?.height ?? reactionContentHeight;
            const zoneTop = h - REACTION_RECT_HEIGHT - REACTION_RECT_MARGIN;
            const zoneBottom = h - REACTION_RECT_MARGIN;
            const zoneLeft = REACTION_RECT_MARGIN;
            const zoneRight = w - REACTION_RECT_MARGIN;
            const insideZone = atoms.filter(
              (a) => w > 0 && a.x >= zoneLeft && a.x <= zoneRight && a.y >= zoneTop && a.y <= zoneBottom
            );
            const counts: Record<string, number> = {};
            insideZone.forEach((a) => { counts[a.elementId] = (counts[a.elementId] || 0) + 1; });
            const entries = Object.entries(counts);
            return entries.length > 0 ? (
              entries.map(([id, count], idx) => {
                const el = ReactionEngine.getElement(id)!;
                return (
                  <React.Fragment key={id}>
                    {idx > 0 && <span className="font-bold text-[var(--lumino-text-muted)]">+</span>}
                    <span className="font-bold" style={{ color: el.color }}>
                      {el.symbol}{count > 1 && count}
                    </span>
                  </React.Fragment>
                );
              })
            ) : (
              <span className="text-[var(--lumino-text-muted)] italic text-xs">
                Pinch atoms into the drop zone at the bottom. Release outside to return.
              </span>
            );
          })()}
        </div>

              <AnimatePresence>
                {atoms.map((atom) => {
                  const element = ReactionEngine.getElement(atom.elementId)!;
                  const isRepelling = feedback?.errorType === 'unstable' || feedback?.errorType === 'wrong_elements';
                  return (
                    <Element
                      key={atom.instanceId}
                      variant="atom"
                      instanceId={atom.instanceId}
                      element={element}
                      x={atom.x}
                      y={atom.y}
                      isHovered={hoveredAtomId === atom.instanceId}
                      isDragging={atom.isDragging}
                      isInvalidDrop={isRepelling}
                      onRemove={() => onAtomsChange(atoms.filter((a) => a.instanceId !== atom.instanceId))}
                    />
                  );
                })}
              </AnimatePresence>
      </div>

      {/* Elements — bottom bar, spaced for touch / pinch */}
      {onAddAtom && (
        <div
          className="flex-shrink-0 flex flex-col items-center gap-1 py-3 px-3 sm:px-5 border-t border-[var(--lumino-border)] bg-[var(--lumino-bg-elevated)]/50 order-2 w-full justify-center"
          style={{ pointerEvents: 'none', minHeight: PALETTE_BOTTOM_HEIGHT }}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--lumino-text-muted)]">Elements</span>
          <div
            className="flex flex-row flex-wrap items-center justify-center"
            style={{ gap: PALETTE_GAP }}
          >
            {elements.map((el) => (
              <Element
                key={el.id}
                variant="palette"
                element={el}
                isHovered={hoveredPaletteElementId === el.id}
              />
            ))}
          </div>
        </div>
      )}
          </>
        )}
      </InteractionController>
    </div>
  );
}
