// What the cabinet received tonight, and the helpers that read it. You do not need to modify this file.

/** The moves the joystick and the two buttons can send */
export type Move = 'up' | 'down' | 'left' | 'right' | 'punch' | 'kick'

/** Score commands, sent by the cabinet after each game */
export const scoreCommands: readonly string[] = ['/score/ada/4200', '/score/lin/3900', '/score/bo/2750']

/** Reads a path with a pattern: matchPattern('/score/:player/:points', '/score/ada/4200') gives { player: 'ada', points: '4200' } */
export function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const expected = pattern.split('/')
  const actual = path.split('/')
  if (expected.length !== actual.length) return null
  const values: Record<string, string> = {}
  for (const [i, part] of expected.entries()) {
    const value = actual[i] ?? ''
    if (part.startsWith(':')) {
      if (value === '') return null
      values[part.slice(1)] = value
    } else if (part !== value) {
      return null
    }
  }
  return values
}

/** The :names of a pattern: paramNamesOf('/score/:player/:points') gives ['player', 'points'] */
export function paramNamesOf(pattern: string): string[] {
  return pattern.split('/').filter(part => part.startsWith(':')).map(part => part.slice(1))
}

/** True when values holds a string for every name. T is the type those names describe */
export function hasEvery<T extends Record<string, string>>(values: Record<string, string>, names: readonly string[]): values is T {
  return names.every(name => typeof values[name] === 'string')
}
