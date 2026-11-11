import { describe as group, expectTypeOf, it } from 'vitest'
import { type DeepPartial, type Handlers, type ReadingOf, type Readings, handlers, update } from '#exercise/2'
import type { GlasshouseConfig, sensors } from '../src/_internal/glasshouse'

type Sensors = typeof sensors

group('step 1: ReadingOf and Readings', () => {
  it('infers what a function returns', () => {
    expectTypeOf<ReadingOf<() => number>>().toEqualTypeOf<number>()
    expectTypeOf<ReadingOf<() => 'dim' | 'bright'>>().toEqualTypeOf<'dim' | 'bright'>()
  })

  it('gives never for anything that is not a function', () => {
    expectTypeOf<ReadingOf<string>>().toEqualTypeOf<never>()
  })

  it('distributes over a union of sensors', () => {
    expectTypeOf<ReadingOf<Sensors[keyof Sensors]>>().toEqualTypeOf<number | 'dim' | 'bright'>()
  })

  it('maps every sensor to its reading', () => {
    expectTypeOf<Readings>().toEqualTypeOf<{ temperature: number; humidity: number; light: 'dim' | 'bright' }>()
  })
})

group('step 2: Handlers', () => {
  it('renames each key and types its value', () => {
    expectTypeOf<Handlers<{ temperature: number }>>().toEqualTypeOf<{ onTemperatureChange: (value: number) => void }>()
  })

  it('has one handler per sensor', () => {
    expectTypeOf<keyof Handlers<Readings>>().toEqualTypeOf<'onTemperatureChange' | 'onHumidityChange' | 'onLightChange'>()
    expectTypeOf(handlers.onLightChange).parameters.toEqualTypeOf<['dim' | 'bright']>()
  })

  it('rejects a handler with the wrong name or the wrong value', () => {
    // @ts-expect-error the key is onTemperatureChange, not onTemperatureChanged
    const misnamed: Partial<Handlers<Readings>> = { onTemperatureChanged: () => {} }
    // @ts-expect-error the light reading is 'dim' | 'bright', not a number
    const wrongValue: Handlers<Readings>['onLightChange'] = (value: number) => void value
    void [misnamed, wrongValue]
  })
})

group('step 3: DeepPartial', () => {
  it('makes every level optional', () => {
    expectTypeOf({ beds: { orchids: { lamp: { on: true } } } }).toExtend<DeepPartial<GlasshouseConfig>>()
    expectTypeOf({}).toExtend<DeepPartial<GlasshouseConfig>>()
  })

  it('still checks the values deep down', () => {
    // @ts-expect-error on is a boolean
    const wrong: DeepPartial<GlasshouseConfig> = { beds: { orchids: { lamp: { on: 'yes' } } } }
    // @ts-expect-error there is no cactus bed
    const unknownBed: DeepPartial<GlasshouseConfig> = { beds: { cactus: { lamp: { on: true } } } }
    void [wrong, unknownBed]
  })

  it('update takes a deep patch and returns the whole config', () => {
    expectTypeOf(update).parameters.toEqualTypeOf<[DeepPartial<GlasshouseConfig>]>()
    expectTypeOf(update).returns.toEqualTypeOf<GlasshouseConfig>()
  })
})
