import React from 'react';
import { motion } from 'motion/react';

interface MoleculeAnimationProps {
  reaction: { id?: string; name: string; formula: string };
  onComplete?: () => void;
}

/**
 * 2D molecule layout: reactant start positions → final bonded positions.
 * Atoms slide toward each other, bond lines appear, final product snaps with glow.
 */
const LAYOUTS: Record<string, {
  startPositions: [number, number][];
  endPositions: [number, number][];
  labels: string[];
  bonds?: { from: number; to: number; style?: string }[];
}> = {
  hydrogen: {
    startPositions: [[20, 70], [200, 70]],
    endPositions: [[70, 70], [150, 70]],
    labels: ['H', 'H'],
    bonds: [{ from: 0, to: 1 }],
  },
  oxygen: {
    startPositions: [[20, 70], [200, 70]],
    endPositions: [[70, 70], [150, 70]],
    labels: ['O', 'O'],
    bonds: [{ from: 0, to: 1 }],
  },
  water: {
    startPositions: [[10, 100], [110, 20], [210, 100]],
    endPositions: [[20, 70], [110, 30], [200, 70]],
    labels: ['H', 'O', 'H'],
    bonds: [{ from: 0, to: 1 }, { from: 1, to: 2 }],
  },
  salt: {
    startPositions: [[30, 70], [190, 70]],
    endPositions: [[70, 70], [150, 70]],
    labels: ['Na', 'Cl'],
    bonds: [{ from: 0, to: 1, style: 'ionic' }],
  },
  methane: {
    startPositions: [[110, 30], [30, 120], [190, 120], [50, 20], [170, 20]],
    endPositions: [[110, 60], [40, 120], [180, 120], [60, 20], [160, 20]],
    labels: ['C', 'H', 'H', 'H', 'H'],
    bonds: [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 0, to: 3 }, { from: 0, to: 4 }],
  },
  carbon_dioxide: {
    startPositions: [[20, 70], [110, 70], [200, 70]],
    endPositions: [[40, 70], [110, 70], [180, 70]],
    labels: ['O', 'C', 'O'],
    bonds: [{ from: 0, to: 1 }, { from: 1, to: 2 }],
  },
  generic: {
    startPositions: [[110, 70]],
    endPositions: [[110, 70]],
    labels: ['?'],
  },
};

function getColors(labels: string[]): string[] {
  const colors: Record<string, string> = {
    H: '#E2E8F0',
    O: '#EF4444',
    Na: '#FBBF24',
    Cl: '#10B981',
    C: '#1F2937',
    '?': '#94a3b8',
  };
  return labels.map((l) => colors[l] ?? '#94a3b8');
}

function getBondLineStyle(bond: { from: number; to: number; style?: string }, endPositions: [number, number][]) {
  const [x1, y1] = endPositions[bond.from];
  const [x2, y2] = endPositions[bond.to];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const atomRadius = 28;
  return {
    left: x1 + atomRadius,
    top: y1 + atomRadius - 1,
    width: len,
    transform: `rotate(${angle}deg)`,
    transformOrigin: 'left center',
  };
}

export function MoleculeAnimation({ reaction, onComplete }: MoleculeAnimationProps) {
  const layoutKey = (reaction.id && LAYOUTS[reaction.id] ? reaction.id : 'generic') as keyof typeof LAYOUTS;
  const layout = LAYOUTS[layoutKey] ?? LAYOUTS.generic;
  const colors = getColors(layout.labels);
  const bonds = layout.bonds ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center z-30"
      style={{
        background: 'radial-gradient(circle, rgba(64,224,208,0.2) 0%, transparent 70%)',
      }}
    >
      <div className="relative" style={{ width: 220, height: 180 }}>
        {/* Bond lines: appear after atoms slide together */}
        {bonds.map((bond, k) => {
          const style = getBondLineStyle(bond, layout.endPositions);
          return (
            <motion.div
              key={k}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5 + k * 0.08, duration: 0.35 }}
              className={`absolute h-0.5 origin-left ${bond.style === 'ionic' ? 'bg-amber-400/90' : 'bg-white/70'}`}
              style={style}
            />
          );
        })}

        {/* Atoms: slide from reactant positions into final bonded structure */}
        {layout.startPositions.map((startPos, i) => {
          const endPos = layout.endPositions[i];
          return (
            <motion.div
              key={i}
              initial={{
                opacity: 1,
                x: startPos[0],
                y: startPos[1],
                scale: 0.9,
              }}
              animate={{
                opacity: 1,
                x: endPos[0],
                y: endPos[1],
                scale: 1,
                boxShadow: [
                  `0 0 0px ${colors[i]}44`,
                  `0 0 0px ${colors[i]}44`,
                  `0 0 25px ${colors[i]}aa`,
                  `0 0 12px ${colors[i]}88`,
                ],
              }}
              transition={{
                x: { type: 'spring', stiffness: 200, damping: 22, delay: i * 0.06 },
                y: { type: 'spring', stiffness: 200, damping: 22, delay: i * 0.06 },
                scale: { duration: 0.3, delay: i * 0.06 },
                boxShadow: {
                  duration: 0.6,
                  delay: 0.45 + i * 0.05,
                  times: [0, 0.3, 0.7, 1],
                },
              }}
              onAnimationComplete={i === layout.startPositions.length - 1 ? onComplete : undefined}
              className="absolute w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black border-2 border-white/50"
              style={{
                backgroundColor: colors[i],
                color: layout.labels[i] === 'C' ? 'white' : 'inherit',
              }}
            >
              {layout.labels[i]}
            </motion.div>
          );
        })}
      </div>

      {/* Success glow and pulse after formation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.75, duration: 0.4 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(64,224,208,0.2) 0%, transparent 60%)',
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: [0, 0.6, 0], scale: [1, 1.15, 1.3] }}
        transition={{ delay: 0.9, duration: 0.8 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(64,224,208,0.3) 0%, transparent 50%)',
        }}
      />
    </motion.div>
  );
}
