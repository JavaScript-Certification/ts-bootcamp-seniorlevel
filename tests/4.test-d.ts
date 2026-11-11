import { describe as group, expectTypeOf, it } from 'vitest'
import { type Feet, type Metres, FlightPlan, SunsetFlight, altitudeIn, ceilingUnder, feet, metres, toMetres } from '#exercise/4'

group('step 1: Metres and Feet', () => {
  it('are still numbers you can compute with', () => {
    expectTypeOf<Metres>().toExtend<number>()
    expectTypeOf<Feet>().toExtend<number>()
    expectTypeOf(metres(900) + 1).toEqualTypeOf<number>()
  })

  it('never mix', () => {
    // @ts-expect-error feet are not metres
    const height: Metres = feet(4000)
    // @ts-expect-error metres are not feet
    const reading: Feet = metres(900)
    // @ts-expect-error the cloud base is in feet, the ceiling wants metres
    ceilingUnder(feet(4000))
    void [height, reading]
  })

  it('only come from their constructor', () => {
    // @ts-expect-error a plain number is not an altitude
    const plain: Metres = 900
    void plain
    expectTypeOf(ceilingUnder(toMetres(feet(4000)))).toEqualTypeOf<Metres>()
  })
})

group('step 2: polymorphic this', () => {
  it('keeps the subclass through the chain', () => {
    expectTypeOf(new SunsetFlight().climbTo(metres(900))).toEqualTypeOf<SunsetFlight>()
    expectTypeOf(new SunsetFlight().drift(20).toast().land()).toEqualTypeOf<SunsetFlight>()
  })

  it('keeps a plain plan plain', () => {
    expectTypeOf(new FlightPlan().climbTo(metres(900))).toEqualTypeOf<FlightPlan>()
  })
})

group('step 3: overloads', () => {
  it('returns the unit you ask for', () => {
    expectTypeOf(altitudeIn('metres', metres(900))).toEqualTypeOf<Metres>()
    expectTypeOf(altitudeIn('feet', metres(900))).toEqualTypeOf<Feet>()
  })

  it('takes metres only', () => {
    // @ts-expect-error the altitude must already be in metres
    altitudeIn('feet', feet(2953))
  })
})
