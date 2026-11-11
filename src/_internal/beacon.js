// Vendor script of the Harbour Beacon lamp controller, from 2011. No npm package, no types.
// Loading it adds a Beacon global to the page. You do not need to modify this file.
//
// Its whole API:
//   Beacon.version                      '3.1.0'
//   Beacon.flash(signal)                the light for a signal, as { signal, character, pattern },
//                                       for example { signal: 'storm', character: 'Q', pattern: '#.#.#.#.' }
//                                       Throws when the lamp does not know the signal.
//   Beacon.register(signal, character)  teaches the lamp a new signal, shown with that character
//
// A character is the international name of a light rhythm. Its pattern is eight ticks:
// # is light, . is dark.
const rhythms = {
  Fl: '#.......', // flashing: one short flash
  Q: '#.#.#.#.', // quick: a flash every other tick
  Oc: '######..', // occulting: mostly light, one short eclipse
  Iso: '####....', // isophase: as long light as dark
}

// the signals the lamp knows when it leaves the factory
const known = { harbour: 'Fl', ship: 'Oc', storm: 'Q' }

globalThis.Beacon = {
  version: '3.1.0',
  flash(signal) {
    const character = known[signal]
    if (character === undefined) throw new Error(`Beacon does not know the signal "${signal}"`)
    return { signal, character, pattern: rhythms[character] }
  },
  register(signal, character) {
    if (rhythms[character] === undefined) throw new Error(`Beacon has no character "${character}"`)
    known[signal] = character
  },
}
