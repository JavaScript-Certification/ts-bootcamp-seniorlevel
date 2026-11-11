import { describe, expectTypeOf, it } from 'vitest'
import { shine } from '../src/5-begin'

// Step 3: your type tests. Only the compiler runs them, with `npm test`.
describe('my harbour signals', () => {
  it('shows the right character', () => {
    // check the character of shine('fog') with expectTypeOf, then one more signal
  })

  it('refuses a signal the lamp does not know', () => {
    // put a call that must not compile here, with the directive that expects an error above it
  })
})
