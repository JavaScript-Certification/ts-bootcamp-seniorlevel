import { number, object, string, type Result, type Schema } from './_internal/hut-schema'
import { CAPACITY } from './_internal/hut-inbox'
import { mountScene } from './_internal/scenes/hut'

// Exercise 7: Alpine Hut Bookings
// Follow the steps in the exercise instructions. The page shows the hut as you go.

// Given: a booking, written once as a schema with the builders of src/_internal/hut-schema.ts
export const bookingSchema = object({
  guest: string(),
  party: number(),
  nights: number(),
})

// Step 1: replace this placeholder with a conditional type that reads T out of a Schema<T>:
//   S extends Schema<infer T> ? T : never
export type Infer<S> = unknown

// Step 1 (continued): this hand-written copy has already drifted from the schema.
// Replace it with Infer<typeof bookingSchema>.
export type Booking = { guest: string; people: number; nights: number }

// Step 2: parse a raw request at the boundary. Keep what JSON.parse returns as `unknown`,
// return { ok: false, errors: ['not valid JSON'] } when it throws,
// and otherwise return what bookingSchema.parse finds.
export function parseBooking(json: string): Result<Booking> {
  return { ok: false, errors: ['not parsed yet'] }
}

// Step 3: assignBunks comes from the hut's old hut.js. It was ported with a first-pass type,
// Record<string, unknown>, which lets any field name through, so every bunk stays empty.
// Type the parameter as `readonly Booking[]`, then fix what the compiler finds.
export function assignBunks(bookings: readonly Record<string, unknown>[], capacity: number): string[] {
  const bunks: string[] = []
  for (const booking of bookings) {
    for (let i = 0; i < Number(booking.people); i++) {
      if (bunks.length < capacity) bunks.push(String(booking.guest))
    }
  }
  while (bunks.length < capacity) bunks.push('')
  return bunks
}

// Given: tonight's board. Every request is parsed, then the valid bookings share the bunks.
export function board(inbox: readonly string[]): string[] {
  const results = inbox.map(json => parseBooking(json))
  const admitted = results.flatMap(result => (result.ok ? [result.value] : []))
  const bunks = assignBunks(admitted, CAPACITY)
  const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  const lines = results.map((result, i) => {
    if (!result.ok) return `Request ${i + 1} turned away: ${result.errors.join(', ')}`
    const { guest, nights } = result.value
    return `${guest}: ${count(bunks.filter(name => name === guest).length, 'bunk')}, ${count(nights, 'night')}`
  })
  const taken = bunks.filter(name => name !== '').length
  return [...lines, `Bunks taken: ${taken} of ${CAPACITY}`]
}

// Shows your work on the page (and prints the board in the console). You do not need to change this line.
mountScene({ parseBooking, assignBunks, board })
