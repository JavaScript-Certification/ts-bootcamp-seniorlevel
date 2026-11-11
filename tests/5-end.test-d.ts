import { describe, expectTypeOf, it } from 'vitest'
import { shine } from '../src/5-end'

// Step 3: the type tests of the solution. Only the compiler runs them, with `npm test`.
describe('my harbour signals', () => {
  it('shows the right character', () => {
    expectTypeOf(shine('fog').character).toEqualTypeOf<'Iso'>()
    expectTypeOf(shine('storm').character).toEqualTypeOf<'Q'>()
  })

  it('refuses a signal the lamp does not know', () => {
    // @ts-expect-error hurricane is not one of the Signals
    shine('hurricane')
  })
})
