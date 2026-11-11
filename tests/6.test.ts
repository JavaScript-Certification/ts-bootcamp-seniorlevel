import { readFileSync } from 'node:fs'
import { describe as group, expect, it, vi } from 'vitest'
import { stars, winterSky } from '../src/_internal/night-sky'

// importing the exercise prints the board: keep the test output clean
vi.spyOn(console, 'log').mockImplementation(() => {})
const { board, brightest, catalogue, describe, focus, inConstellation } = await import('#exercise/6')
const source = readFileSync(new URL(`../src/6-${process.env.SOLUTION ? 'end' : 'begin'}.ts`, import.meta.url), 'utf8')
const code = source.replace(/\/\/.*$/gm, '') // the starter shows the answers in comments

// Every step of this exercise changes types, not what runs. The runtime groups check the code still
// works, the source checks look at your file, and tests/6.test-d.ts checks the types themselves.

// the text of one export, up to the next export
function exported(name: string): string {
  const from = code.search(new RegExp(`export (?:function|const|type|interface) ${name}\\b`))
  if (from < 0) return ''
  const rest = code.slice(from)
  const next = rest.slice(1).search(/\nexport /)
  return next < 0 ? rest : rest.slice(0, next + 1)
}

group('given: the observatory board', () => {
  it('prints the catalogue, the brightest star and the star in focus', () => {
    expect(board()).toEqual([
      '10 stars catalogued',
      'Brightest: Sirius in Canis Major, magnitude -1.46',
      'Orion: Rigel, Betelgeuse, Bellatrix, Alnilam, Alnitak, Saiph, Mintaka',
      'Latest: Alnilam in Orion, magnitude 1.69',
    ])
  })

  it('describes a star', () => {
    const rigel = stars[1]
    expect(rigel && describe(rigel)).toBe('Rigel in Orion, magnitude 0.13')
  })
})

group('step 1: Star is one interface', () => {
  it('declares Star as an interface that extends the four pieces', () => {
    expect(code).toMatch(/interface\s+Star\s+extends\s+Identity\s*,\s*Position\s*,\s*Brightness\s*,\s*Distance\s*\{\s*\}/)
  })

  it('no longer builds Star with &', () => {
    expect(code).not.toMatch(/type\s+Star\s*=/)
  })
})

group('step 2: an explicit type on every export', () => {
  it('gives brightest, inConstellation and board a return type', () => {
    expect(exported('brightest')).toMatch(/\)\s*:\s*Star\s*\|\s*undefined\s*\{/)
    expect(exported('inConstellation')).toMatch(/\)\s*:\s*(string\[\]|Array<string>)\s*\{/)
    expect(exported('board')).toMatch(/\)\s*:\s*(string\[\]|Array<string>)\s*\{/)
  })

  it('gives catalogue a type', () => {
    expect(exported('catalogue')).toMatch(/catalogue\s*:\s*(Star\[\]|Array<Star>)\s*=/)
  })

  it('still finds the brightest star and the stars of Orion', () => {
    expect(brightest(catalogue)?.name).toBe('Sirius')
    expect(brightest([])).toBeUndefined()
    expect(inConstellation(catalogue, 'Taurus')).toEqual(['Aldebaran'])
  })
})

group('step 3: a bounded ZoomPath', () => {
  it('types the path of focus as ZoomPath<View>', () => {
    expect(exported('focus')).toMatch(/path\s*:\s*ZoomPath\s*<\s*View\s*>/)
  })

  it('counts the depth and stops at 4', () => {
    const zoomPath = exported('ZoomPath')
    expect(zoomPath).toMatch(/\[\s*['"]length['"]\s*\]\s*extends\s+4\b/)
    expect(zoomPath).toMatch(/\[\s*\.\.\.\s*\w+\s*,\s*unknown\s*\]/)
  })

  it('still follows a path through the views', () => {
    expect(focus(winterSky, 'zoom.zoom.star.name')).toBe('Alnilam')
    expect(focus(winterSky, 'zoom.name')).toBe('Orion')
  })
})

group('no shortcuts', () => {
  it('uses no any, no type assertion and no ts-ignore', () => {
    expect(source).not.toMatch(/\bany\b/)
    expect(code).not.toMatch(/\bas\s+(const\b|[A-Z{[(])/)
    expect(source).not.toMatch(/@ts-(ignore|nocheck|expect-error)/)
  })
})
