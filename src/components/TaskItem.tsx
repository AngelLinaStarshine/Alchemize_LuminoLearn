import React from 'react';
import { motion } from 'motion/react';
import { Lock, Circle, CheckCircle2, HelpCircle, Target, Lightbulb } from 'lucide-react';
import type { LearningTask } from '../data/tasks';
import { clsx } from 'clsx';

interface TaskItemProps {
  task: LearningTask;
  taskNumber: number;
  onHint?: (task: LearningTask) => void;
  shouldShowHint?: boolean;
  shouldShowGuidedSolution?: boolean;
  onShowSolution?: (task: LearningTask) => void;
}

export function TaskItem({
  task,
  taskNumber,
  onHint,
  shouldShowHint,
  shouldShowGuidedSolution,
  onShowSolution,
}: TaskItemProps) {
  const isLocked = task.status === 'locked';
  const isActive = task.status === 'active';
  const isCompleted = task.status === 'completed';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={clsx(
        'rounded-xl border p-4 transition-all',
        isCompleted && 'border-[var(--lumino-turquoise)]/30 bg-[var(--lumino-turquoise)]/5',
        isActive && 'border-[var(--lumino-turquoise)]/60 bg-[var(--lumino-turquoise)]/10 shadow-[0_0_30px_var(--lumino-turquoise-glow)]',
        isLocked && 'border-[var(--lumino-border)] bg-[var(--lumino-bg-elevated)]/50 opacity-70'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isLocked && (
            <div className="w-9 h-9 rounded-full bg-[var(--lumino-bg-elevated)] flex items-center justify-center border border-[var(--lumino-border)]">
              <Lock className="w-4 h-4 text-[var(--lumino-text-muted)]" />
            </div>
          )}
          {isActive && (
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-9 h-9 rounded-full bg-[var(--lumino-turquoise)] flex items-center justify-center shadow-[0_0_20px_var(--lumino-turquoise-glow)]"
            >
              <Circle className="w-4 h-4 text-[var(--lumino-bg)] fill-[var(--lumino-bg)]" />
            </motion.div>
          )}
          {isCompleted && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="w-9 h-9 rounded-full bg-[var(--lumino-success)] flex items-center justify-center"
            >
              <CheckCircle2 className="w-5 h-5 text-white" />
            </motion.div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={clsx(
                'text-[10px] font-bold uppercase tracking-wider',
                isLocked && 'text-[var(--lumino-text-muted)]',
                isActive && 'text-[var(--lumino-turquoise)]',
                isCompleted && 'text-[var(--lumino-success)]'
              )}
            >
              Challenge {taskNumber}
            </span>
            {isActive && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--lumino-turquoise)]/20 text-[var(--lumino-turquoise)] text-[10px] font-bold uppercase tracking-wider">
                Active
              </span>
            )}
            {isActive && task.attempts > 0 && (
              <span className="text-[10px] font-medium text-[var(--lumino-text-muted)]">
                {task.attempts} attempt{task.attempts !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <h4
            className={clsx(
              'font-bold mt-1',
              isLocked && 'text-[var(--lumino-text-muted)]',
              isActive && 'text-[var(--lumino-text)] text-base',
              isCompleted && 'text-[var(--lumino-success)]'
            )}
          >
            {task.title}
          </h4>

          {/* Challenge */}
          {isActive && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--lumino-turquoise)] mb-1.5 flex items-center gap-1.5">
                  <Target className="w-3 h-3" />
                  Challenge
                </p>
                <p className="text-sm text-[var(--lumino-text)]/90 leading-relaxed">
                  {task.challengePrompt}
                </p>
              </div>
              {task.thinkFirst && (
                <div className="pt-3 border-t border-[var(--lumino-border)]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--lumino-yellow)] mb-1.5 flex items-center gap-1.5">
                    <Lightbulb className="w-3 h-3" />
                    Think First
                  </p>
                  <p className="text-sm text-[var(--lumino-text-muted)] italic leading-relaxed">
                    {task.thinkFirst}
                  </p>
                </div>
              )}
            </div>
          )}
          {(isLocked || isCompleted) && (
            <p
              className={clsx(
                'text-sm mt-1 leading-relaxed',
                isLocked && 'text-[var(--lumino-text-muted)]',
                isCompleted && 'text-[var(--lumino-success)]/80'
              )}
            >
              {task.challengePrompt}
            </p>
          )}

          {/* Hint & Solution */}
          {isActive && (shouldShowHint || shouldShowGuidedSolution) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {shouldShowHint && onHint && (
                <button
                  type="button"
                  onClick={() => onHint(task)}
                  className="flex items-center gap-2 text-xs font-bold text-[var(--lumino-text)] bg-[var(--lumino-turquoise)]/20 hover:bg-[var(--lumino-turquoise)]/30 border border-[var(--lumino-turquoise)]/40 transition-all rounded-lg px-3 py-2 min-h-[40px] touch-manipulation"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Show Hint
                </button>
              )}
              {shouldShowGuidedSolution && onShowSolution && (
                <button
                  type="button"
                  onClick={() => onShowSolution(task)}
                  className="flex items-center gap-2 text-xs font-bold text-[var(--lumino-yellow)] bg-[var(--lumino-yellow)]/20 hover:bg-[var(--lumino-yellow)]/30 border border-[var(--lumino-yellow)]/40 transition-all rounded-lg px-3 py-2 min-h-[40px] touch-manipulation"
                >
                  <Target className="w-3.5 h-3.5" />
                  Show Solution
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
