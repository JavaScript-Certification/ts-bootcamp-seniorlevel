import { type Move, hasEvery, matchPattern, paramNamesOf, scoreCommands } from './_internal/arcade-feed'
import { mountScene } from './_internal/scenes/arcade'

// Exercise 3: Pixel Arcade
// Follow the steps in notion/exercise-3.md. The cabinet screen shows your work as you go.

// Step 1: the names of the :params in a command pattern, so that
// ParamNames<'/score/:player/:points'> is 'player' | 'points'. Use two template literal types:
//   Pattern extends `${string}:${infer Name}/${infer Rest}` ? Name | ParamNames<Rest>
//   : Pattern extends `${string}:${infer Name}` ? Name : never
export type ParamNames<Pattern extends string> = never

// Given: one string per param name
export type Params<Pattern extends string> = { [Name in ParamNames<Pattern>]: string }

// Given: reads a path with a pattern, typed by your Params.
// readCommand('/score/:player/:points', '/score/ada/4200') gives { player: 'ada', points: '4200' }
export function readCommand<P extends string>(pattern: P, path: string): Params<P> | null {
  const values = matchPattern(pattern, path)
  return values !== null && hasEvery<Params<P>>(values, paramNamesOf(pattern)) ? values : null
}

// Step 1 (continued): return the player in capitals, a space and the points, like 'ADA 4200'
export function scoreLine(score: Params<'/score/:player/:points'>): string {
  return '???'
}

// Given: a labelled tuple, each element says what it is for
export type Dash = [first: 'right', second: 'right']

// Step 2: make Hadouken a labelled tuple of three moves: 'down', then 'right', then 'punch'
export type Hadouken = Move[]

// Step 2 (continued): join two move tuples into one, keeping every move in order:
//   export function combo<A extends readonly Move[], B extends readonly Move[]>(first: A, second: B): [...A, ...B]
export function combo(first: readonly Move[], second: readonly Move[]): Move[] {
  return []
}

// Given: the cheat codes the cabinet knows
export type KnownCheat = 'KONAMI' | 'IDDQD' | 'NOCLIP'

// Given: two small helpers for logic in the type system
export type If<Condition extends boolean, Then, Else> = Condition extends true ? Then : Else
export type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

// Step 3: give back Code when it is a known cheat in capitals, or a message the compiler will show:
//   If<Equals<Code, Uppercase<Code>>,
//     If<Code extends KnownCheat ? true : false, Code, `Unknown cheat code: ${Code}`>,
//     `Cheat codes use capitals, try ${Uppercase<Code>}`>
export type CheckCheat<Code extends string> = Code

// Given: the cabinet only accepts the codes that pass CheckCheat
export function enterCheat<Code extends string>(code: CheckCheat<Code>): string {
  return `Cheat on: ${code}`
}

// Given: tonight's moves and the board, nothing to change below this line
const dash: Dash = ['right', 'right']
const hadouken: Hadouken = ['down', 'right', 'punch']

export function board(): string[] {
  const scores = scoreCommands.map(path => readCommand('/score/:player/:points', path))
  return [
    ...scores.map(score => (score ? `High score: ${scoreLine(score)}` : 'High score: unreadable')),
    `Combo: ${combo(dash, hadouken).join(' ')}`,
    enterCheat('KONAMI'),
  ]
}

// Shows your work on the cabinet (and prints the board in the console). You do not need to change this line.
mountScene({ scoreLine, combo, enterCheat, board })
