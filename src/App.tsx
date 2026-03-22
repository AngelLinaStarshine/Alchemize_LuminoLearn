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
import { getTutorHint } from './services/geminiService';

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

  const { handState, isReady } = useHandTracking(videoEl, canvasEl);

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

  const REACTION_RECT_HEIGHT = 140;
  const REACTION_RECT_MARGIN = 16;
  const PALETTE_ZONE_TOP = 140;
  const PALETTE_WIDTH = 96;

  const addAtom = useCallback((elementId: string, x?: number, y?: number) => {
    const element = ReactionEngine.getElement(elementId);
    if (!element) return;

    const rect = workspaceRef.current?.getBoundingClientRect();
    const w = (rect?.width ?? 500) - 96;
    const h = rect?.height ?? 300;
    const zoneTop = h - REACTION_RECT_HEIGHT - REACTION_RECT_MARGIN;
    const zoneBottom = h - REACTION_RECT_MARGIN;
    const zoneCenterX = w / 2;
    const zoneCenterY = zoneTop + (zoneBottom - zoneTop) / 2;

    setAtoms((prev) => {
      const rowSpacing = 48;
      const startX = zoneCenterX - (prev.length * rowSpacing) / 2;
      const newAtom: AtomInstance = {
        instanceId: Math.random().toString(36).slice(2, 11),
        elementId,
        x: x ?? startX + prev.length * rowSpacing,
        y: y ?? zoneCenterY,
        isDragging: false,
      };
      return [...prev, newAtom];
    });
  }, []);

  useEffect(() => {
    if (!handState || !workspaceRef.current || !activeTask) return;

    const { x, y, isPinching, isGrabbing } = handState;
    const isHolding = isPinching || isGrabbing;
    const rect = workspaceRef.current.getBoundingClientRect();
    const px = x * rect.width;
    const py = y * rect.height;
    const reactionWidth = rect.width - PALETTE_WIDTH;
    const zoneTop = rect.height - REACTION_RECT_HEIGHT - REACTION_RECT_MARGIN;
    const zoneBottom = rect.height - REACTION_RECT_MARGIN;
    const zoneLeft = REACTION_RECT_MARGIN;
    const zoneRight = reactionWidth - REACTION_RECT_MARGIN;

    const isInsideDropZone = () => {
      return px >= zoneLeft && px <= zoneRight && py >= zoneTop && py <= zoneBottom;
    };

    setAtoms((prev) => {
      const draggingIdx = prev.findIndex((a) => a.isDragging);

      if (isHolding) {
        if (draggingIdx >= 0) {
          const atom = prev[draggingIdx];
          const clampX = Math.max(zoneLeft + 20, Math.min(zoneRight - 20, px));
          const clampY = Math.max(zoneTop + 20, Math.min(zoneBottom - 20, py));
          if (Math.abs(atom.x - clampX) < 3 && Math.abs(atom.y - clampY) < 3) return prev;
          const next = [...prev];
          next[draggingIdx] = { ...atom, x: clampX, y: clampY };
          return next;
        }

        if (px > rect.width - PALETTE_WIDTH) {
          const paletteCenterX = rect.width - PALETTE_WIDTH / 2;
          const itemSize = 56;
          const itemGap = 40;
          const topOffset = 100;
          let bestIdx = -1;
          let bestDist = 9999;
          for (let i = 0; i < elements.length; i++) {
            const cy = topOffset + i * (itemSize + itemGap) + itemSize / 2;
            const d = Math.hypot(px - paletteCenterX, py - cy);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
          }
          if (bestIdx >= 0 && bestDist < 42 && !prev.some((a) => a.isDragging)) {
            const el = elements[bestIdx];
            const centerX = zoneLeft + (zoneRight - zoneLeft) / 2;
            const totalCount = prev.length + 1;
            const startX = centerX - (totalCount * 48) / 2 + prev.length * 48;
            const startY = zoneTop + (zoneBottom - zoneTop) / 2;
            return [
              ...prev,
              {
                instanceId: Math.random().toString(36).slice(2, 11),
                elementId: el.id,
                x: startX,
                y: startY,
                isDragging: true,
                dragStartX: startX,
                dragStartY: startY,
              },
            ];
          }
        }

        const closestIdx = prev.findIndex((a) => {
          const d = Math.hypot(a.x - px, a.y - py);
          return d < 65;
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
            const countInZone = prev.filter((a) => a.instanceId !== atom.instanceId).length;
            const rowWidth = zoneRight - zoneLeft - 80;
            const spacing = Math.min(48, rowWidth / Math.max(1, countInZone + 1));
            const startX = zoneLeft + (zoneRight - zoneLeft) / 2 - (countInZone * spacing) / 2;
            const dropX = startX + countInZone * spacing;
            const dropY = zoneTop + (zoneBottom - zoneTop) / 2;
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
  }, [handState, elements, activeTask]);

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
    const reactionWidth = rect.width - PALETTE_WIDTH;
    const zoneTop = rect.height - REACTION_RECT_HEIGHT - REACTION_RECT_MARGIN;
    const zoneBottom = rect.height - REACTION_RECT_MARGIN;
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
        setAiHint('Pinch over the elements on the right, drop in the circle.');
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
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--lumino-bg)]">
      {/* Main layout: Task | Workspace | (palette inside workspace) */}
      <div className="flex flex-1 min-h-0">
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

        {/* Center: Reaction zone (top) + Action bar (bottom) */}
        <div className="flex-1 flex flex-col min-w-0 p-4 gap-4">
          {/* Compact header */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <img
                src="/luminolearn-logo.png"
                alt="LUMINOLEARN"
                className="w-12 h-12 object-contain rounded-full bg-white/5 p-0.5 border border-[var(--lumino-border)]"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/luminolearn-logo.svg'; }}
              />
              <div>
                <h1 className="text-lg font-black text-[var(--lumino-text)] tracking-tight uppercase">
                  LUMINOLEARN
                </h1>
                <p className="text-[10px] text-[var(--lumino-text-muted)] font-medium tracking-wider">
                  Online Learning Academy
                </p>
                <p className="text-[9px] text-[var(--lumino-turquoise)]/80 uppercase tracking-wider mt-0.5">
                  Alchemize • Pinch atoms • Drop in circle • Check reaction
                </p>
              </div>
            </div>
            {activeTask && (
              <div className="px-4 py-2 rounded-xl border border-[var(--lumino-turquoise)]/30 bg-[var(--lumino-turquoise)]/10">
                <p className="text-xs font-bold text-[var(--lumino-turquoise)]">{activeTask.title}</p>
                {activeTask.attempts > 0 && (
                  <p className="text-[10px] text-[var(--lumino-text-muted)] mt-0.5">{activeTask.attempts} attempts</p>
                )}
              </div>
            )}
          </div>

          {/* Reaction Zone - main focus (top) */}
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
            />

            {/* Bottom Action Bar */}
            <div className="flex items-center justify-center gap-4 flex-shrink-0 py-4 border-t border-[var(--lumino-border)] mt-2">
              <button
                onClick={clearWorkspace}
                disabled={!!pendingReaction}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--lumino-border)] text-[var(--lumino-text-muted)] font-bold text-sm hover:bg-[var(--lumino-bg-elevated)] hover:text-[var(--lumino-text)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" /> Clear
              </button>
              <button
                onClick={handleCheck}
                disabled={!activeTask || allComplete || !!pendingReaction}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="fixed top-20 right-6 max-w-xs p-5 rounded-2xl lumino-card border border-[var(--lumino-turquoise)]/40 z-50"
          >
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-[var(--lumino-turquoise)]" />
              <span className="font-bold text-sm text-[var(--lumino-text)]">Hint</span>
            </div>
            <p className="text-sm text-[var(--lumino-text-muted)] italic leading-relaxed">"{aiHint}"</p>
            <button
              onClick={() => setAiHint(null)}
              className="mt-4 w-full py-2.5 rounded-xl font-bold text-sm bg-[var(--lumino-turquoise)]/20 hover:bg-[var(--lumino-turquoise)]/30 text-[var(--lumino-turquoise)] transition-all"
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
            className="fixed top-20 right-6 max-w-xs p-5 rounded-2xl lumino-card border border-[var(--lumino-yellow)]/40 z-50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-[var(--lumino-yellow)]" />
              <span className="font-bold text-sm text-[var(--lumino-text)]">Solution</span>
            </div>
            <pre className="text-xs text-[var(--lumino-text-muted)] whitespace-pre-wrap font-medium leading-relaxed">
              {guidedSolution}
            </pre>
            <button
              onClick={() => setGuidedSolution(null)}
              className="mt-4 w-full py-2.5 rounded-xl font-bold text-sm bg-[var(--lumino-yellow)]/20 hover:bg-[var(--lumino-yellow)]/30 text-[var(--lumino-yellow)] transition-all"
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
            className="p-8 rounded-2xl lumino-card border-2 border-[var(--lumino-turquoise)]/50 text-center max-w-sm"
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
              onClick={handleReset}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-[var(--lumino-turquoise)] hover:bg-[var(--lumino-turquoise)]/90 text-[var(--lumino-bg)] transition-all"
            >
              Start Over
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
