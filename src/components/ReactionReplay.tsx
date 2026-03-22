import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getReactionDetail } from '../data/reactionDetails';
import { MoleculeAnimation } from './MoleculeAnimation';
import { ReactionExplanation } from './ReactionExplanation';

export interface ReactionReplayProps {
  reaction: { id?: string; name: string; formula: string };
  onContinue: () => void;
  autoPlay?: boolean;
}

export function ReactionReplay({ reaction, onContinue, autoPlay = true }: ReactionReplayProps) {
  const [phase, setPhase] = useState<'intro' | 'animating' | 'explanation'>('intro');
  const [replayKey, setReplayKey] = useState(0);

  const detail = getReactionDetail(reaction.id ?? '', reaction.formula, reaction.name);

  useEffect(() => {
    if (autoPlay && phase === 'intro') {
      const t = setTimeout(() => setPhase('animating'), 800);
      return () => clearTimeout(t);
    }
  }, [autoPlay, phase]);

  const handleWatchReplay = useCallback(() => {
    setPhase('animating');
  }, []);

  const handleAnimationComplete = useCallback(() => {
    setPhase('explanation');
  }, []);

  const handleReplay = useCallback(() => {
    setReplayKey((k) => k + 1);
    setPhase('animating');
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-lg rounded-2xl lumino-card border border-[var(--lumino-turquoise)]/40 overflow-hidden"
      >
        <div className="p-4 border-b border-[var(--lumino-border)] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--lumino-turquoise)]/20">
            <CheckCircle2 className="w-6 h-6 text-[var(--lumino-turquoise)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--lumino-text)]">Correct!</h2>
            <p className="text-xs font-medium text-[var(--lumino-turquoise)]">{reaction.name} formed</p>
          </div>
        </div>

        <div className="px-4 py-3 bg-[var(--lumino-turquoise)]/5 border-b border-[var(--lumino-border)]">
          <div className="flex items-center justify-center gap-3 flex-wrap text-sm font-mono">
            {detail.reactionText.includes('→') ? (
              <>
                <span className="font-bold text-[var(--lumino-text-muted)]">{detail.reactionText.split('→')[0]?.trim()}</span>
                <ArrowRight className="w-5 h-5 text-[var(--lumino-turquoise)] flex-shrink-0" />
                <span className="font-bold text-[var(--lumino-text)]">{detail.formula}</span>
              </>
            ) : (
              <span className="font-bold text-[var(--lumino-text)]">{detail.reactionText}</span>
            )}
          </div>
          <p className="text-[10px] font-medium text-[var(--lumino-text-muted)] mt-1 text-center">{reaction.name}</p>
        </div>

        <div className="p-4 min-h-[200px] relative">
          <AnimatePresence mode="wait">
            {phase === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                <p className="text-sm text-[var(--lumino-text-muted)] text-center">
                  Watch how the atoms bond together
                </p>
                <button
                  onClick={handleWatchReplay}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[var(--lumino-bg)] text-sm transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, var(--lumino-turquoise), #5bb39e)',
                    boxShadow: '0 4px 20px var(--lumino-turquoise-glow)',
                  }}
                >
                  <Play className="w-5 h-5" />
                  Watch Reaction
                </button>
              </motion.div>
            )}

            {phase === 'animating' && (
              <motion.div
                key={`anim-${replayKey}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative flex items-center justify-center py-8 min-h-[220px]"
              >
                <MoleculeAnimation
                  reaction={{ id: reaction.id, name: reaction.name, formula: reaction.formula }}
                  onComplete={handleAnimationComplete}
                />
              </motion.div>
            )}

            {phase === 'explanation' && (
              <motion.div
                key="explanation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="py-2"
              >
                <ReactionExplanation detail={detail} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 border-t border-[var(--lumino-border)] flex flex-wrap gap-2 justify-center">
          {phase === 'explanation' && (
            <button
              onClick={handleReplay}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border border-[var(--lumino-border)] text-[var(--lumino-text-muted)] hover:bg-[var(--lumino-turquoise)]/10 hover:text-[var(--lumino-turquoise)] transition-all"
            >
              <Play className="w-4 h-4" />
              Replay Reaction
            </button>
          )}
          {(phase === 'explanation' || phase === 'animating') && (
            <button
              onClick={onContinue}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-[var(--lumino-bg)] text-sm transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, var(--lumino-yellow), #d4c84a)',
                boxShadow: '0 4px 20px var(--lumino-yellow-glow)',
              }}
            >
              <ArrowRight className="w-4 h-4" />
              Continue
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
