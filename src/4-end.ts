import { metReport } from './_internal/met-report'
import { mountScene } from './_internal/scenes/balloon'

// Exercise 4: Hot Air Balloon Launch (solution)

// Step 1: two brands on number, with a different tag each
export type Metres = number & { readonly __brand: 'Metres' }
export type Feet = number & { readonly __brand: 'Feet' }

// Given: a type predicate, the one place where a plain number becomes a brand
function isAltitude<A extends number>(value: number): value is A {
  return Number.isFinite(value) && value >= 0
}

// Step 1 (continued): the only two ways to make a Metres or a Feet
export function metres(value: number): Metres {
  if (!isAltitude<Metres>(value)) throw new RangeError(`Not an altitude: ${value}`)
  return value
}

export function feet(value: number): Feet {
  if (!isAltitude<Feet>(value)) throw new RangeError(`Not an altitude: ${value}`)
  return value
}

// Given: one foot is 0.3048 metres, rounded to the nearest whole unit
export function toMetres(altitude: Feet): Metres {
  return metres(Math.round(altitude * 0.3048))
}

export function toFeet(altitude: Metres): Feet {
  return feet(Math.round(altitude / 0.3048))
}

// Given: the met office gives tonight's cloud base in feet
export const cloudBase = feet(metReport.cloudBaseFt)

// Given: the flight must stay 150 metres under the cloud base
export function ceilingUnder(base: Metres): Metres {
  return metres(base - 150)
}

// Step 1 (continued): the compiler found the unit mix-up, convert first
export const ceiling = ceilingUnder(toMetres(cloudBase))

// Given: the legs of a flight plan
export type Leg =
  | { kind: 'climb'; to: Metres }
  | { kind: 'drift'; minutes: number }
  | { kind: 'toast' }
  | { kind: 'land' }

// Step 2: every method returns this, so a chain keeps the subclass
export class FlightPlan {
  readonly legs: Leg[] = []

  climbTo(altitude: Metres): this {
    this.legs.push({ kind: 'climb', to: altitude })
    return this
  }

  drift(minutes: number): this {
    this.legs.push({ kind: 'drift', minutes })
    return this
  }

  land(): this {
    this.legs.push({ kind: 'land' })
    return this
  }
}

// Given: a sunset flight adds a toast at the top
export class SunsetFlight extends FlightPlan {
  toast(): this {
    this.legs.push({ kind: 'toast' })
    return this
  }
}

// Step 2 (continued): tonight's plan, in one chain
export const plan = new SunsetFlight()
  .climbTo(metres(900))
  .drift(20)
  .toast()
  .land()

// Step 3: one overload per unit, then the implementation
export function altitudeIn(unit: 'metres', altitude: Metres): Metres
export function altitudeIn(unit: 'feet', altitude: Metres): Feet
export function altitudeIn(unit: 'metres' | 'feet', altitude: Metres): Metres | Feet {
  return unit === 'feet' ? toFeet(altitude) : altitude
}

// Given: one line per leg, with the climbs in metres and in feet
function describe(leg: Leg): string {
  switch (leg.kind) {
    case 'climb':
      return `Climb to ${altitudeIn('metres', leg.to)} m (${altitudeIn('feet', leg.to)} ft)`
    case 'drift':
      return `Drift for ${leg.minutes} min`
    case 'toast':
      return 'Toast at the top'
    case 'land':
      return 'Land'
  }
}

// Given: the launch board, printed in the console
export function board(flight: FlightPlan): string[] {
  return [`Ceiling: ${ceiling} m`, ...flight.legs.map(describe)]
}

// Shows your work on the page (and prints the board in the console). You do not need to change this line.
mountScene({ metres, altitudeIn, cloudBase, ceiling, plan, board })
