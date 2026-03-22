import React from 'react';
import { motion } from 'motion/react';
import type { Element } from '../types';

interface AtomPaletteProps {
  elements: Element[];
  onAddAtom: (elementId: string) => void;
  disabled?: boolean;
}

export function AtomPalette({ elements, onAddAtom, disabled }: AtomPaletteProps) {
  return (
    <div className="flex items-center justify-center gap-4 p-6 border-t border-[#a7f5ed]/50 lumino-card">
      <p className="text-sm font-bold text-[#0b2a68] uppercase tracking-wider mr-2">
        Add atoms:
      </p>
      <div className="flex items-center gap-3">
        {elements.map((el) => (
          <motion.button
            key={el.id}
            whileHover={{ scale: disabled ? 1 : 1.1 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            onClick={() => !disabled && onAddAtom(el.id)}
            disabled={disabled}
            className={`
              w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black
              border-2 transition-all shadow-lg
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl active:scale-95'}
            `}
            style={{
              backgroundColor: el.color,
              color: el.id === 'c' ? 'white' : 'inherit',
              borderColor: disabled ? '#e2e8f0' : `${el.color}99`,
              boxShadow: disabled ? 'none' : `0 4px 14px ${el.color}44`,
            }}
            title={`${el.name} (${el.symbol})`}
          >
            {el.symbol}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
