import { readFileSync } from 'node:fs'
import { describe as group, expect, it, vi } from 'vitest'
import { actuators, config, resetActuators } from '../src/_internal/glasshouse'

// importing the exercise prints the day: keep the test output clean
vi.spyOn(console, 'log').mockImplementation(() => {})
const { handlers, readAll, settings, update } = await import('#exercise/2')
const source = readFileSync(new URL(`../src/2-${process.env.SOLUTION ? 'end' : 'begin'}.ts`, import.meta.url), 'utf8')
const code = source.replace(/\/\/.*$/gm, '') // the starter shows the shapes in comments

// ReadingOf, Readings, Handlers and DeepPartial are types: their checks are in tests/2.test-d.ts

/** Calls a handler by name, so the test also runs (and fails) while handlers is still {} */
function call(name: string, value: unknown): void {
  const handler: unknown = Reflect.get(handlers, name)
  if (typeof handler !== 'function') throw new Error(`handlers has no ${name}`)
  Reflect.apply(handler, handlers, [value])
}

group('step 1: ReadingOf and Readings', () => {
  it('infers what each sensor returns', () => {
    expect(code).toMatch(/type\s+ReadingOf\s*<\s*\w+\s*>\s*=[^\n]*\bextends\b[^\n]*\binfer\b/)
  })

  it('maps Readings over the keys of the sensors', () => {
    expect(code).toMatch(/type\s+Readings\s*=\s*\{\s*\[\s*\w+\s+in\s+keyof\s+[^\]]+\]\s*:\s*ReadingOf\s*</)
  })

  it('still reads every sensor', () => {
    expect(readAll()).toEqual({ temperature: 27.5, humidity: 48, light: 'bright' })
  })
})

group('step 2: Handlers and the handlers', () => {
  it('opens the vents above 25 °C only', () => {
    resetActuators()
    call('onTemperatureChange', 27.5)
    expect(actuators().vents).toBe(true)
    call('onTemperatureChange', 19.5)
    expect(actuators().vents).toBe(false)
  })

  it('turns the misters on below 55 % only', () => {
    resetActuators()
    call('onHumidityChange', 48)
    expect(actuators().misters).toBe(true)
    call('onHumidityChange', 72)
    expect(actuators().misters).toBe(false)
  })

  it('rolls the shade down when it is bright only', () => {
    resetActuators()
    call('onLightChange', 'bright')
    expect(actuators().shade).toBe(true)
    call('onLightChange', 'dim')
    expect(actuators().shade).toBe(false)
  })

  it('renames the keys with as and Capitalize', () => {
    expect(code).toMatch(/\[\s*\w+\s+in\s+keyof\s+\w+\s+as\s+`on\$\{\s*Capitalize\s*</)
  })
})

group('step 3: DeepPartial and the lamp patch', () => {
  it('switches the orchid lamp on for 6 hours', () => {
    expect(settings.beds.orchids.lamp).toEqual({ on: true, hours: 6 })
  })

  it('keeps everything the patch does not mention', () => {
    expect(settings.beds.orchids.water).toEqual({ litres: 0.5, at: '08:00' })
    expect(settings.beds.herbs).toEqual(config.beds.herbs)
    expect(settings.name).toBe('Glasshouse Garden')
  })

  it('never changes config itself', () => {
    expect(config.beds.orchids.lamp).toEqual({ on: false, hours: 0 })
    expect(update({}).beds.orchids.lamp.on).toBe(false)
  })

  it('makes DeepPartial recursive', () => {
    expect(code).toMatch(/type\s+DeepPartial\s*<\s*(\w+)\s*>\s*=[\s\S]*?DeepPartial\s*<\s*\1\s*\[/)
  })
})

group('no shortcuts', () => {
  it('uses no any, no type assertion and no ts-ignore', () => {
    expect(source).not.toMatch(/\bany\b/)
    // `as` is only allowed in the key remapping of a mapped type
    expect(code.replace(/\bin\s+keyof\s+\w+\s+as\b/g, '')).not.toMatch(/\bas\b/)
    expect(source).not.toMatch(/@ts-(ignore|nocheck|expect-error)/)
  })
})
