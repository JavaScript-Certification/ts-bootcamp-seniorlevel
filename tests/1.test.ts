import { readFileSync } from 'node:fs'
import { describe as group, expect, it, vi } from 'vitest'
import { residents } from '../src/_internal/reef-tank'

// importing the exercise prints the feeding log: keep the test output clean
vi.spyOn(console, 'log').mockImplementation(() => {})
const { board, feedTank, flakes, onDuty, reef, treats, tonight } = await import('#exercise/1')
const source = readFileSync(new URL(`../src/1-${process.env.SOLUTION ? 'end' : 'begin'}.ts`, import.meta.url), 'utf8')
const code = source.replace(/\/\/.*$/gm, '') // the starter shows the answers in comments

// the variance of Tank and Feeder is checked by the compiler too: see tests/1.test-d.ts

group('step 1: Tank, Feeder and feedTank', () => {
  it('serves every resident of the reef', () => {
    expect(feedTank(reef, flakes)).toEqual(['Sunny eats flakes', 'Pip eats flakes', 'Azure eats flakes', 'Lemon eats flakes'])
  })

  it('works with any tank and any feeder', () => {
    const tank = { residents: [{ name: 'Nemo', species: 'clownfish' as const, anemone: 'anemone' }] }
    expect(feedTank(tank, { food: 'krill', serve: fish => `${fish.name} eats krill` })).toEqual(['Nemo eats krill'])
  })

  it('annotates Tank with out and Feeder with in', () => {
    expect(code).toMatch(/interface\s+Tank\s*<\s*out\s+\w+/)
    expect(code).toMatch(/interface\s+Feeder\s*<\s*in\s+\w+/)
  })
})

group('step 2: a keeper for every reef fish', () => {
  it('declares note as a function property', () => {
    expect(code).toMatch(/interface\s+Keeper\s*<\s*\w+\s*>\s*\{[^}]*\bnote\s*:\s*\(/)
  })

  it('writes the clownfish note', () => {
    expect(onDuty.note({ name: 'Sunny', species: 'clownfish', anemone: 'pink anemone' })).toBe('Sunny hides in the pink anemone')
  })

  it('writes a note without undefined for the tangs', () => {
    expect(onDuty.note({ name: 'Azure', species: 'blue tang' })).toBe('Azure swims back to the coral')
    expect(onDuty.note({ name: 'Lemon', species: 'yellow tang' })).toBe('Lemon swims back to the coral')
  })
})

group('step 3: treats', () => {
  it('books the treat for every resident', () => {
    expect(treats(tonight)).toEqual(residents.map(fish => `${fish.name} gets brine shrimp at 17:30`))
  })

  it('books nothing when no treat is planned', () => {
    expect(treats({ tank: reef })).toEqual([])
  })

  it('keeps the narrowing with a const, not a non-null assertion', () => {
    expect(code).not.toMatch(/[\w)\]]!\./)
  })

  it('prints the whole feeding log', () => {
    expect(board()).toEqual([
      'Sunny eats flakes',
      'Pip eats flakes',
      'Azure eats flakes',
      'Lemon eats flakes',
      'Sunny hides in the pink anemone',
      'Pip hides in the pink anemone',
      'Azure swims back to the coral',
      'Lemon swims back to the coral',
      'Sunny gets brine shrimp at 17:30',
      'Pip gets brine shrimp at 17:30',
      'Azure gets brine shrimp at 17:30',
      'Lemon gets brine shrimp at 17:30',
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
