import { readFileSync } from 'node:fs'
import { describe as group, expect, it, vi } from 'vitest'

// importing the exercise prints the board: keep the test output clean
vi.spyOn(console, 'log').mockImplementation(() => {})
const { altitudeIn, board, ceiling, feet, metres, plan, SunsetFlight, toMetres } = await import('#exercise/4')
const source = readFileSync(new URL(`../src/4-${process.env.SOLUTION ? 'end' : 'begin'}.ts`, import.meta.url), 'utf8')
const code = source.replace(/\/\/.*$/gm, '') // the starter shows the skeletons in comments

// the brands of step 1, the this return types of step 2 and the overloads of step 3
// are types: their checks are in tests/4.test-d.ts

group('step 1: Metres and Feet', () => {
  it('keeps a valid altitude as it is', () => {
    expect(metres(900)).toBe(900)
    expect(feet(4000)).toBe(4000)
    expect(metres(0)).toBe(0)
  })

  it('throws a RangeError on a negative altitude', () => {
    expect(() => metres(-1)).toThrow(RangeError)
    expect(() => feet(-20)).toThrow('Not an altitude: -20')
  })

  it('throws a RangeError on a value that is not a finite number', () => {
    expect(() => metres(Number.NaN)).toThrow(RangeError)
    expect(() => feet(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })

  it('puts the ceiling 150 metres under a cloud base of 4000 feet', () => {
    expect(toMetres(feet(4000))).toBe(1219)
    expect(ceiling).toBe(1069)
  })
})

group('step 2: the flight plan', () => {
  it('is a sunset flight', () => {
    expect(plan).toBeInstanceOf(SunsetFlight)
  })

  it('climbs to 900 metres, drifts for 20 minutes, toasts, then lands', () => {
    expect(plan.legs).toEqual([
      { kind: 'climb', to: 900 },
      { kind: 'drift', minutes: 20 },
      { kind: 'toast' },
      { kind: 'land' },
    ])
  })

  it('returns the same plan from every method', () => {
    const flight = new SunsetFlight()
    expect(flight.climbTo(metres(300))).toBe(flight)
    expect(flight.drift(5).land()).toBe(flight)
    expect(flight.toast()).toBe(flight)
  })
})

group('step 3: altitudeIn', () => {
  it('answers in metres or in feet', () => {
    expect(altitudeIn('metres', metres(900))).toBe(900)
    expect(altitudeIn('feet', metres(900))).toBe(2953)
  })

  it('declares one overload per unit', () => {
    expect(code.match(/function\s+altitudeIn\b/g)).toHaveLength(3)
  })

  it('prints the whole board', () => {
    expect(board(plan)).toEqual([
      'Ceiling: 1069 m',
      'Climb to 900 m (2953 ft)',
      'Drift for 20 min',
      'Toast at the top',
      'Land',
    ])
  })
})

group('no shortcuts', () => {
  it('uses no any, no as and no ts-ignore', () => {
    expect(code).not.toMatch(/\bany\b/)
    expect(code).not.toMatch(/\bas\s+(?!const\b)\w/)
    expect(source).not.toMatch(/@ts-(ignore|nocheck|expect-error)/)
  })
})
