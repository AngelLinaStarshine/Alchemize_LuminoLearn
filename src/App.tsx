/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Alchemize - Adaptive Chemistry Lab
 * LuminoDesign • Camera • Hand tracking • Pinch to add & drag atoms
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FlaskConical,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Target,
} from 'lucide-react';
import { ReactionEngine } from './engine';
import { AtomInstance } from './types';
import { TaskPanel } from './components/TaskPanel';
import { ReactionWorkspace } from './components/ReactionWorkspace';
import { ReactionReplay } from './components/ReactionReplay';
import { useTaskProgress } from './hooks/useTaskProgress';
import { useHandTracking } from './hooks/useHandTracking';
import { useIsMobileLayout } from './hooks/useMediaQuery';
import { getTutorHint } from './services/geminiService';
import { REACTION_RECT_HEIGHT, REACTION_RECT_MARGIN } from './utils/dropZones';
import { expandRequirementToSlots } from './utils/taskRequirement';
import {
  ATOM_RADIUS_PX,
  PALETTE_BOTTOM_HEIGHT,
  PALETTE_GAP,
  PALETTE_GAP_MOBILE,
  PALETTE_ITEM_SIZE,
  getDropSlotCenters,
  magnetAtomTowardSlots,
  snapDropToNearestFreeSlot,
} from './utils/reactionLayout';

