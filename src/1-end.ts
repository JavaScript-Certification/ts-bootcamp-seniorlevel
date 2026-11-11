import { type Clownfish, type Fish, type ReefFish, type Treat, eveningTreat, residents } from './_internal/reef-tank'
import { mountScene } from './_internal/scenes/aquarium'

// Exercise 1: Coral Reef Aquarium (solution)

// Step 1: a Tank only produces fish (covariant), a Feeder only consumes them (contravariant)
export interface Tank<out T> {
  readonly residents: readonly T[]
}

export interface Feeder<in T> {
  readonly food: string
  readonly serve: (fish: T) => string
}

// Step 1 (continued): a Feeder<Fish> fits a Tank<ReefFish>, because T is only consumed
export function feedTank<T>(tank: Tank<T>, feeder: Feeder<T>): string[] {
  return tank.residents.map(fish => feeder.serve(fish))
}

// Given: the reef tank, flakes that any fish eats, and pellets that only clownfish eat
export const reef: Tank<ReefFish> = { residents }
export const flakes: Feeder<Fish> = { food: 'flakes', serve: fish => `${fish.name} eats flakes` }
export const pellets: Feeder<Clownfish> = { food: 'pellets', serve: fish => `${fish.name} takes pellets to the ${fish.anemone}` }

// Step 2: a function property is checked strictly (strictFunctionTypes), a method is not
export interface Keeper<T> {
  note: (fish: T) => string
}

// Step 2 (continued): a keeper for every reef fish, narrowed on species
const anemoneKeeper: Keeper<ReefFish> = {
  note: fish => fish.species === 'clownfish'
    ? `${fish.name} hides in the ${fish.anemone}`
    : `${fish.name} swims back to the coral`,
}

// Given: the keeper on duty writes a note for every fish of the reef
export const onDuty: Keeper<ReefFish> = anemoneKeeper

// Given: tonight's plan. Some evenings have no treat
export type Plan = { readonly tank: Tank<ReefFish>; readonly treat?: Treat }
export const tonight: Plan = { tank: reef, treat: eveningTreat }

// Step 3: narrowing on plan.treat does not reach the callback, a const keeps it
export function treats(plan: Plan): string[] {
  const treat = plan.treat
  if (treat === undefined) return []
  return plan.tank.residents.map(fish => `${fish.name} gets ${treat.food} at ${treat.time}`)
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
