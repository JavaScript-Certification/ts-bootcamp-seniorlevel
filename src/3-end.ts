import { type Move, hasEvery, matchPattern, paramNamesOf, scoreCommands } from './_internal/arcade-feed'
import { mountScene } from './_internal/scenes/arcade'

// Exercise 3: Pixel Arcade (solution)

// Step 1: two template literal types read one :name each, the recursion reads the rest
export type ParamNames<Pattern extends string> =
  Pattern extends `${string}:${infer Name}/${infer Rest}`
    ? Name | ParamNames<Rest>
    : Pattern extends `${string}:${infer Name}`
      ? Name
      : never

// Given: one string per param name
export type Params<Pattern extends string> = { [Name in ParamNames<Pattern>]: string }

// Given: reads a path with a pattern, typed by your Params
export function readCommand<P extends string>(pattern: P, path: string): Params<P> | null {
  const values = matchPattern(pattern, path)
  return values !== null && hasEvery<Params<P>>(values, paramNamesOf(pattern)) ? values : null
}

// Step 1 (continued): score.player and score.points are both string now
export function scoreLine(score: Params<'/score/:player/:points'>): string {
  return `${score.player.toUpperCase()} ${score.points}`
}

// Given: a labelled tuple, each element says what it is for
export type Dash = [first: 'right', second: 'right']

// Step 2: a labelled tuple of three moves
export type Hadouken = [down: 'down', forward: 'right', fire: 'punch']

// Step 2 (continued): a variadic tuple type keeps both tuples, in order
export function combo<A extends readonly Move[], B extends readonly Move[]>(first: A, second: B): [...A, ...B] {
  return [...first, ...second]
}

// Given: the cheat codes the cabinet knows
export type KnownCheat = 'KONAMI' | 'IDDQD' | 'NOCLIP'

// Given: two small helpers for logic in the type system
export type If<Condition extends boolean, Then, Else> = Condition extends true ? Then : Else
export type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

// Step 3: Code when it passes, otherwise a message the compiler shows at the call
export type CheckCheat<Code extends string> =
  If<Equals<Code, Uppercase<Code>>,
    If<Code extends KnownCheat ? true : false, Code, `Unknown cheat code: ${Code}`>,
    `Cheat codes use capitals, try ${Uppercase<Code>}`>

// Given: the cabinet only accepts the codes that pass CheckCheat
export function enterCheat<Code extends string>(code: CheckCheat<Code>): string {
  return `Cheat on: ${code}`
}

// Given: tonight's moves and the board
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
