import { useState, useCallback, useMemo, useEffect } from 'react';
import { ReactionEngine } from '../engine';
import { detectMisconception } from '../services/misconceptionDetection';
import { TASKS, type LearningTask, type TaskRequirement } from '../data/tasks';

const FAST_SOLVE_THRESHOLD_SEC = 30;

function createInitialTask(t: (typeof TASKS)[0], i: number): LearningTask {
  return {
    ...t,
    status: i === 0 ? 'active' : 'locked',
    attempts: 0,
    timeSpentSeconds: 0,
    startedAt: i === 0 ? Date.now() : undefined,
  };
}

const INITIAL_TASKS: LearningTask[] = TASKS.map((t, i) => createInitialTask(t, i));

function countsMatchRequirement(
  counts: Record<string, number>,
  requirement: TaskRequirement
): boolean {
  const reqKeys = Object.keys(requirement);
  if (reqKeys.length === 0) return false;
  const countKeys = Object.keys(counts).filter((id) => counts[id] > 0);
  if (countKeys.length !== reqKeys.length) return false;
  return reqKeys.every((id) => counts[id] === requirement[id]);
}

export function useTaskProgress() {
  const [tasks, setTasks] = useState<LearningTask[]>(INITIAL_TASKS);
  const [challengeModeUnlocked, setChallengeModeUnlocked] = useState(false);

  const activeTaskIndex = useMemo(
    () => tasks.findIndex((t) => t.status === 'active'),
    [tasks]
  );
  const activeTask = activeTaskIndex >= 0 ? tasks[activeTaskIndex] : null;
  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === 'completed').length,
    [tasks]
  );

  // Track time on active task
  useEffect(() => {
    if (!activeTask?.startedAt) return;
    const interval = setInterval(() => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeTask.id && t.status === 'active'
            ? {
                ...t,
                timeSpentSeconds: Math.floor((Date.now() - (t.startedAt ?? Date.now())) / 1000),
              }
            : t
        )
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTask?.id, activeTask?.startedAt]);

  const validateAndComplete = useCallback(
    (
      counts: Record<string, number>
    ): {
      success: boolean;
      message?: string;
      feedback?: string;
      reaction?: { name: string; formula: string };
      solvedFast?: boolean;
    } => {
      if (!activeTask) {
        return { success: false, message: 'No active task.' };
      }

      const requirement = activeTask.requirement;

      // Misconception detection (rule-based, specific feedback)
      const misconception = detectMisconception(counts, requirement, activeTask.id);
      if (misconception) {
        const fullMessage = misconception.suggestion
          ? `${misconception.message} ${misconception.suggestion}`
          : misconception.message;

        // Increment attempts on failure
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeTask.id ? { ...t, attempts: t.attempts + 1 } : t
          )
        );

        return { success: false, message: fullMessage, feedback: fullMessage };
      }

      // Success path
      const timeSpent = activeTask.timeSpentSeconds || 1;
      const solvedFast = timeSpent < FAST_SOLVE_THRESHOLD_SEC;

      if (solvedFast && !challengeModeUnlocked) {
        setChallengeModeUnlocked(true);
      }

      const completeTask = (message: string, reaction?: { id?: string; name: string; formula: string }, deferComplete = false) => {
        if (!deferComplete) {
          setTasks((prev) => {
            const next = [...prev];
            const idx = next.findIndex((t) => t.id === activeTask.id);
            if (idx < 0) return prev;
            next[idx] = { ...next[idx], status: 'completed' };
            const nextIdx = idx + 1;
            if (nextIdx < next.length && next[nextIdx].status === 'locked') {
              next[nextIdx] = {
                ...next[nextIdx],
                status: 'active',
                startedAt: Date.now(),
              };
            }
            return next;
          });
        }
        return { success: true, message, reaction, solvedFast };
      };

      // Tasks 1–6: specific reaction (hydrogen, oxygen, water, salt, methane, CO2)
      if (activeTask.reactionId && activeTask.reactionId !== 'any') {
        const result = ReactionEngine.validateCombination(counts);
        if (result.success && result.reaction?.id === activeTask.reactionId) {
          return completeTask(`${result.reaction.name} created!`, {
            id: result.reaction.id,
            name: result.reaction.name,
            formula: result.reaction.formula,
          }, true);
        }
      }

      // Tasks 7–10: any valid compound
      if (activeTask.reactionId === 'any') {
        const result = ReactionEngine.validateCombination(counts);
        if (result.success && result.reaction) {
          return completeTask(`${result.reaction.name} created!`, {
            id: result.reaction.id,
            name: result.reaction.name,
            formula: result.reaction.formula,
          }, true);
        }
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeTask.id ? { ...t, attempts: t.attempts + 1 } : t
        )
      );
      return { success: false, message: 'Try again. Use the clues to predict the formula before building.' };
    },
    [activeTask, challengeModeUnlocked]
  );

  const shouldShowHint = useMemo(() => {
    return activeTask ? activeTask.attempts > 2 : false;
  }, [activeTask]);

  const shouldShowGuidedSolution = useMemo(() => {
    return activeTask ? activeTask.attempts > 4 : false;
  }, [activeTask]);

  const resetProgress = useCallback(() => {
    setTasks(INITIAL_TASKS);
    setChallengeModeUnlocked(false);
  }, []);

  const completeTaskAndUnlockNext = useCallback(() => {
    if (!activeTask) return;
    setTasks((prev) => {
      const next = [...prev];
      const idx = next.findIndex((t) => t.id === activeTask.id);
      if (idx < 0) return prev;
      next[idx] = { ...next[idx], status: 'completed' };
      const nextIdx = idx + 1;
      if (nextIdx < next.length && next[nextIdx].status === 'locked') {
        next[nextIdx] = {
          ...next[nextIdx],
          status: 'active',
          startedAt: Date.now(),
        };
      }
      return next;
    });
  }, [activeTask]);

  return {
    tasks,
    activeTask,
    activeTaskIndex,
    completedCount,
    totalTasks: TASKS.length,
    validateAndComplete,
    completeTaskAndUnlockNext,
    resetProgress,
    shouldShowHint,
    shouldShowGuidedSolution,
    challengeModeUnlocked,
  };
}
