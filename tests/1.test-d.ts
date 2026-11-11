import { describe as group, expectTypeOf, it } from 'vitest'
import { type Feeder, type Keeper, type Plan, type Tank, feedTank, pellets, reef, treats } from '#exercise/1'
import type { Clownfish, Fish, ReefFish } from '../src/_internal/reef-tank'

group('step 1: Tank produces, Feeder consumes', () => {
  it('a tank of clownfish is a tank of fish', () => {
    expectTypeOf<Tank<Clownfish>>().toExtend<Tank<Fish>>()
    expectTypeOf<Tank<Fish>>().not.toExtend<Tank<Clownfish>>()
  })

  it('a feeder for any fish can feed clownfish, not the reverse', () => {
    expectTypeOf<Feeder<Fish>>().toExtend<Feeder<Clownfish>>()
    expectTypeOf<Feeder<Clownfish>>().not.toExtend<Feeder<Fish>>()
  })

  it('refuses to feed the whole reef with pellets for clownfish', () => {
    // @ts-expect-error the tangs have no anemone
    feedTank(reef, pellets)
  })
})

group('step 2: a function property is checked strictly', () => {
  it('a keeper for clownfish cannot look after every reef fish', () => {
    const clownKeeper: Keeper<Clownfish> = { note: fish => fish.anemone }
    // @ts-expect-error a tang would reach a keeper who only knows clownfish
    const onDuty: Keeper<ReefFish> = clownKeeper
    void onDuty
  })

  it('a keeper for any fish can look after the reef', () => {
    expectTypeOf<Keeper<Fish>>().toExtend<Keeper<ReefFish>>()
  })
})

group('step 3: treats', () => {
  it('takes a plan and returns lines', () => {
    expectTypeOf(treats).parameters.toEqualTypeOf<[Plan]>()
    expectTypeOf(treats).returns.toEqualTypeOf<string[]>()
  })
})
