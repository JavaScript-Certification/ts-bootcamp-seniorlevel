import { describe as group, expectTypeOf, it } from 'vitest'
import { type Signals, shine } from '#exercise/5'

group('step 1: a generic shine, typed by the declarations', () => {
  it('keeps the exact signal and its character', () => {
    expectTypeOf(shine('storm').signal).toEqualTypeOf<'storm'>()
    expectTypeOf(shine('storm').character).toEqualTypeOf<'Q'>()
    expectTypeOf(shine('harbour').character).toEqualTypeOf<'Fl'>()
    expectTypeOf(shine('ship').pattern).toEqualTypeOf<string>()
  })

  it('refuses a signal the lamp does not know', () => {
    // @ts-expect-error hurricane is not one of the Signals
    shine('hurricane')
  })
})

group('step 2: the fog signal, merged into Signals', () => {
  it('knows fog and its character', () => {
    expectTypeOf<Signals['fog']>().toEqualTypeOf<'Iso'>()
    expectTypeOf(shine('fog').character).toEqualTypeOf<'Iso'>()
  })

  it('keeps the signals of the vendor', () => {
    expectTypeOf<keyof Signals>().toEqualTypeOf<'harbour' | 'ship' | 'storm' | 'fog'>()
  })
})
