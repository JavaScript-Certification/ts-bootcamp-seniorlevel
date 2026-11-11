import { readFileSync } from 'node:fs'
import { describe as group, expect, it, vi } from 'vitest'

// importing the exercise prints the signals: keep the test output clean
vi.spyOn(console, 'log').mockImplementation(() => {})
const { shine } = await import('#exercise/5')
const side = process.env.SOLUTION ? 'end' : 'begin'
const source = readFileSync(new URL(`../src/5-${side}.ts`, import.meta.url), 'utf8')
const code = source.replace(/\/\/.*$/gm, '') // the starter describes the steps in comments
const typeTests = readFileSync(new URL(`./5-${side}.test-d.ts`, import.meta.url), 'utf8')

// what the lamp really does, whatever the types say: shine is called with a plain string
const lightFor = (signal: string): unknown => Reflect.apply(shine, undefined, [signal])

// the declarations of step 1 are types: their checks are in tests/5.test-d.ts

group('step 1: the Beacon declarations and shine', () => {
  it('declares the Beacon global with an object type', () => {
    expect(code).toMatch(/declare\s+const\s+Beacon\s*:\s*\{/)
  })

  it('shine returns the light of each signal the lamp knows', () => {
    expect(lightFor('harbour')).toEqual({ signal: 'harbour', character: 'Fl', pattern: '#.......' })
    expect(lightFor('ship')).toEqual({ signal: 'ship', character: 'Oc', pattern: '######..' })
    expect(lightFor('storm')).toEqual({ signal: 'storm', character: 'Q', pattern: '#.#.#.#.' })
  })
})

group('step 2: the fog signal', () => {
  it('reopens Signals instead of editing the published block', () => {
    expect(code.match(/interface\s+Signals\b/g)?.length).toBe(2)
    expect(code).toMatch(/interface\s+Signals\s*\{[^}]*\bfog\s*:\s*'Iso'/)
  })

  it('teaches the lamp the fog signal', () => {
    expect(lightFor('fog')).toEqual({ signal: 'fog', character: 'Iso', pattern: '####....' })
  })
})

group('step 3: your type tests', () => {
  const body = typeTests.replace(/^\s*\/\/(?!\s*@ts-expect-error).*$/gm, '')

  it('checks two signals with expectTypeOf', () => {
    expect(body.match(/expectTypeOf\s*[(<]/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(body).toMatch(/fog/)
  })

  it('proves a wrong call does not compile with @ts-expect-error', () => {
    expect(body).toMatch(/^\s*\/\/\s*@ts-expect-error/m)
  })
})

group('no shortcuts', () => {
  it('uses no any, no as and no ts-ignore in the exercise file', () => {
    expect(code).not.toMatch(/\bany\b/)
    expect(code).not.toMatch(/\bas\s+(?!const\b)[A-Za-z{[(]/)
    expect(source).not.toMatch(/@ts-(ignore|nocheck|expect-error)/)
  })
})
