/**
 * Discovery-based task definitions.
 * Clue- and formula-based prompts—no direct step-by-step instructions.
 */

export type TaskStatus = 'locked' | 'active' | 'completed';

export interface TaskRequirement {
  [elementId: string]: number;
}

export interface LearningTask {
  id: number;
  title: string;
  challengePrompt: string;
  thinkFirst?: string;
  status: TaskStatus;
  requirement: TaskRequirement;
  formula?: string;
  reactionId?: string;
  productFormula?: string;
  reactionText?: string;
  explanation?: string;
  animationLayout?: string;
  attempts: number;
  timeSpentSeconds: number;
  startedAt?: number;
}

export const TASKS: Omit<LearningTask, 'status' | 'attempts' | 'timeSpentSeconds'>[] = [
  {
    id: 1,
    title: 'Discover Hydrogen Gas',
    challengePrompt: 'Build the simplest diatomic molecule, the lightest element in the universe, paired.',
    thinkFirst: 'How many atoms of the same element join to form a stable diatomic gas?',
    requirement: { h: 2 },
    formula: 'H2',
    reactionId: 'hydrogen',
    productFormula: 'H2',
    reactionText: 'H + H → H2',
    explanation: 'Two hydrogen atoms bonded together to form hydrogen gas. Each hydrogen shares one electron.',
    animationLayout: 'hydrogen',
  },
  {
    id: 2,
    title: 'Discover Oxygen Gas',
    challengePrompt: 'Create the gas we breathe. Many elements form pairs in nature, find the one in the air.',
    thinkFirst: 'What element makes up about 21% of the atmosphere? How many atoms does it need to be stable?',
    requirement: { o: 2 },
    formula: 'O2',
    reactionId: 'oxygen',
    productFormula: 'O2',
    reactionText: 'O + O → O2',
    explanation: 'Two oxygen atoms bonded with a double bond to form the gas we breathe.',
    animationLayout: 'oxygen',
  },
  {
    id: 3,
    title: 'Discover Water',
    challengePrompt: 'Use clues about common elements to build the molecule we drink every day.',
    thinkFirst: 'Which two elements form water, and what ratio do they need? Predict the formula before you build.',
    requirement: { h: 2, o: 1 },
    formula: 'H2O',
    reactionId: 'water',
    productFormula: 'H2O',
    reactionText: '2H + O → H2O',
    explanation: 'Two hydrogen atoms bonded with one oxygen atom to form water. The ratio is 2:1, giving the formula H2O.',
    animationLayout: 'water',
  },
  {
    id: 4,
    title: 'Discover Table Salt',
    challengePrompt: 'Build the compound that makes the sea salty. One metal + one halogen.',
    thinkFirst: 'What charge does the metal have? The halogen? How many of each balance out?',
    requirement: { na: 1, cl: 1 },
    formula: 'NaCl',
    reactionId: 'salt',
    productFormula: 'NaCl',
    reactionText: 'Na + Cl → NaCl',
    explanation: 'One sodium atom transferred an electron to one chlorine atom, forming table salt. The ratio is 1:1.',
    animationLayout: 'salt',
  },
  {
    id: 5,
    title: 'Discover Methane',
    challengePrompt: 'Build the main component of natural gas. The backbone of life needs four bonds.',
    thinkFirst: 'Carbon has a valence of 4. How many of the lightest element complete its outer shell?',
    requirement: { c: 1, h: 4 },
    formula: 'CH4',
    reactionId: 'methane',
    productFormula: 'CH4',
    reactionText: 'C + 4H → CH4',
    explanation: 'One carbon atom bonded with four hydrogen atoms to form methane. Carbon\'s four valence electrons pair with four hydrogens.',
    animationLayout: 'methane',
  },
  {
    id: 6,
    title: 'Discover Carbon Dioxide',
    challengePrompt: 'Build the gas we exhale. One central atom, two atoms of the element we breathe.',
    thinkFirst: 'Carbon bonds with four atoms total. If it connects to oxygen, how many oxygens fit?',
    requirement: { c: 1, o: 2 },
    formula: 'CO2',
    reactionId: 'carbon_dioxide',
    productFormula: 'CO2',
    reactionText: 'C + 2O → CO2',
    explanation: 'One carbon atom bonded with two oxygen atoms to form carbon dioxide. Each oxygen shares two electrons in double bonds.',
    animationLayout: 'carbon_dioxide',
  },
  {
    id: 7,
    title: 'Fix the Reaction',
    challengePrompt: 'A reaction is unbalanced. Someone mixed elements wrongly. Build the correct product.',
    thinkFirst: 'Which compound from your lab could they have been trying to make?',
    requirement: {},
    reactionId: 'any',
  },
  {
    id: 8,
    title: 'Find the Mistake',
    challengePrompt: 'Someone made an error. Can you figure out what compound they meant and build it correctly?',
    thinkFirst: 'Review what you\'ve learned. Which stable compound matches the elements available?',
    requirement: {},
    reactionId: 'any',
  },
  {
    id: 9,
    title: 'Free Build Challenge',
    challengePrompt: 'Pick any compound you have discovered. Build it from memory, no hints.',
    thinkFirst: 'Which formula do you remember? Can you predict it before you drop the atoms?',
    requirement: {},
    reactionId: 'any',
  },
  {
    id: 10,
    title: 'Efficiency Challenge',
    challengePrompt: 'Build one more compound with the exact stoichiometric ratio. Precision matters.',
    thinkFirst: 'Use the minimum atoms needed. No extra, no missing.',
    requirement: {},
    reactionId: 'any',
  },
];
