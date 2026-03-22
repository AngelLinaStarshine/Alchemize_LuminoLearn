export interface Element {
  id: string;
  symbol: string;
  name: string;
  category: string;
  color: string;
  valency: number;
  atomicNumber: number;
  bondingBehavior: string;
  description: string;
}

export interface ReactionStep {
  step: number;
  instruction: string;
  elementSymbol?: string;
  count?: number;
}

export interface Reaction {
  id: string;
  name: string;
  formula: string;
  reactants: Record<string, number>;
  equation: string;
  explanation: string;
  visualEffect: string;
  macroscopicView: string;
  particleViewDesc: string;
  steps?: ReactionStep[];
}

export interface GuidedCase {
  id: string;
  title: string;
  scenario: string;
  targetReactionId: string;
  availableElementIds: string[];
  objectives: string[];
  reflectionQuestions: string[];
}

export interface AtomInstance {
  instanceId: string;
  elementId: string;
  x: number;
  y: number;
  isDragging: boolean;
  dragStartX?: number;
  dragStartY?: number;
}

export type LabMode = 'welcome' | 'guided' | 'free' | 'results';

export interface Progress {
  attempts: number;
  successes: number;
  hintsUsed: number;
  mastery: Record<string, number>;
}
