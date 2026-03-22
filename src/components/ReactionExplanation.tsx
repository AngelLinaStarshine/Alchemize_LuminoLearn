import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle } from 'lucide-react';
import type { ReactionDetail } from '../data/reactionDetails';

interface ReactionExplanationProps {
  detail: ReactionDetail;
}

export function ReactionExplanation({ detail }: ReactionExplanationProps) {
  const [showWhy, setShowWhy] = useState(false);

  return (
    <div className="space-y-3">
      <div className="p-4 rounded-xl bg-[var(--lumino-turquoise)]/10 border border-[var(--lumino-turquoise)]/30">
        <p className="text-sm font-medium text-[var(--lumino-text)]/90 leading-relaxed">
          {detail.explanation}
        </p>
      </div>
      {detail.whyConcept && (
        <div>
          <button
            onClick={() => setShowWhy(!showWhy)}
            className="flex items-center gap-2 text-xs font-bold text-[var(--lumino-turquoise)] hover:text-[var(--lumino-text)] transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            {showWhy ? 'Hide Why?' : 'Why?'}
          </button>
          <AnimatePresence>
            {showWhy && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="text-xs text-[var(--lumino-text-muted)] mt-2 italic leading-relaxed pl-6">
                  {detail.whyConcept}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
