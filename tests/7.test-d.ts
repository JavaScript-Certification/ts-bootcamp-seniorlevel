import { describe, expectTypeOf, it } from 'vitest'
import { type Result, type Schema, number, object, string } from '../src/_internal/hut-schema'
import { type Booking, type Infer, assignBunks, parseBooking } from '#exercise/7'

describe('step 1: Infer and Booking', () => {
  it('reads the type out of a schema', () => {
    expectTypeOf<Infer<Schema<string>>>().toEqualTypeOf<string>()
    expectTypeOf<Infer<typeof number>>().toEqualTypeOf<never>()
    const room = object({ name: string(), beds: number() })
    expectTypeOf<Infer<typeof room>>().toEqualTypeOf<{ name: string; beds: number }>()
  })

  it('computes Booking from the schema', () => {
    expectTypeOf<Booking>().toEqualTypeOf<{ guest: string; party: number; nights: number }>()
  })
})

describe('step 2: parseBooking', () => {
  it('takes raw text and returns a Result of Booking', () => {
    expectTypeOf(parseBooking).parameters.toEqualTypeOf<[string]>()
    expectTypeOf(parseBooking).returns.toEqualTypeOf<Result<Booking>>()
  })

  it('only hands out a booking after the check', () => {
    const result = parseBooking('{}')
    if (result.ok) expectTypeOf(result.value).toEqualTypeOf<Booking>()
    else expectTypeOf(result.errors).toEqualTypeOf<string[]>()
  })
})

describe('step 3: assignBunks is typed with Booking', () => {
  it('takes bookings, not any record', () => {
    expectTypeOf(assignBunks).parameters.toEqualTypeOf<[readonly Booking[], number]>()
    // @ts-expect-error the old hut.js field `people` is not part of a booking
    assignBunks([{ guest: 'Heidi', people: 2, nights: 1 }], 4)
  })
})
