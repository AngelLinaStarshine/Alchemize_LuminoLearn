/**
 * Expand a stoichiometric requirement into an ordered list of element ids
 * (one entry per atom to place). Uses task formula when it matches the requirement.
 */

import type { TaskRequirement } from '../data/tasks';
import type { Element } from '../types';

function requirementCountsMatch(slots: string[], requirement: TaskRequirement): boolean {
  const tallies: Record<string, number> = {};
  for (const id of slots) tallies[id] = (tallies[id] || 0) + 1;
  const keys = new Set([...Object.keys(tallies), ...Object.keys(requirement)]);
  for (const k of keys) {
    const need = requirement[k] ?? 0;
    const have = tallies[k] ?? 0;
    if (need !== have) return false;
  }
  return slots.length > 0 || Object.keys(requirement).every((k) => (requirement[k] ?? 0) === 0);
}

/** Parse formulas like H2O, CH4, CO2, NaCl, H2 (symbols must exist in element list) */
function parseFormulaToSlots(formula: string, elementList: Element[]): string[] | null {
  const trimmed = formula.trim();
  if (!trimmed) return null;
  const bySymbol = new Map(elementList.map((e) => [e.symbol, e.id]));
  const symbols = [...elementList.map((e) => e.symbol)].sort((a, b) => b.length - a.length);
  let rest = trimmed;
  const slots: string[] = [];
  while (rest.length > 0) {
    let matched = false;
    for (const sym of symbols) {
      if (!rest.startsWith(sym)) continue;
      let tail = rest.slice(sym.length);
      let count = 1;
      const num = tail.match(/^(\d+)/);
      if (num) {
        count = parseInt(num[1], 10);
        if (count < 1 || count > 20) return null;
        tail = tail.slice(num[1].length);
      }
      const id = bySymbol.get(sym);
      if (!id) return null;
      for (let i = 0; i < count; i++) slots.push(id);
      rest = tail;
      matched = true;
      break;
    }
    if (!matched) return null;
  }
  return slots.length > 0 ? slots : null;
}

function fallbackSlotOrder(requirement: TaskRequirement, elementOrder: string[]): string[] {
  const orderIndex = (id: string) => {
    const i = elementOrder.indexOf(id);
    return i === -1 ? 999 : i;
  };
  const keys = Object.keys(requirement).filter((k) => (requirement[k] ?? 0) > 0);
  if (keys.length === 0) return [];
  keys.sort((a, b) => orderIndex(a) - orderIndex(b));
  const slots: string[] = [];
  for (const id of keys) {
    const n = requirement[id]!;
    for (let i = 0; i < n; i++) slots.push(id);
  }
  return slots;
}

export function expandRequirementToSlots(
  requirement: TaskRequirement | undefined,
  elementList: Element[],
  formula?: string
): string[] {
  if (!requirement) return [];
  const keys = Object.keys(requirement).filter((k) => (requirement[k] ?? 0) > 0);
  if (keys.length === 0) return [];

  if (formula) {
    const parsed = parseFormulaToSlots(formula, elementList);
    if (parsed && requirementCountsMatch(parsed, requirement)) return parsed;
  }

  return fallbackSlotOrder(requirement, elementList.map((e) => e.id));
}
