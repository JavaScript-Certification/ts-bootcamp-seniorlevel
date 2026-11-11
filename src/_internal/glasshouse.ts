// The glasshouse: its sensors, its actuators and its settings. You do not need to modify this file.

// ---------- sensors: each one is a function that returns its reading ----------

type Light = 'dim' | 'bright'
type Weather = { temperature: number; humidity: number; light: Light }

/** What the sensors measure at each hour of the day the page plays */
export const day: readonly (Weather & { hour: string })[] = [
  { hour: '08:00', temperature: 19.5, humidity: 72, light: 'dim' },
  { hour: '11:00', temperature: 23, humidity: 61, light: 'bright' },
  { hour: '14:00', temperature: 27.5, humidity: 48, light: 'bright' },
]

const fallback: Weather = { temperature: 27.5, humidity: 48, light: 'bright' }
let hour = '14:00'

/** Moves the glasshouse clock (the page plays the day with it) */
export function setHour(next: string): void {
  hour = next
}

const now = (): Weather => day.find(moment => moment.hour === hour) ?? fallback

export const sensors = {
  temperature: (): number => now().temperature,
  humidity: (): number => now().humidity,
  light: (): Light => now().light,
}

// ---------- actuators: what your handlers switch ----------

type Actuators = { vents: boolean; misters: boolean; shade: boolean }

const state: Actuators = { vents: false, misters: false, shade: false }

export const glasshouse = {
  /** true opens the roof vents, false closes them */
  vents(open: boolean): void {
    state.vents = open
  },
  /** true turns the misters on, false turns them off */
  misters(on: boolean): void {
    state.misters = on
  },
  /** true rolls the shade blind down, false rolls it up */
  shade(down: boolean): void {
    state.shade = down
  },
}

/** A copy of what the actuators are doing right now */
export function actuators(): Actuators {
  return { ...state }
}

/** Closes the vents, stops the misters and rolls the blind up */
export function resetActuators(): void {
  state.vents = false
  state.misters = false
  state.shade = false
}

// ---------- settings: a nested object, patched with update ----------

export type Bed = {
  plant: string
  water: { litres: number; at: string }
  lamp: { on: boolean; hours: number }
}

export type GlasshouseConfig = {
  name: string
  beds: { herbs: Bed; tomatoes: Bed; orchids: Bed }
}

export const config: GlasshouseConfig = {
  name: 'Glasshouse Garden',
  beds: {
    herbs: { plant: 'basil', water: { litres: 1, at: '07:00' }, lamp: { on: false, hours: 0 } },
    tomatoes: { plant: 'tomato', water: { litres: 2, at: '07:30' }, lamp: { on: false, hours: 0 } },
    orchids: { plant: 'orchid', water: { litres: 0.5, at: '08:00' }, lamp: { on: false, hours: 0 } },
  },
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeInto(target: object, patch: object): void {
  for (const key of Object.keys(patch)) {
    const next: unknown = Reflect.get(patch, key)
    if (next === undefined) continue
    const current: unknown = Reflect.get(target, key)
    if (isObject(current) && isObject(next)) mergeInto(current, next)
    else Reflect.set(target, key, next)
  }
}

/** A deep copy of base with every value of patch written into it. base itself never changes. */
export function merge<T>(base: T, patch: object): T {
  const copy = structuredClone(base)
  if (isObject(copy)) mergeInto(copy, patch)
  return copy
}
