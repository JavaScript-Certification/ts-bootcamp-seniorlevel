import { stars, winterSky } from './_internal/night-sky'
import { mountScene } from './_internal/scenes/observatory'

// Exercise 6: Night Observatory
// Follow the steps in notion/exercise-6.md. The code already runs: you make it cheaper to check.
// `npm run check:6` checks this file with isolatedDeclarations and prints the compiler's counters.

// Given: the pieces a catalogue entry is made of
interface Identity { id: string; name: string }
interface Position { constellation: string; ra: number; dec: number }
interface Brightness { magnitude: number }
interface Distance { distance: number }

// Step 1: replace this intersection with one interface that extends the four pieces
//   export interface Star extends ..., ... {}
export type Star = Identity & Position & Brightness & Distance

// Given: what the telescope sees. Each view holds its brightest star, and can zoom further in.
export interface View {
  name: string
  star: Star
  zoom?: View
}

// Given: every dotted path through a type, such as 'zoom.star.name'
// Step 3: add a third type parameter, a Depth counter, and stop when it reaches 4
//   export type ZoomPath<T, Prefix extends string = '', Depth extends unknown[] = []> =
//     Depth['length'] extends 4 ? never : ...
export type ZoomPath<T, Prefix extends string = ''> =
  T extends object
    ? {
        [K in keyof T & string]:
          | `${Prefix}${K}`
          | ZoomPath<T[K], `${Prefix}${K}.`>
      }[keyof T & string]
    : never

// Step 2: add an explicit type to every export below that has none (describe and focus show the way)
export function describe(star: Star): string {
  return `${star.name} in ${star.constellation}, magnitude ${star.magnitude}`
}

export function brightest(list: readonly Star[]) {
  return list.reduce<Star | undefined>((best, star) => (best && best.magnitude <= star.magnitude ? best : star), undefined)
}

export function inConstellation(list: readonly Star[], name: string) {
  return list.filter(star => star.constellation === name).map(star => star.name)
}

export const catalogue = [...stars].sort((a, b) => a.magnitude - b.magnitude)

// Given: follows a dotted path through the views
// Step 3 (start here): type the path as ZoomPath<View> instead of string, and watch the compiler
export function focus(view: View, path: string): unknown {
  let current: unknown = view
  for (const key of path.split('.')) {
    current = typeof current === 'object' && current !== null ? Reflect.get(current, key) : undefined
  }
  return current
}

// Given: the observatory board (the data is in src/_internal/night-sky.ts)
export function board() {
  const top = brightest(catalogue)
  const name = focus(winterSky, 'zoom.zoom.star.name')
  const target = catalogue.find(star => star.name === name)
  return [
    `${catalogue.length} stars catalogued`,
    `Brightest: ${top ? describe(top) : 'none'}`,
    `Orion: ${inConstellation(catalogue, 'Orion').join(', ')}`,
    `Latest: ${target ? describe(target) : 'nothing in focus'}`,
  ]
}

// Shows your work on the page (and prints the board in the console). You do not need to change this line.
mountScene({ catalogue, focus, board })
