import { config, glasshouse, merge, sensors, type GlasshouseConfig } from './_internal/glasshouse'
import { mountScene } from './_internal/scenes/glasshouse'

// Exercise 2: Glasshouse Garden
// Follow the steps in the exercise instructions. The page shows the glasshouse as you go.

// Given: every sensor is a function that returns its reading
type Sensors = typeof sensors

// Step 1: replace unknown with a conditional type. When F is a function, infer what it returns:
//   F extends () => infer R ? ... : never
export type ReadingOf<F> = unknown

// Step 1 (continued): replace this Record with a mapped type over keyof Sensors
// that applies ReadingOf to each sensor
export type Readings = Record<keyof Sensors, unknown>

// Given: reads every sensor once
export function readAll(): Readings {
  return { temperature: sensors.temperature(), humidity: sensors.humidity(), light: sensors.light() }
}

// Step 2: replace {} with a mapped type that renames every key K of T with `as`,
// from `temperature` to `onTemperatureChange`, and gives it a (value: T[K]) => void handler
export type Handlers<T> = {}

// Step 2 (continued): once Handlers is written, the compiler asks for one handler per sensor.
// Open the vents above 25 °C, turn the misters on below 55 %, roll the shade down when it is bright.
export const handlers: Handlers<Readings> = {}

// Step 3: Partial only reaches the first level. Make DeepPartial recursive: every key
// optional, and a value that is an object goes through DeepPartial again.
export type DeepPartial<T> = Partial<T>

// Given: merges a patch into a copy of the settings, config itself never changes
export function update(patch: DeepPartial<GlasshouseConfig>): GlasshouseConfig {
  return merge(config, patch)
}

// Step 3 (continued): switch the orchid lamp on for 6 hours with
//   update({ beds: { orchids: { lamp: { on: true, hours: 6 } } } })
export const settings = update({})

// Shows your work on the page (and prints the day in the console). You do not need to change this line.
mountScene({ readAll, handlers, settings })
