import { config, glasshouse, merge, sensors, type GlasshouseConfig } from './_internal/glasshouse'
import { mountScene } from './_internal/scenes/glasshouse'

// Exercise 2: Glasshouse Garden (solution)

// Given: every sensor is a function that returns its reading
type Sensors = typeof sensors

// Step 1: a conditional type that infers what a function returns
export type ReadingOf<F> = F extends () => infer R ? R : never

// Step 1 (continued): a mapped type over the sensors, one reading per key
export type Readings = { [K in keyof Sensors]: ReadingOf<Sensors[K]> }

// Given: reads every sensor once
export function readAll(): Readings {
  return { temperature: sensors.temperature(), humidity: sensors.humidity(), light: sensors.light() }
}

// Step 2: key remapping with `as`, from `temperature` to `onTemperatureChange`
export type Handlers<T> = {
  [K in keyof T as `on${Capitalize<K & string>}Change`]: (value: T[K]) => void
}

// Step 2 (continued): one handler per sensor, each value typed by Handlers
export const handlers: Handlers<Readings> = {
  onTemperatureChange: (value) => glasshouse.vents(value > 25),
  onHumidityChange: (value) => glasshouse.misters(value < 55),
  onLightChange: (value) => glasshouse.shade(value === 'bright'),
}

// Step 3: a recursive mapped type, every key optional at every depth
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

// Given: merges a patch into a copy of the settings, config itself never changes
export function update(patch: DeepPartial<GlasshouseConfig>): GlasshouseConfig {
  return merge(config, patch)
}

// Step 3 (continued): a patch four levels deep
export const settings = update({ beds: { orchids: { lamp: { on: true, hours: 6 } } } })

// Shows your work on the page (and prints the day in the console). You do not need to change this line.
mountScene({ readAll, handlers, settings })
