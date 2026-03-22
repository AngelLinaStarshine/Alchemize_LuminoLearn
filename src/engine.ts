import { Element, Reaction } from './types';
import elementsData from './data/elements.json';
import reactionsData from './data/reactions.json';

const elements: Element[] = elementsData as Element[];
const reactions: Reaction[] = reactionsData as Reaction[];

export class ReactionEngine {
  static getElement(id: string): Element | undefined {
    return elements.find(e => e.id === id);
  }

  static getAllElements(): Element[] {
    return elements;
  }

  static getReaction(id: string): Reaction | undefined {
    return reactions.find(r => r.id === id);
  }

  static getAllReactions(): Reaction[] {
    return reactions;
  }

  static validateCombination(counts: Record<string, number>): { 
    success: boolean; 
    reaction?: Reaction; 
    feedback?: string;
    partialMatch?: boolean;
    errorType?: 'empty' | 'wrong_elements' | 'wrong_ratio' | 'unstable';
  } {
    const activeElementIds = Object.keys(counts).filter(id => counts[id] > 0);
    
    if (activeElementIds.length === 0) {
      return { success: false, feedback: "The reaction zone is empty. Add some elements!", errorType: 'empty' };
    }

    // Check for exact matches
    for (const reaction of reactions) {
      const reactantIds = Object.keys(reaction.reactants);
      
      // Check if the elements match exactly
      const elementsMatch = activeElementIds.length === reactantIds.length && 
                           activeElementIds.every(id => reactantIds.includes(id));
      
      if (elementsMatch) {
        // Check if ratios match
        const ratiosMatch = reactantIds.every(id => counts[id] === reaction.reactants[id]);
        
        if (ratiosMatch) {
          return { success: true, reaction };
        } else {
          return { 
            success: false, 
            partialMatch: true,
            errorType: 'wrong_ratio',
            feedback: `You selected the right elements for ${reaction.name}, but the ratio is not correct yet. Atoms must be conserved and ratios must be precise.` 
          };
        }
      }
    }

    // If no match found, check for general bonding logic
    let totalValency = 0;
    activeElementIds.forEach(id => {
      const el = this.getElement(id);
      if (el) totalValency += el.valency * counts[id];
    });

    if (totalValency % 2 !== 0) {
      return { 
        success: false, 
        errorType: 'unstable',
        feedback: "This combination has unpaired electrons and is highly unstable. Try adding more atoms to complete the shells." 
      };
    }

    return { 
      success: false, 
      errorType: 'wrong_elements',
      feedback: "These elements don't form a common stable compound in this environment. Try exploring different combinations." 
    };
  }
}
