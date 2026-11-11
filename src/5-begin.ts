// the lamp's vendor script: it adds a Beacon global, and ships no types
import './_internal/beacon.js'
import { mountScene } from './_internal/scenes/lighthouse'

// Exercise 5: Harbour Lighthouse
// Follow the steps in the exercise instructions. The lighthouse shows your signals as you go.

// ---------- beacon.d.ts ----------
// The types of the vendor script. Published with the package, this block would be beacon.d.ts.
// The comment at the top of src/_internal/beacon.js describes its API.

// Given: the signals the lamp knows, and the character (light rhythm) each one shows
export interface Signals {
  harbour: 'Fl'
  ship: 'Oc'
  storm: 'Q'
}

// Step 1: write a Light<S> type for what flash returns: the signal S, its character
// Signals[S] and a pattern string. Then replace unknown with the two methods:
//   flash takes a signal S of Signals and returns a Light<S>
//   register takes a signal S of Signals and its character Signals[S], and returns void
declare const Beacon: unknown

// ---------- the harbour ----------

// Step 1 (continued): make shine generic like flash, and return Beacon.flash(signal)
export function shine(signal: keyof Signals): unknown {
  return null
}

// Step 2: the harbour needs a fog signal that shows 'Iso'. Call Beacon.register('fog', 'Iso'),
// then fix the error without touching the block above: reopen the interface here.

// Step 3: write your type tests in tests/5-begin.test-d.ts

// Shows your work on the page (and prints the signals in the console). You do not need to change this line.
mountScene({ shine })
