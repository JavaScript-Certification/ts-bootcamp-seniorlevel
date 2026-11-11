import { metReport } from './_internal/met-report'
import { mountScene } from './_internal/scenes/balloon'

// Exercise 4: Hot Air Balloon Launch
// Follow the steps in the exercise instructions. The page shows the launch field as you go.

// Step 1: brand these two types, so feet can never go where metres are expected:
//   number & { readonly __brand: 'Metres' }
export type Metres = number
export type Feet = number

// Given: a type predicate, the one place where a plain number becomes a brand
function isAltitude<A extends number>(value: number): value is A {
  return Number.isFinite(value) && value >= 0
}

// Step 1 (continued): the only two ways to make a Metres or a Feet. Check the value
// with isAltitude<Metres>(value), and throw new RangeError(`Not an altitude: ${value}`) when it fails
export function metres(value: number): Metres {
  return value
}

export function feet(value: number): Feet {
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

// Given: tonight's ceiling
export const ceiling = ceilingUnder(cloudBase)

// Given: the legs of a flight plan
export type Leg =
  | { kind: 'climb'; to: Metres }
  | { kind: 'drift'; minutes: number }
  | { kind: 'toast' }
  | { kind: 'land' }

// Step 2: these methods return FlightPlan, so a chain forgets that it started on a
// SunsetFlight. Change their return types to `this`.
export class FlightPlan {
  readonly legs: Leg[] = []

  climbTo(altitude: Metres): FlightPlan {
    this.legs.push({ kind: 'climb', to: altitude })
    return this
  }

  drift(minutes: number): FlightPlan {
    this.legs.push({ kind: 'drift', minutes })
    return this
  }

  land(): FlightPlan {
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

// Step 2 (continued): tonight's plan, in one chain: climb to 900 metres,
// drift for 20 minutes, toast at the top, then land
export const plan = new SunsetFlight()

// Step 3: write two overload signatures above this one, so 'metres' returns Metres
// and 'feet' returns Feet. Then return toFeet(altitude) when unit is 'feet'.
export function altitudeIn(unit: 'metres' | 'feet', altitude: Metres): Metres | Feet {
  return altitude
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
