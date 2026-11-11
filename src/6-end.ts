import { stars, winterSky } from './_internal/night-sky'
import { mountScene } from './_internal/scenes/observatory'

// Exercise 6: Night Observatory (solution)

// Given: the pieces a catalogue entry is made of
interface Identity { id: string; name: string }
interface Position { constellation: string; ra: number; dec: number }
interface Brightness { magnitude: number }
interface Distance { distance: number }

// Step 1: one named interface that extends the pieces, instead of an intersection
export interface Star extends Identity, Position, Brightness, Distance {}

// Given: what the telescope sees. Each view holds its brightest star, and can zoom further in.
export interface View {
  name: string
  star: Star
  zoom?: View
}

// Step 3: a depth counter that stops the recursion after four levels
export type ZoomPath<T, Prefix extends string = '', Depth extends unknown[] = []> =
  Depth['length'] extends 4
    ? never
    : T extends object
      ? {
          [K in keyof T & string]:
            | `${Prefix}${K}`
            | ZoomPath<T[K], `${Prefix}${K}.`, [...Depth, unknown]>
        }[keyof T & string]
      : never

// Step 2: an explicit type on every export, so each file can be checked on its own
export function describe(star: Star): string {
  return `${star.name} in ${star.constellation}, magnitude ${star.magnitude}`
}

export function brightest(list: readonly Star[]): Star | undefined {
  return list.reduce<Star | undefined>((best, star) => (best && best.magnitude <= star.magnitude ? best : star), undefined)
}

export function inConstellation(list: readonly Star[], name: string): string[] {
  return list.filter(star => star.constellation === name).map(star => star.name)
}

export const catalogue: Star[] = [...stars].sort((a, b) => a.magnitude - b.magnitude)

// Given: follows a dotted path through the views
// Step 3: the path is a ZoomPath<View>, so a typo no longer compiles
export function focus(view: View, path: ZoomPath<View>): unknown {
  let current: unknown = view
  for (const key of path.split('.')) {
    current = typeof current === 'object' && current !== null ? Reflect.get(current, key) : undefined
  }
  return current
}

// Given: the observatory board (the data is in src/_internal/night-sky.ts)
export function board(): string[] {
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
