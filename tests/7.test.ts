import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { requests } from '../src/_internal/hut-inbox'

// importing the exercise prints the board: keep the test output clean
vi.spyOn(console, 'log').mockImplementation(() => {})
const { assignBunks, board, parseBooking } = await import('#exercise/7')
const source = readFileSync(new URL(`../src/7-${process.env.SOLUTION ? 'end' : 'begin'}.ts`, import.meta.url), 'utf8')
const code = source.replace(/\/\/.*$/gm, '') // the comments of the starter mention `any` and the skeletons

// Infer and Booking are types: their checks are in tests/7.test-d.ts

describe('step 1: Booking comes from the schema', () => {
  it('has no hand-written copy of the booking left', () => {
    expect(code).toMatch(/type\s+Booking\s*=\s*Infer<\s*typeof\s+bookingSchema\s*>/)
  })
})

describe('step 2: parseBooking', () => {
  it('parses a valid request into a booking', () => {
    expect(parseBooking('{"guest":"Heidi","party":2,"nights":1}')).toEqual({
      ok: true,
      value: { guest: 'Heidi', party: 2, nights: 1 },
    })
  })

  it('turns away broken JSON without throwing', () => {
    expect(parseBooking('{"guest":"Luca","party":1,')).toEqual({ ok: false, errors: ['not valid JSON'] })
  })

  it('keeps the readable errors of the schema', () => {
    expect(parseBooking('{"guest":"Reto","party":"3","nights":2}')).toEqual({
      ok: false,
      errors: ['party: expected a number, got string'],
    })
    expect(parseBooking('{"guest":"Marco","nights":1}')).toEqual({
      ok: false,
      errors: ['party: expected a number, got undefined'],
    })
  })

  it('turns away JSON that is not an object', () => {
    expect(parseBooking('null')).toEqual({ ok: false, errors: ['booking: expected an object, got null'] })
  })
})

describe('step 3: assignBunks', () => {
  it('gives each guest one bunk per person in the party', () => {
    expect(assignBunks([{ guest: 'Heidi', party: 2, nights: 1 }], 3)).toEqual(['Heidi', 'Heidi', ''])
  })

  it('never hands out more bunks than the hut has', () => {
    const full = assignBunks([{ guest: 'Sofia', party: 4, nights: 1 }, { guest: 'Anna', party: 3, nights: 2 }], 5)
    expect(full).toEqual(['Sofia', 'Sofia', 'Sofia', 'Sofia', 'Anna'])
  })

  it('prints the whole board', () => {
    expect(board(requests)).toEqual([
      'Heidi: 2 bunks, 1 night',
      'Request 2 turned away: party: expected a number, got string',
      'Anna: 3 bunks, 2 nights',
      'Request 4 turned away: not valid JSON',
      'Sofia: 4 bunks, 1 night',
      'Request 6 turned away: party: expected a number, got undefined',
      'Jonas: 1 bunk, 3 nights',
      'Bunks taken: 10 of 10',
    ])
  })
})

describe('no shortcuts', () => {
  it('uses no any, no type assertion and no ts-ignore', () => {
    expect(code).not.toMatch(/\bany\b/)
    expect(code).not.toMatch(/\bas\s+(?!const\b)[A-Z{[(a-z]/)
    expect(source).not.toMatch(/@ts-(ignore|nocheck|expect-error)/)
  })
})
