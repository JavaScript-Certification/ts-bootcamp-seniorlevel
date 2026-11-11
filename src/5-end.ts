// the lamp's vendor script: it adds a Beacon global, and ships no types
import './_internal/beacon.js'
import { mountScene } from './_internal/scenes/lighthouse'

// Exercise 5: Harbour Lighthouse (solution)

// ---------- beacon.d.ts ----------
// The types of the vendor script. Published with the package, this block would be beacon.d.ts.

// Given: the signals the lamp knows, and the character (light rhythm) each one shows
export interface Signals {
  harbour: 'Fl'
  ship: 'Oc'
  storm: 'Q'
}

// Step 1: what flash returns, then the global itself, with a generic flash
export type Light<S extends keyof Signals> = {
  signal: S
  character: Signals[S]
  pattern: string
}

declare const Beacon: {
  flash<S extends keyof Signals>(signal: S): Light<S>
  register<S extends keyof Signals>(signal: S, character: Signals[S]): void
}

// ---------- the harbour ----------

// Step 1 (continued): generic like flash, so the signal and its character stay precise
export function shine<S extends keyof Signals>(signal: S): Light<S> {
  return Beacon.flash(signal)
}

// Step 2: the block above stays as published. Declaration merging adds fog to Signals
// for the compiler, and register teaches the lamp at runtime.
export interface Signals {
  fog: 'Iso'
}

Beacon.register('fog', 'Iso')

// Step 3: the type tests are in tests/5-end.test-d.ts

// Shows your work on the page (and prints the signals in the console). You do not need to change this line.
mountScene({ shine })
