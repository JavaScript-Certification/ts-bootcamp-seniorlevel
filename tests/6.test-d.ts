import { describe as group, expectTypeOf, it } from 'vitest'
import { winterSky } from '../src/_internal/night-sky'
import { type Star, type View, type ZoomPath, board, brightest, catalogue, focus } from '#exercise/6'

group('step 1: Star', () => {
  it('keeps every field of the four pieces', () => {
    expectTypeOf<Star>().toEqualTypeOf<{
      id: string
      name: string
      constellation: string
      ra: number
      dec: number
      magnitude: number
      distance: number
    }>()
  })
})

group('step 2: the exported types', () => {
  it('match what the code returns', () => {
    expectTypeOf(brightest).returns.toEqualTypeOf<Star | undefined>()
    expectTypeOf(catalogue).toEqualTypeOf<Star[]>()
    expectTypeOf(board).returns.toEqualTypeOf<string[]>()
  })
})

group('step 3: ZoomPath', () => {
  it('lists the paths through a view, four levels deep', () => {
    expectTypeOf<'zoom.zoom.star.name'>().toExtend<ZoomPath<View>>()
    expectTypeOf<'star.magnitude'>().toExtend<ZoomPath<View>>()
    // @ts-expect-error five levels is past the depth limit
    const tooDeep: ZoomPath<View> = 'zoom.zoom.zoom.star.name'
    void tooDeep
  })

  it('makes focus reject a path with a typo', () => {
    // @ts-expect-error nmae is not a field of Star
    focus(winterSky, 'zoom.star.nmae')
  })
})
