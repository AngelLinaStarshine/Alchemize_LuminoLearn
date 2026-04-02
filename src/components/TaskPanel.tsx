import React from 'react';
import { Target, RotateCcw, Lightbulb, ChevronRight } from 'lucide-react';
import { TaskItem } from './TaskItem';
import type { LearningTask } from '../data/tasks';

interface TaskPanelProps {
  tasks: LearningTask[];
  completedCount: number;
  totalTasks: number;
  onHint?: (task: LearningTask) => void;
  onReset?: () => void;
  onShowSolution?: (task: LearningTask) => void;
  shouldShowHint?: boolean;
  shouldShowGuidedSolution?: boolean;
  feedbackMessage?: string | null;
  feedbackType?: 'success' | 'error' | 'info';
}

export function TaskPanel({
  tasks,
  completedCount,
  totalTasks,
  onHint,
  onReset,
  onShowSolution,
  shouldShowHint,
  shouldShowGuidedSolution,
  feedbackMessage,
  feedbackType,
}: TaskPanelProps) {
  const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  return (
    <div className="w-full max-h-[min(42svh,380px)] md:max-h-[min(44vh,400px)] lg:max-h-none lg:w-80 lg:h-full shrink-0 flex flex-col lumino-card border-b lg:border-b-0 lg:border-r border-[var(--lumino-border)] overflow-hidden touch-pan-y">
      {/* Header */}
      <div className="p-4 border-b border-[var(--lumino-border)] flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--lumino-turquoise)]/20 border border-[var(--lumino-turquoise)]/40">
              <Target className="w-5 h-5 text-[var(--lumino-turquoise)]" />
            </div>
            <div>
              <h2 className="font-bold text-[var(--lumino-text)] text-base tracking-tight">Challenges</h2>
              <p className="text-xs text-[var(--lumino-text-muted)] mt-0.5">
                {completedCount} of {totalTasks} complete
              </p>
            </div>
          </div>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="p-2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-[var(--lumino-text-muted)] hover:text-[var(--lumino-turquoise)] hover:bg-[var(--lumino-turquoise)]/10 transition-all touch-manipulation"
              title="Reset progress"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--lumino-text-muted)] font-medium">Progress</span>
            <span className="text-[var(--lumino-turquoise)] font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-[var(--lumino-bg-elevated)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--lumino-turquoise)] to-[var(--lumino-yellow)] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedbackMessage && (
        <div
          className={`mx-4 mt-3 p-3 rounded-xl border flex-shrink-0 text-sm ${
            feedbackType === 'success'
              ? 'bg-[var(--lumino-turquoise)]/10 border-[var(--lumino-turquoise)]/40 text-[var(--lumino-turquoise)]'
              : feedbackType === 'error'
                ? 'bg-[var(--lumino-error)]/10 border-[var(--lumino-error)]/40 text-[var(--lumino-error)]'
                : 'bg-[var(--lumino-yellow)]/10 border-[var(--lumino-yellow)]/40 text-[var(--lumino-yellow)]'
          }`}
        >
          <p className="font-medium leading-relaxed">{feedbackMessage}</p>
        </div>
      )}

      {/* Task list - Challenge + Think First */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-3 sm:p-4 space-y-3 sm:space-y-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {tasks.map((task, index) => (
          <TaskItem
            key={task.id}
            task={task}
            taskNumber={index + 1}
            onHint={onHint}
            shouldShowHint={shouldShowHint}
            shouldShowGuidedSolution={shouldShowGuidedSolution}
            onShowSolution={onShowSolution}
          />
        ))}
      </div>
    </div>
  );
}