export default function App() {
  const [atoms, setAtoms] = useState<AtomInstance[]>([]);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [successReaction, setSuccessReaction] = useState<{
    id?: string;
    name: string;
    formula: string;
  } | null>(null);
  const [completedMolecules, setCompletedMolecules] = useState<{ name: string; formula: string }[]>([]);
  const [pendingReaction, setPendingReaction] = useState<{ id?: string; name: string; formula: string } | null>(null);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [guidedSolution, setGuidedSolution] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const elements = ReactionEngine.getAllElements();

  const debugInteraction =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debugSlots') === '1';

  const isMobileLayout = useIsMobileLayout();
  const { handState, isReady } = useHandTracking(videoEl, canvasEl, {
    enhancedHandDrawing: isMobileLayout,
  });
  const paletteGapPick = isMobileLayout ? PALETTE_GAP_MOBILE : PALETTE_GAP;

  const {
    tasks,
    activeTask,
    completedCount,
    totalTasks,
    validateAndComplete,
    completeTaskAndUnlockNext,
    resetProgress,
    shouldShowHint,
    shouldShowGuidedSolution,
    challengeModeUnlocked,
  } = useTaskProgress();

  const addAtom = useCallback((elementId: string, x?: number, y?: number) => {
    const element = ReactionEngine.getElement(elementId);
    if (!element) return;

    const rect = workspaceRef.current?.getBoundingClientRect();
    const w = rect?.width ?? 500;
    const contentH = (rect?.height ?? 300) - PALETTE_BOTTOM_HEIGHT;
    const zoneTop = contentH - REACTION_RECT_HEIGHT - REACTION_RECT_MARGIN;
    const zoneBottom = contentH - REACTION_RECT_MARGIN;
    const zoneCenterX = w / 2;
    const zoneCenterY = zoneTop + (zoneBottom - zoneTop) / 2;

    setAtoms((prev) => {
      const slots = expandRequirementToSlots(activeTask?.requirement, elements, activeTask?.formula);
      const centers = getDropSlotCenters(w, contentH, slots.length);
      let nx = x;
      let ny = y;
      if (nx == null || ny == null) {
        if (centers.length > 0) {
          const idx = Math.min(prev.length, centers.length - 1);
          nx = centers[idx].x;
          ny = centers[idx].y;
        } else {
          const rowSpacing = 48;
          nx = zoneCenterX - (prev.length * rowSpacing) / 2 + prev.length * rowSpacing;
          ny = zoneCenterY;
        }
      }
      const newAtom: AtomInstance = {
        instanceId: Math.random().toString(36).slice(2, 11),
        elementId,
        x: nx!,
        y: ny!,
        isDragging: false,
      };
      return [...prev, newAtom];
    });
  }, [activeTask, elements]);

  useEffect(() => {
    if (!handState || !workspaceRef.current || !activeTask) return;

    const { x, y, isPinching, isGrabbing } = handState;
    const isHolding = isPinching || isGrabbing;
    const rect = workspaceRef.current.getBoundingClientRect();
    const px = x * rect.width;
    const py = y * rect.height;
    const reactionWidth = rect.width;
    const contentH = rect.height - PALETTE_BOTTOM_HEIGHT;
    const zoneTop = contentH - REACTION_RECT_HEIGHT - REACTION_RECT_MARGIN;
    const zoneBottom = contentH - REACTION_RECT_MARGIN;
    const zoneLeft = REACTION_RECT_MARGIN;
    const zoneRight = reactionWidth - REACTION_RECT_MARGIN;

    const requirementSlots = expandRequirementToSlots(
      activeTask.requirement,
      elements,
      activeTask.formula
    );
    const slotCenters = getDropSlotCenters(reactionWidth, contentH, requirementSlots.length);

    const isInsideDropZone = () => {
      return px >= zoneLeft && px <= zoneRight && py >= zoneTop && py <= zoneBottom;
    };

    setAtoms((prev) => {
      const draggingIdx = prev.findIndex((a) => a.isDragging);

      if (isHolding) {
        if (draggingIdx >= 0) {
          const atom = prev[draggingIdx];
          const pad = ATOM_RADIUS_PX + 4;
          let clampX = Math.max(zoneLeft + pad, Math.min(zoneRight - pad, px));
          let clampY = Math.max(zoneTop + pad, Math.min(zoneBottom - pad, py));
          if (slotCenters.length > 0) {
            const pulled = magnetAtomTowardSlots(clampX, clampY, slotCenters);
            clampX = pulled.x;
            clampY = pulled.y;
          }
          if (Math.abs(atom.x - clampX) < 2 && Math.abs(atom.y - clampY) < 2) return prev;
          const next = [...prev];
          next[draggingIdx] = { ...atom, x: clampX, y: clampY };
          return next;
        }

        const tryPalettePick = (): AtomInstance[] | null => {
          if (py <= rect.height - PALETTE_BOTTOM_HEIGHT) return null;
          let bestIdx = -1;
          let bestDist = 9999;
          const n = elements.length;
          const totalW = n * PALETTE_ITEM_SIZE + (n - 1) * paletteGapPick;
          const startX = (rect.width - totalW) / 2 + PALETTE_ITEM_SIZE / 2;
          const cy = rect.height - PALETTE_BOTTOM_HEIGHT / 2;
          for (let i = 0; i < n; i++) {
            const cx = startX + i * (PALETTE_ITEM_SIZE + paletteGapPick);
            const d = Math.hypot(px - cx, py - cy);
            if (d < bestDist) {
              bestDist = d;
              bestIdx = i;
            }
          }
          if (bestIdx < 0 || bestDist >= 50 || prev.some((a) => a.isDragging)) return null;
          const el = elements[bestIdx];
          const spawnSlots = getDropSlotCenters(reactionWidth, contentH, requirementSlots.length);
          const spawn =
            spawnSlots.length > 0
              ? spawnSlots[Math.min(prev.length, spawnSlots.length - 1)]
              : {
                  x: zoneLeft + (zoneRight - zoneLeft) / 2,
                  y: zoneTop + (zoneBottom - zoneTop) / 2,
                };
          return [
            ...prev,
            {
              instanceId: Math.random().toString(36).slice(2, 11),
              elementId: el.id,
              x: spawn.x,
              y: spawn.y,
              isDragging: true,
              dragStartX: spawn.x,
              dragStartY: spawn.y,
            },
          ];
        };

        const picked = tryPalettePick();
        if (picked) return picked;

        const closestIdx = prev.findIndex((a) => {
          const d = Math.hypot(a.x - px, a.y - py);
          return d < ATOM_RADIUS_PX + 28;
        });
        if (closestIdx >= 0) {
          const next = [...prev];
          const a = next[closestIdx];
          next[closestIdx] = { ...a, isDragging: true, dragStartX: a.x, dragStartY: a.y };
          return next;
        }
      } else {
        if (draggingIdx >= 0) {
          const atom = prev[draggingIdx];
          if (isInsideDropZone()) {
            const others = prev.filter((a) => a.instanceId !== atom.instanceId);
            let dropX = atom.x;
            let dropY = atom.y;
            if (slotCenters.length > 0) {
              const snapped = snapDropToNearestFreeSlot(
                atom.x,
                atom.y,
                px,
                py,
                slotCenters,
                others
              );
              dropX = snapped.x;
              dropY = snapped.y;
            } else {
              const countInZone = others.filter(
                (a) =>
                  a.x >= zoneLeft && a.x <= zoneRight && a.y >= zoneTop && a.y <= zoneBottom
              ).length;
              const rowWidth = zoneRight - zoneLeft - 80;
              const spacing = Math.min(48, rowWidth / Math.max(1, countInZone + 1));
              const startX = zoneLeft + (zoneRight - zoneLeft) / 2 - (countInZone * spacing) / 2;
              dropX = startX + countInZone * spacing;
              dropY = zoneTop + (zoneBottom - zoneTop) / 2;
            }
            return prev.map((a) =>
              a.instanceId === atom.instanceId
                ? { ...a, isDragging: false, x: dropX, y: dropY, dragStartX: undefined, dragStartY: undefined }
                : a
            );
          }
          const startX = atom.dragStartX ?? atom.x;
          const startY = atom.dragStartY ?? atom.y;
          const inZone = startX >= zoneLeft && startX <= zoneRight && startY >= zoneTop && startY <= zoneBottom;
          if (inZone) {
            return prev.map((a) =>
              a.instanceId === atom.instanceId
                ? { ...a, isDragging: false, x: startX, y: startY, dragStartX: undefined, dragStartY: undefined }
                : a
            );
          }
          return prev.filter((a) => a.instanceId !== atom.instanceId);
        }
      }
      return prev;
    });
  }, [handState, elements, activeTask, paletteGapPick]);

  const clearWorkspace = useCallback(() => {
    setAtoms([]);
    setFeedback(null);
    setAiHint(null);
    setGuidedSolution(null);
    setSuccessReaction(null);
  }, []);

  const handleCheck = useCallback(() => {
    const rect = workspaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    const reactionWidth = rect.width;
    const contentH = rect.height - PALETTE_BOTTOM_HEIGHT;
    const zoneTop = contentH - REACTION_RECT_HEIGHT - REACTION_RECT_MARGIN;
    const zoneBottom = contentH - REACTION_RECT_MARGIN;
    const zoneLeft = REACTION_RECT_MARGIN;
    const zoneRight = reactionWidth - REACTION_RECT_MARGIN;
    const insideZone = atoms.filter(
      (a) => a.x >= zoneLeft && a.x <= zoneRight && a.y >= zoneTop && a.y <= zoneBottom
    );
    const counts: Record<string, number> = {};
    insideZone.forEach((a) => { counts[a.elementId] = (counts[a.elementId] || 0) + 1; });

    if (Object.keys(counts).length === 0) {
      setFeedback({ type: 'info', message: 'Add atoms in the drop zone at the bottom first, then Check.' });
      return;
    }

    const result = validateAndComplete(counts);

    if (result.success && result.message && result.reaction) {
      setAtoms([]);
      setCompletedMolecules((prev) => [...prev, { name: result.reaction!.name, formula: result.reaction!.formula }]);
      setPendingReaction({ id: result.reaction.id, name: result.reaction.name, formula: result.reaction.formula });
      setSuccessReaction(result.reaction);
      const msg = result.solvedFast
        ? `${result.message} Solved fast!`
        : result.message;
      setFeedback({ type: 'success', message: msg });
    } else if (!result.success && result.message) {
      setFeedback({ type: 'error', message: result.message });
    }
  }, [atoms, validateAndComplete]);

  const handleReplayContinue = useCallback(() => {
    completeTaskAndUnlockNext();
    setPendingReaction(null);
    clearWorkspace();
    setFeedback(null);
    setSuccessReaction(null);
  }, [completeTaskAndUnlockNext, clearWorkspace]);

  const handleReset = useCallback(() => {
    resetProgress();
    clearWorkspace();
    setCompletedMolecules([]);
  }, [resetProgress, clearWorkspace]);

  const handleHint = useCallback(
    async (task: { id: number; reactionId?: string }) => {
      const counts: Record<string, number> = {};
      atoms.forEach((a) => { counts[a.elementId] = (counts[a.elementId] || 0) + 1; });
      const currentAtoms = Object.entries(counts).map(([id, count]) => ({
        symbol: ReactionEngine.getElement(id)?.symbol || id,
        count,
      }));
      setIsAiLoading(true);
      try {
        const hint = await getTutorHint(currentAtoms, task.id === 1 ? null : task.reactionId ?? null);
        setAiHint(String(hint ?? 'Keep experimenting!'));
      } catch {
        setAiHint('Pinch over the elements at the bottom, then drop into the circles.');
      }
      setIsAiLoading(false);
    },
    [atoms]
  );

  const handleShowSolution = useCallback((task: { formula?: string }) => {
    if (task.formula) {
      setGuidedSolution(`The formula is ${task.formula}. Build it in the reaction zone and click Check.`);
    } else {
      setGuidedSolution('Build any compound you have discovered. Use the correct formula and ratio.');
    }
  }, []);

  const allComplete = completedCount === totalTasks && totalTasks > 0;

  return (
    <div className="lumino-app-root min-h-[100dvh] min-h-[100svh] h-[100dvh] h-[100svh] lg:min-h-0 lg:h-screen flex flex-col overflow-hidden bg-[var(--lumino-bg)] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      {/* Main layout: mobile = LUMINO → Challenges → Lab; desktop = TaskPanel | header + Lab */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 min-h-[0]">
        {/* Mobile-only: brand above challenges */}
        <header className="flex shrink-0 items-center gap-3 px-3 py-2.5 border-b border-[var(--lumino-border)] bg-[var(--lumino-bg-elevated)]/80 backdrop-blur-md lg:hidden">
          <img
            src="/luminolearn-logo.png"
            alt="LUMINOLEARN"
            className="w-11 h-11 shrink-0 object-contain rounded-full bg-white/5 p-0.5 border border-[var(--lumino-border)]"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/luminolearn-logo.svg'; }}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black text-[var(--lumino-text)] tracking-tight uppercase truncate">
              LUMINOLEARN
            </h1>
            <p className="text-[10px] text-[var(--lumino-text-muted)] font-medium tracking-wider">
              Online Learning Academy
            </p>
            <p className="text-[9px] text-[var(--lumino-turquoise)] font-semibold uppercase tracking-wide mt-1 leading-snug">
              Show your hand in the lab • Pinch to grab • Drop in circles
            </p>
          </div>
        </header>

        <TaskPanel
          tasks={tasks}
          completedCount={completedCount}
          totalTasks={totalTasks}
          onHint={handleHint}
          onReset={handleReset}
          onShowSolution={handleShowSolution}
          shouldShowHint={shouldShowHint}
          shouldShowGuidedSolution={shouldShowGuidedSolution}
          feedbackMessage={feedback?.message}
          feedbackType={feedback?.type}
        />

        {/* Lab column: desktop header + (mobile task chip) + workspace + actions */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 p-2 sm:p-4 gap-2 sm:gap-4">
          {/* Desktop header */}
          <div className="hidden lg:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img
                src="/luminolearn-logo.png"
                alt="LUMINOLEARN"
                className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 object-contain rounded-full bg-white/5 p-0.5 border border-[var(--lumino-border)]"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/luminolearn-logo.svg'; }}
              />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black text-[var(--lumino-text)] tracking-tight uppercase truncate">
                  LUMINOLEARN
                </h1>
                <p className="text-[9px] sm:text-[10px] text-[var(--lumino-text-muted)] font-medium tracking-wider">
                  Online Learning Academy
                </p>
                <p className="text-[8px] sm:text-[9px] text-[var(--lumino-turquoise)]/80 uppercase tracking-wider mt-0.5 leading-snug">
                  Alchemize • Pinch atoms • Drop in zone • Check reaction
                </p>
              </div>
            </div>
            {activeTask && (
              <div className="px-3 py-2 sm:px-4 rounded-xl border border-[var(--lumino-turquoise)]/30 bg-[var(--lumino-turquoise)]/10 shrink-0 w-full sm:w-auto">
                <p className="text-[11px] sm:text-xs font-bold text-[var(--lumino-turquoise)] line-clamp-2">{activeTask.title}</p>
                {activeTask.attempts > 0 && (
                  <p className="text-[10px] text-[var(--lumino-text-muted)] mt-0.5">{activeTask.attempts} attempts</p>
                )}
              </div>
            )}
          </div>

          {activeTask && (
            <div className="lg:hidden px-3 py-2 rounded-xl border border-[var(--lumino-turquoise)]/30 bg-[var(--lumino-turquoise)]/10 shrink-0">
              <p className="text-xs font-bold text-[var(--lumino-turquoise)] line-clamp-2">{activeTask.title}</p>
              {activeTask.attempts > 0 && (
                <p className="text-[10px] text-[var(--lumino-text-muted)] mt-0.5">{activeTask.attempts} attempts</p>
              )}
            </div>
          )}

          {/* Reaction Zone - main focus */}
          <div className="flex-1 min-h-0 flex flex-col">
            <ReactionWorkspace
              atoms={atoms}
              onAtomsChange={setAtoms}
              workspaceRef={workspaceRef}
              feedback={feedback}
              successReaction={successReaction}
              onMoleculeComplete={() => {}}
              elements={elements}
              showCamera={true}
              onAddAtom={pendingReaction ? () => {} : addAtom}
              videoRef={setVideoEl}
              canvasRef={setCanvasEl}
              handState={handState}
              isReady={isReady}
              completedMolecules={completedMolecules}
              taskRequirement={activeTask?.requirement}
              taskFormula={activeTask?.formula}
              debugInteraction={debugInteraction}
            />

            {/* Bottom Action Bar */}
            <div className="flex items-stretch sm:items-center justify-center gap-2 sm:gap-4 flex-shrink-0 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:py-4 sm:pb-4 border-t border-[var(--lumino-border)] mt-1 sm:mt-2 px-1">
              <button
                type="button"
                onClick={clearWorkspace}
                disabled={!!pendingReaction}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-2.5 rounded-xl border border-[var(--lumino-border)] text-[var(--lumino-text-muted)] font-bold text-sm min-h-[44px] min-w-[44px] hover:bg-[var(--lumino-bg-elevated)] hover:text-[var(--lumino-text)] transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <RotateCcw className="w-4 h-4 shrink-0" /> <span className="hidden min-[400px]:inline">Clear</span>
              </button>
              <button
                type="button"
                onClick={handleCheck}
                disabled={!activeTask || allComplete || !!pendingReaction}
                className="flex items-center justify-center gap-2 flex-1 sm:flex-initial px-4 sm:px-8 py-3 sm:py-3.5 rounded-xl font-bold text-sm min-h-[44px] transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-[0.98]"
                style={{
                  background: activeTask
                    ? 'linear-gradient(135deg, var(--lumino-yellow), #d4c84a)'
                    : 'var(--lumino-bg-elevated)',
                  color: activeTask ? 'var(--lumino-bg)' : 'var(--lumino-text-muted)',
                  boxShadow: activeTask ? '0 4px 24px var(--lumino-yellow-glow)' : 'none',
                }}
              >
                <CheckCircle2 className="w-5 h-5" /> Check Reaction
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {pendingReaction && (
          <ReactionReplay
            reaction={pendingReaction}
            onContinue={handleReplayContinue}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aiHint && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed left-4 right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] max-h-[45vh] overflow-y-auto sm:left-auto sm:bottom-auto sm:top-20 sm:right-6 sm:max-w-xs p-5 rounded-2xl lumino-card border border-[var(--lumino-turquoise)]/40 z-50"
          >
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-[var(--lumino-turquoise)]" />
              <span className="font-bold text-sm text-[var(--lumino-text)]">Hint</span>
            </div>
            <p className="text-sm text-[var(--lumino-text-muted)] italic leading-relaxed">"{aiHint}"</p>
            <button
              type="button"
              onClick={() => setAiHint(null)}
              className="mt-4 w-full py-3 min-h-[44px] rounded-xl font-bold text-sm bg-[var(--lumino-turquoise)]/20 hover:bg-[var(--lumino-turquoise)]/30 text-[var(--lumino-turquoise)] transition-all touch-manipulation"
            >
              Got it
            </button>
          </motion.div>
        )}
        {guidedSolution && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed left-4 right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] max-h-[45vh] overflow-y-auto sm:left-auto sm:bottom-auto sm:top-20 sm:right-6 sm:max-w-xs p-5 rounded-2xl lumino-card border border-[var(--lumino-yellow)]/40 z-50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-[var(--lumino-yellow)]" />
              <span className="font-bold text-sm text-[var(--lumino-text)]">Solution</span>
            </div>
            <pre className="text-xs text-[var(--lumino-text-muted)] whitespace-pre-wrap font-medium leading-relaxed">
              {guidedSolution}
            </pre>
            <button
              type="button"
              onClick={() => setGuidedSolution(null)}
              className="mt-4 w-full py-3 min-h-[44px] rounded-xl font-bold text-sm bg-[var(--lumino-yellow)]/20 hover:bg-[var(--lumino-yellow)]/30 text-[var(--lumino-yellow)] transition-all touch-manipulation"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {allComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[100]"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 25 }}
            className="p-6 sm:p-8 rounded-2xl lumino-card border-2 border-[var(--lumino-turquoise)]/50 text-center max-w-sm max-h-[min(90dvh,90svh)] overflow-y-auto mx-4 touch-pan-y"
          >
            <Sparkles className="w-14 h-14 text-[var(--lumino-yellow)] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[var(--lumino-text)] mb-2">Lab Complete!</h2>
            <p className="text-[var(--lumino-turquoise)] font-bold text-sm mb-4">
              You mastered all {totalTasks} challenges.
            </p>
            {challengeModeUnlocked && (
              <p className="text-xs text-[var(--lumino-text-muted)] mb-4">Challenge mode unlocked!</p>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 min-h-[44px] rounded-xl font-bold text-sm bg-[var(--lumino-turquoise)] hover:bg-[var(--lumino-turquoise)]/90 text-[var(--lumino-bg)] transition-all touch-manipulation"
            >
              Start Over
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
