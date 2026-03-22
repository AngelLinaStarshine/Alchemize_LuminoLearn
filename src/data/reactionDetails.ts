/**
 * Reaction details for educational visualization.
 * Extends reaction data with reactionText, explanation, and animation layout.
 */

export interface ReactionDetail {
  id: string;
  name: string;
  formula: string;
  reactionText: string;
  explanation: string;
  whyConcept?: string;
  animationLayout: 'hydrogen' | 'oxygen' | 'water' | 'salt' | 'methane' | 'carbon_dioxide' | 'generic';
}

export const REACTION_DETAILS: Record<string, ReactionDetail> = {
  hydrogen: {
    id: 'hydrogen',
    name: 'Hydrogen gas',
    formula: 'H2',
    reactionText: 'H + H → H2',
    explanation: 'Two hydrogen atoms bonded together to form hydrogen gas. Each hydrogen shares one electron, creating a stable diatomic molecule.',
    whyConcept: 'Many elements are more stable as pairs. Hydrogen exists as H2 in nature because the shared electrons complete each atom\'s outer shell.',
    animationLayout: 'hydrogen',
  },
  oxygen: {
    id: 'oxygen',
    name: 'Oxygen gas',
    formula: 'O2',
    reactionText: 'O + O → O2',
    explanation: 'Two oxygen atoms bonded with a double bond to form the gas we breathe. Each oxygen shares two electrons.',
    whyConcept: 'Oxygen needs two more electrons to fill its outer shell. A double bond between two oxygen atoms satisfies both.',
    animationLayout: 'oxygen',
  },
  water: {
    id: 'water',
    name: 'Water',
    formula: 'H2O',
    reactionText: '2H + O → H2O',
    explanation: 'Two hydrogen atoms bonded with one oxygen atom to form water. The ratio is 2:1, giving the formula H2O.',
    whyConcept: 'Oxygen has two unpaired electrons and each hydrogen has one. Two hydrogens complete oxygen\'s outer shell in a V-shaped molecule.',
    animationLayout: 'water',
  },
  salt: {
    id: 'salt',
    name: 'Sodium Chloride',
    formula: 'NaCl',
    reactionText: 'Na + Cl → NaCl',
    explanation: 'One sodium atom transferred an electron to one chlorine atom, forming table salt. The ratio is 1:1.',
    whyConcept: 'Sodium loses one electron to become stable; chlorine gains one. The opposite charges create a strong ionic bond.',
    animationLayout: 'salt',
  },
  methane: {
    id: 'methane',
    name: 'Methane',
    formula: 'CH4',
    reactionText: 'C + 4H → CH4',
    explanation: 'One carbon atom bonded with four hydrogen atoms to form methane. Carbon\'s four valence electrons pair with four hydrogens.',
    whyConcept: 'Carbon has four bonding sites. Four hydrogen atoms, each with one electron to share, complete carbon\'s tetrahedral structure.',
    animationLayout: 'methane',
  },
  carbon_dioxide: {
    id: 'carbon_dioxide',
    name: 'Carbon dioxide',
    formula: 'CO2',
    reactionText: 'C + 2O → CO2',
    explanation: 'One carbon atom bonded with two oxygen atoms to form carbon dioxide. Each oxygen shares two electrons in double bonds.',
    whyConcept: 'Carbon forms four bonds total. Two double bonds with oxygen atoms create a linear CO2 molecule.',
    animationLayout: 'carbon_dioxide',
  },
};

export function getReactionDetail(reactionId: string, formula?: string, name?: string): ReactionDetail {
  const detail = REACTION_DETAILS[reactionId];
  if (detail) return detail;
  return {
    id: reactionId,
    name: name ?? 'Compound',
    formula: formula ?? '?',
    reactionText: `→ ${formula ?? '?'}`,
    explanation: `You created ${name ?? 'a compound'} with the formula ${formula ?? '?'}.`,
    animationLayout: 'generic',
  };
}
