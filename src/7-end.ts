import { number, object, string, type Result, type Schema } from './_internal/hut-schema'
import { CAPACITY } from './_internal/hut-inbox'
import { mountScene } from './_internal/scenes/hut'

// Exercise 7: Alpine Hut Bookings (solution)

// Given: a booking, written once as a schema with the builders of src/_internal/hut-schema.ts
export const bookingSchema = object({
  guest: string(),
  party: number(),
  nights: number(),
})

// Step 1: a conditional type reads T out of a Schema<T>, so Booking comes from the schema
export type Infer<S> = S extends Schema<infer T> ? T : never
export type Booking = Infer<typeof bookingSchema>

// Step 2: parse at the boundary. Raw text in, a Result out, and nothing in between is trusted.
export function parseBooking(json: string): Result<Booking> {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { ok: false, errors: ['not valid JSON'] }
  }
  return bookingSchema.parse(data)
}

// Step 3: the legacy helper, typed with Booking. The compiler found `people`, which never existed.
export function assignBunks(bookings: readonly Booking[], capacity: number): string[] {
  const bunks: string[] = []
  for (const booking of bookings) {
    for (let i = 0; i < booking.party; i++) {
      if (bunks.length < capacity) bunks.push(booking.guest)
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
