/**
 * Rule-based misconception detection.
 * Returns specific feedback explaining WHY the combination is incorrect.
 */

import { ReactionEngine } from '../engine';
import type { TaskRequirement } from '../data/tasks';

export type MisconceptionType =
  | 'empty'
  | 'too_many_atoms'
  | 'too_few_atoms'
  | 'wrong_element'
  | 'missing_required'
  | 'wrong_ratio'
  | 'unstable'
  | 'wrong_combination';

export interface MisconceptionResult {
  type: MisconceptionType;
  message: string;
  suggestion?: string;
}

const ELEMENT_NAMES: Record<string, string> = {
  h: 'Hydrogen',
  o: 'Oxygen',
  na: 'Sodium',
  cl: 'Chlorine',
  c: 'Carbon',
};

function getElementName(id: string): string {
  return ELEMENT_NAMES[id] ?? id;
}

function totalCount(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

export function detectMisconception(
  counts: Record<string, number>,
  requirement: TaskRequirement,
  taskId: number
): MisconceptionResult | null {
  const activeIds = Object.keys(counts).filter((id) => counts[id] > 0);
  const total = totalCount(counts);

  // Empty
  if (activeIds.length === 0) {
    return {
      type: 'empty',
      message: 'The reaction zone is empty.',
      suggestion: 'Add atoms from the palette below to begin.',
    };
  }

  // Task-specific validation
  if (Object.keys(requirement).length > 0) {
    const reqTotal = totalCount(requirement);
    const reqIds = Object.keys(requirement);

    // Too many atoms: more total than required
    if (total > reqTotal) {
      const extra = total - reqTotal;
      return {
        type: 'too_many_atoms',
        message: `You have ${extra} extra atom${extra > 1 ? 's' : ''} in the reaction zone.`,
        suggestion: 'Remove atoms until you have exactly the right number for this compound.',
      };
    }

    // Wrong elements: different set of elements
    const hasWrongElement = activeIds.some((id) => !reqIds.includes(id));
    const missingElement = reqIds.find((id) => (counts[id] ?? 0) === 0);

    if (hasWrongElement) {
      const wrong = activeIds.filter((id) => !reqIds.includes(id));
      const names = wrong.map(getElementName).join(' and ');
      return {
        type: 'wrong_element',
        message: `This compound does not contain ${names}.`,
        suggestion: 'Clear the zone and use only the elements required for this task.',
      };
    }

    if (missingElement) {
      return {
        type: 'missing_required',
        message: `You are missing ${getElementName(missingElement)}.`,
        suggestion: `Add ${requirement[missingElement]} ${getElementName(missingElement)} atom${requirement[missingElement] > 1 ? 's' : ''} to complete the compound.`,
      };
    }

    // Wrong ratio: right elements, wrong counts
    const wrongRatio = reqIds.find((id) => (counts[id] ?? 0) !== requirement[id]);
    if (wrongRatio) {
      const have = counts[wrongRatio] ?? 0;
      const need = requirement[wrongRatio];
      return {
        type: 'wrong_ratio',
        message: `You have ${have} ${getElementName(wrongRatio)} atom${have !== 1 ? 's' : ''}, but this compound needs exactly ${need}.`,
        suggestion: need > have ? 'Add more atoms.' : 'Remove extra atoms.',
      };
    }
  }

  // For "any" tasks, use ReactionEngine
  if (Object.keys(requirement).length === 0) {
    const result = ReactionEngine.validateCombination(counts);
    if (!result.success && result.feedback) {
      if (result.errorType === 'wrong_ratio') {
        return {
          type: 'wrong_ratio',
          message: result.feedback,
          suggestion: 'Adjust the number of each atom to match the correct stoichiometric ratio.',
        };
      }
      if (result.errorType === 'unstable') {
        return {
          type: 'unstable',
          message: result.feedback,
          suggestion: 'Add or remove atoms so all valence electrons are paired.',
        };
      }
      if (result.errorType === 'wrong_elements') {
        return {
          type: 'wrong_combination',
          message: result.feedback,
          suggestion: 'Try combinations you have discovered: hydrogen, oxygen, water, salt, methane, or carbon dioxide.',
        };
      }
      return {
        type: 'wrong_combination',
        message: result.feedback,
      };
    }
  }

  return null;
}
