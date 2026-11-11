import { readFileSync } from 'node:fs'
import { describe as group, expect, it, vi } from 'vitest'

// importing the exercise prints the board: keep the test output clean
vi.spyOn(console, 'log').mockImplementation(() => {})
const { board, combo, enterCheat, readCommand, scoreLine } = await import('#exercise/3')
const source = readFileSync(new URL(`../src/3-${process.env.SOLUTION ? 'end' : 'begin'}.ts`, import.meta.url), 'utf8')
const code = source.replace(/\/\/.*$/gm, '') // the starter shows the skeletons in comments

// Most of this exercise lives in the types: their checks are in tests/3.test-d.ts

group('given: readCommand', () => {
  it('reads the params of a command', () => {
    expect(readCommand('/score/:player/:points', '/score/ada/4200')).toEqual({ player: 'ada', points: '4200' })
  })

  it('returns null when the command does not match', () => {
    expect(readCommand('/score/:player/:points', '/score/ada')).toBeNull()
    expect(readCommand('/score/:player/:points', '/reset/ada/4200')).toBeNull()
  })
})

group('step 1: ParamNames and scoreLine', () => {
  it('writes the player in capitals, then the points', () => {
    expect(scoreLine({ player: 'ada', points: '4200' })).toBe('ADA 4200')
    expect(scoreLine({ player: 'bo', points: '2750' })).toBe('BO 2750')
  })

  it('reads the names with infer in a template literal type', () => {
    expect(code).toMatch(/`[^`]*\$\{\s*infer\s+\w+\s*\}/)
  })
})

group('step 2: Hadouken and combo', () => {
  it('joins two move tuples, in order', () => {
    expect(combo(['right', 'right'], ['down', 'right', 'punch'])).toEqual(['right', 'right', 'down', 'right', 'punch'])
    expect(combo([], ['kick'])).toEqual(['kick'])
  })

  it('leaves both tuples untouched', () => {
    const first = ['up', 'up'] as const
    const second = ['kick'] as const
    combo(first, second)
    expect(first).toEqual(['up', 'up'])
    expect(second).toEqual(['kick'])
  })

  it('labels each element of Hadouken', () => {
    expect(code).toMatch(/type Hadouken\s*=\s*\[\s*\w+\s*:\s*'down'\s*,\s*\w+\s*:\s*'right'\s*,\s*\w+\s*:\s*'punch'\s*\]/)
  })
})

group('step 3: CheckCheat', () => {
  it('builds CheckCheat with If, Equals and Uppercase', () => {
    const checkCheat = code.slice(code.indexOf('type CheckCheat'), code.indexOf('export function enterCheat'))
    expect(checkCheat).toMatch(/\bIf\s*</)
    expect(checkCheat).toMatch(/\bEquals\s*</)
    expect(checkCheat).toMatch(/\bUppercase\s*</)
  })

  it('still lets a known cheat in', () => {
    expect(enterCheat('KONAMI')).toBe('Cheat on: KONAMI')
  })
})

group('the board', () => {
  it('prints the whole board', () => {
    expect(board()).toEqual([
      'High score: ADA 4200',
      'High score: LIN 3900',
      'High score: BO 2750',
      'Combo: right right down right punch',
      'Cheat on: KONAMI',
    ])
  })
})

group('no shortcuts', () => {
  it('uses no any, no as and no ts-ignore', () => {
    expect(source).not.toMatch(/\bany\b/)
    expect(code).not.toMatch(/\bas\s+\w/)
    expect(source).not.toMatch(/@ts-(ignore|nocheck|expect-error)/)
  })
})
