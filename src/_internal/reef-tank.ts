// The fish of the reef tank and tonight's treat. You do not need to modify this file.

/** Any fish at all */
export type Fish = { name: string; species: string }

/** A clownfish always lives in an anemone */
export type Clownfish = { name: string; species: 'clownfish'; anemone: string }

/** A tang has no anemone */
export type Tang = { name: string; species: 'blue tang' | 'yellow tang' }

/** Every fish that lives in this reef tank */
export type ReefFish = Clownfish | Tang

export type Treat = { food: string; time: string }

export const residents: readonly ReefFish[] = [
  { name: 'Sunny', species: 'clownfish', anemone: 'pink anemone' },
  { name: 'Pip', species: 'clownfish', anemone: 'pink anemone' },
  { name: 'Azure', species: 'blue tang' },
  { name: 'Lemon', species: 'yellow tang' },
]

export const eveningTreat: Treat = { food: 'brine shrimp', time: '17:30' }
