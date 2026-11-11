import { type Clownfish, type Fish, type ReefFish, type Treat, eveningTreat, residents } from './_internal/reef-tank'
import { mountScene } from './_internal/scenes/aquarium'

// Exercise 1: Coral Reef Aquarium
// Follow the steps in the exercise instructions. The page shows the tank as you go.
// The fish and their types are in src/_internal/reef-tank.ts.

// Step 1: a Tank only hands fish out, a Feeder only takes them in.
// Say so with variance annotations: Tank<out T> and Feeder<in T>
export interface Tank<T> {
  readonly residents: readonly T[]
}

export interface Feeder<T> {
  readonly food: string
  readonly serve: (fish: T) => string
}

// Step 1 (continued): serve every resident of the tank, one line per fish
export function feedTank<T>(tank: Tank<T>, feeder: Feeder<T>): string[] {
  return []
}

// Given: the reef tank, flakes that any fish eats, and pellets that only clownfish eat
export const reef: Tank<ReefFish> = { residents }
export const flakes: Feeder<Fish> = { food: 'flakes', serve: fish => `${fish.name} eats flakes` }
export const pellets: Feeder<Clownfish> = { food: 'pellets', serve: fish => `${fish.name} takes pellets to the ${fish.anemone}` }

// Step 2: method syntax is checked loosely. Turn `note` into a function property:
//   note: (fish: T) => string
export interface Keeper<T> {
  note(fish: T): string
}

// Step 2 (continued): when the compiler complains about onDuty, make this a Keeper<ReefFish>.
// Narrow on fish.species: the other fish get `Azure swims back to the coral`
const anemoneKeeper: Keeper<Clownfish> = {
  note: fish => `${fish.name} hides in the ${fish.anemone}`,
}

// Given: the keeper on duty writes a note for every fish of the reef
export const onDuty: Keeper<ReefFish> = anemoneKeeper

// Given: tonight's plan. Some evenings have no treat
export type Plan = { readonly tank: Tank<ReefFish>; readonly treat?: Treat }
export const tonight: Plan = { tank: reef, treat: eveningTreat }

// Step 3: one line per resident, like `Sunny gets brine shrimp at 17:30`.
// Map over plan.tank.residents, then follow the compiler
export function treats(plan: Plan): string[] {
  if (plan.treat === undefined) return []
  return []
}

// Given: the feeding log, which uses your functions
export function board(): string[] {
  return [
    ...feedTank(reef, flakes),
    ...reef.residents.map(fish => onDuty.note(fish)),
    ...treats(tonight),
  ]
}

// Shows your work on the page (and prints the feeding log in the console). You do not need to change this line.
mountScene({ feedTank, reef, flakes, onDuty, treats, tonight, board })
