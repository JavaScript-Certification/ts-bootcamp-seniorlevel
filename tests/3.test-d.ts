import { describe as group, expectTypeOf, it } from 'vitest'
import { type CheckCheat, type Dash, type Hadouken, type ParamNames, type Params, combo, enterCheat, readCommand, scoreLine } from '#exercise/3'

group('step 1: ParamNames', () => {
  it('reads every :name of a pattern', () => {
    expectTypeOf<ParamNames<'/score/:player/:points'>>().toEqualTypeOf<'player' | 'points'>()
    expectTypeOf<ParamNames<'/lives/:player'>>().toEqualTypeOf<'player'>()
    expectTypeOf<ParamNames<'/reset'>>().toEqualTypeOf<never>()
  })

  it('gives readCommand and scoreLine exact params', () => {
    expectTypeOf<Params<'/score/:player/:points'>>().toEqualTypeOf<{ player: string; points: string }>()
    expectTypeOf(readCommand('/score/:player/:points', '/score/ada/4200')).toEqualTypeOf<{ player: string; points: string } | null>()
    expectTypeOf(scoreLine).parameters.toEqualTypeOf<[{ player: string; points: string }]>()
  })
})

group('step 2: Hadouken and combo', () => {
  it('Hadouken is a tuple of three moves', () => {
    expectTypeOf<Hadouken>().toEqualTypeOf<['down', 'right', 'punch']>()
    // @ts-expect-error a Hadouken has exactly three moves
    const short: Hadouken = ['down', 'right']
    void short
  })

  it('combo keeps every move of both tuples, in order', () => {
    const dash: Dash = ['right', 'right']
    const hadouken: Hadouken = ['down', 'right', 'punch']
    expectTypeOf(combo(dash, hadouken)).toEqualTypeOf<['right', 'right', 'down', 'right', 'punch']>()
  })
})

group('step 3: CheckCheat', () => {
  it('gives back a known cheat in capitals', () => {
    expectTypeOf<CheckCheat<'KONAMI'>>().toEqualTypeOf<'KONAMI'>()
    expectTypeOf(enterCheat('IDDQD')).toEqualTypeOf<string>()
  })

  it('turns a bad code into a readable message', () => {
    expectTypeOf<CheckCheat<'HACK'>>().toEqualTypeOf<'Unknown cheat code: HACK'>()
    expectTypeOf<CheckCheat<'konami'>>().toEqualTypeOf<'Cheat codes use capitals, try KONAMI'>()
  })

  it('refuses bad codes at the call', () => {
    // @ts-expect-error HACK is not a known cheat
    enterCheat('HACK')
    // @ts-expect-error cheat codes are typed in capitals
    enterCheat('konami')
  })
})
