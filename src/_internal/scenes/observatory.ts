// Exercise 6 scene: an observatory dome under the winter sky. You do not need to modify this file.
// Your three steps only change types, so the scene reads your file to see which ones are done:
// step 1 opens the shutter, step 2 turns the dome and raises the telescope, step 3 focuses it.
import { figures, type SkyView, type StarRecord, winterSky } from '../night-sky'
import { print } from '../print'
import './observatory.css'

const sources = import.meta.glob<string>('../../6-*.ts', { query: '?raw', import: 'default', eager: true })

// ---------- what the scene receives from your exercise file ----------

/** The values exported by src/6-begin.ts (or src/6-end.ts) */
export type ObservatoryApi = {
  catalogue: readonly StarRecord[]
  focus: (view: SkyView, path: 'zoom.zoom.star.name') => unknown
  board: () => string[]
}

const FOCUS_PATH = 'zoom.zoom.star.name'

// ---------- reading your file: which steps are done ----------

type StepCheck = { n: number; done: boolean; hint: string }

function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

// the declaration that starts with `start`, up to the next export
function declaration(code: string, start: RegExp): string {
  const from = code.search(start)
  if (from < 0) return ''
  const rest = code.slice(from)
  const next = rest.slice(1).search(/\nexport /)
  return next < 0 ? rest : rest.slice(0, next + 1)
}

// exported functions with no return type, and exported constants with no type
function untypedExports(code: string): string[] {
  const missing: string[] = []
  for (const match of code.matchAll(/export\s+function\s+(\w+)\s*(?:<[^(]*>)?\s*\(/g)) {
    let depth = 1
    let i = (match.index ?? 0) + match[0].length
    while (i < code.length && depth > 0) {
      if (code[i] === '(') depth++
      else if (code[i] === ')') depth--
      i++
    }
    if (!/^\s*:/.test(code.slice(i))) missing.push(match[1] ?? 'a function')
  }
  for (const match of code.matchAll(/export\s+(?:const|let)\s+(\w+)\s*([:=])/g)) {
    if (match[2] === '=') missing.push(match[1] ?? 'a constant')
  }
  return missing
}

function listOf(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1) ?? ''}`
}

function checkSteps(): StepCheck[] {
  if (typeof location === 'undefined') return []
  const raw = sources[location.pathname.includes('6-end') ? '../../6-end.ts' : '../../6-begin.ts']
  if (raw === undefined) return []
  const code = withoutComments(raw)

  const intersection = /\btype\s+Star\s*=/.test(code)
  const extended = /\binterface\s+Star\s+extends\s+\w+/.test(code)

  const missing = untypedExports(code)

  const zoomPath = declaration(code, /export type ZoomPath\b/)
  const counted = /\[\s*['"]length['"]\s*\]\s*extends\s+\d+/.test(zoomPath) && /\[\s*\.\.\.\s*\w+\s*,/.test(zoomPath)
  const typedFocus = /function\s+focus\s*\([^)]*\bpath\s*:\s*ZoomPath\s*<\s*View\s*>/.test(code)

  return [
    {
      n: 1,
      done: extended && !intersection,
      hint: 'Star is still an intersection. Make it one interface that extends the four pieces.',
    },
    {
      n: 2,
      done: missing.length === 0,
      hint: `${listOf(missing)} ${missing.length === 1 ? 'has' : 'have'} no explicit type yet. Run npm run check:6.`,
    },
    {
      n: 3,
      done: counted && typedFocus,
      hint: typedFocus
        ? 'ZoomPath has no depth counter yet, so the compiler gives up with TS2589.'
        : 'focus still takes any string. Type its path as ZoomPath<View>.',
    },
  ]
}

// ---------- running your code without letting it break the page ----------

type Analysis = {
  stars: StarRecord[]
  lines: string[]
  latest: string
  target?: string
  steps: StepCheck[]
  errors: string[]
  thrown: unknown[]
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function analyse(api: ObservatoryApi): Analysis {
  const errors: string[] = []
  const thrown: unknown[] = []
  const fail = (error: unknown) => {
    const message = messageOf(error)
    if (!errors.includes(message)) {
      errors.push(message)
      thrown.push(error)
    }
  }

  let lines: string[] = []
  try {
    lines = api.board()
  } catch (error) {
    fail(error)
  }

  let target: string | undefined
  try {
    const name = api.focus(winterSky, FOCUS_PATH)
    if (typeof name === 'string') target = name
  } catch (error) {
    fail(error)
  }

  const latestLine = lines.find(line => line.startsWith('Latest: '))
  return {
    stars: [...api.catalogue],
    lines,
    latest: latestLine ? latestLine.slice('Latest: '.length) : '',
    target,
    steps: checkSteps(),
    errors,
    thrown,
  }
}

// ---------- small DOM and SVG helpers ----------

const SVG_NS = 'http://www.w3.org/2000/svg'

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function shape<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value))
  return node
}

const svgPaths = {
  sweep: '<path d="M12 3v3" /><path d="M12 18v3" /><path d="M3 12h3" /><path d="M18 12h3" /><circle cx="12" cy="12" r="4.5" />',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" />',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5" />',
  wait: '<circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" />',
  alert: '<path d="M12 4 2.8 20h18.4z" /><path d="M12 10v4.5" /><path d="M12 17.5v.01" />',
}

function icon(name: keyof typeof svgPaths, className = 'ob-icon'): SVGSVGElement {
  const node = shape('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: className })
  node.innerHTML = svgPaths[name]
  return node
}

// ---------- the drawing: a 960 by 460 picture ----------

const W = 960
const H = 460
const DOME = { x: 480, y: 392, r: 84 }

// right ascension grows to the left on a sky chart
const skyX = (ra: number) => 860 - ((ra - 4.3) / 3.6) * 760
const skyY = (dec: number) => 260 - (dec + 18) * 6.6

const tints: Record<string, string> = {
  Betelgeuse: '#ffb48a',
  Aldebaran: '#ffc99a',
  Rigel: '#cfdcff',
  Sirius: '#e4ecff',
}
const labelOnLeft = new Set(['Betelgeuse', 'Sirius'])
// only a few names, so the sky stays quiet: the three brightest anchors, plus the star in focus
const labelled = new Set(['Sirius', 'Betelgeuse', 'Rigel'])

// a fixed scatter of faint background stars
function backgroundStars(count: number): { x: number; y: number; r: number; delay: number }[] {
  let seed = 7
  const next = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const out: { x: number; y: number; r: number; delay: number }[] = []
  for (let i = 0; i < count; i++) {
    const x = next() * W
    const y = next() * 330
    const r = 0.5 + next() * 1.1
    const delay = next() * 6
    if (Math.hypot(x - DOME.x, y - DOME.y) > DOME.r + 30) out.push({ x, y, r, delay })
  }
  return out
}

const easeInOut = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2)
const easeOutBack = (k: number) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2

type Tween = { start: number; duration: number; apply: (k: number) => void }

/** Shows the observatory: the catalogued stars, then one change on the dome per finished step */
export function mountScene(api: ObservatoryApi): void {
  const first = analyse(api)
  first.lines.forEach(line => print(line))

  if (typeof document === 'undefined') return // tests run without a page
  const host = document.querySelector<HTMLElement>('#scene')
  if (!host) return

  // real errors also reach the runtime error panel of the page
  const exerciseFile = location.pathname.match(/(\d+-(?:begin|end))/)?.[1]
  for (const error of first.thrown) {
    console.error(error)
    window.dispatchEvent(new ErrorEvent('error', {
      error,
      message: messageOf(error),
      filename: exerciseFile ? `src/${exerciseFile}.ts` : '',
    }))
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const root = el('div', 'ob-root')
  host.replaceChildren(root)

  const stage = el('div', 'ob-stage')
  const toolbar = el('div', 'ob-toolbar')
  const sweep = el('button', 'ob-sweep')
  sweep.type = 'button'
  sweep.append(icon('sweep'), 'Sweep the sky')
  toolbar.append(sweep)
  const waiting = el('div', 'ob-waiting')
  waiting.setAttribute('role', 'status')

  const picture = shape('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ob-picture', role: 'img', preserveAspectRatio: 'xMidYMax meet' })
  stage.append(picture, waiting, toolbar)

  const caption = el('div', 'ob-caption')
  caption.setAttribute('aria-live', 'polite')
  root.append(stage, caption)

  // ---------- fixed parts: gradients, faint stars, hills, the drum of the observatory ----------

  const defs = shape('defs')
  defs.innerHTML = `
    <radialGradient id="ob-dome-shade" cx="0.32" cy="0.25" r="0.9">
      <stop offset="0" stop-color="#eef0ff" />
      <stop offset="0.45" stop-color="#aab2dc" />
      <stop offset="1" stop-color="#4c5487" />
    </radialGradient>
    <linearGradient id="ob-shutter" x1="0" x2="1">
      <stop offset="0" stop-color="#8f98c8" />
      <stop offset="0.5" stop-color="#c3c9ea" />
      <stop offset="1" stop-color="#7c84b6" />
    </linearGradient>
    <linearGradient id="ob-drum" x1="0" x2="1">
      <stop offset="0" stop-color="#3b4274" />
      <stop offset="0.4" stop-color="#2c325d" />
      <stop offset="1" stop-color="#1c2046" />
    </linearGradient>
    <linearGradient id="ob-inside" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#ffcf8a" stop-opacity="0.55" />
      <stop offset="0.6" stop-color="#ffcf8a" stop-opacity="0.08" />
      <stop offset="1" stop-color="#ffcf8a" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="ob-tube" x1="0" x2="1">
      <stop offset="0" stop-color="#9aa3d4" />
      <stop offset="0.45" stop-color="#f2f3ff" />
      <stop offset="1" stop-color="#8189bd" />
    </linearGradient>
    <radialGradient id="ob-glow">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="0.3" stop-color="#ffffff" stop-opacity="0.28" />
      <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="ob-horizon" cx="0.5" cy="1" r="0.75">
      <stop offset="0" stop-color="#a9b8ff" stop-opacity="0.16" />
      <stop offset="1" stop-color="#a9b8ff" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="ob-edge-fade" x1="0" x2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0" />
      <stop offset="0.14" stop-color="#ffffff" stop-opacity="1" />
      <stop offset="0.86" stop-color="#ffffff" stop-opacity="1" />
      <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
    <mask id="ob-edges" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ob-edge-fade)" />
    </mask>
    <clipPath id="ob-dome-clip">
      <path d="M ${DOME.x - DOME.r} ${DOME.y} A ${DOME.r} ${DOME.r} 0 0 1 ${DOME.x + DOME.r} ${DOME.y} Z" />
    </clipPath>`
  picture.append(defs)

  // the land and its glow fade out at both sides, so the picture has no hard edges
  const land = shape('g', { mask: 'url(#ob-edges)' })
  land.append(shape('rect', { x: 0, y: 180, width: W, height: H - 180, fill: 'url(#ob-horizon)' }))
  picture.append(land)

  const faint = shape('g', { class: 'ob-faint', mask: 'url(#ob-edges)' })
  for (const s of backgroundStars(90)) {
    const dot = shape('circle', { cx: s.x.toFixed(1), cy: s.y.toFixed(1), r: s.r.toFixed(2) })
    dot.style.animationDelay = `${s.delay.toFixed(2)}s`
    faint.append(dot)
  }
  picture.append(faint)

  const figureLayer = shape('g', { class: 'ob-figures' })
  const starLayer = shape('g', { class: 'ob-stars' })
  const focusLayer = shape('g', { class: 'ob-focus' })
  picture.append(figureLayer, starLayer)

  // hills, then the drum and its door
  const hills = shape('g', { mask: 'url(#ob-edges)' })
  hills.append(
    shape('path', { d: `M0 ${H} L0 412 C 160 386 300 404 420 420 C 560 438 760 384 ${W} 404 L ${W} ${H} Z`, fill: '#131737' }),
    shape('path', { d: `M0 ${H} L0 438 C 220 420 380 432 480 432 C 620 432 760 424 ${W} 440 L ${W} ${H} Z`, fill: '#0e1130' }),
  )
  picture.append(
    hills,
    shape('rect', { x: DOME.x - 78, y: DOME.y - 2, width: 156, height: 42, rx: 3, fill: 'url(#ob-drum)' }),
    shape('rect', { x: DOME.x - 13, y: DOME.y + 12, width: 26, height: 28, rx: 13, fill: '#14183a' }),
    shape('rect', { x: DOME.x - 50, y: DOME.y + 14, width: 12, height: 9, rx: 2, fill: '#ffcf8a', opacity: 0.75 }),
    shape('rect', { x: DOME.x - 86, y: DOME.y - 4, width: 172, height: 7, rx: 3.5, fill: '#5d659b' }),
  )

  // the dome shell and its ribs
  const shell = shape('g')
  shell.append(shape('path', {
    d: `M ${DOME.x - DOME.r} ${DOME.y} A ${DOME.r} ${DOME.r} 0 0 1 ${DOME.x + DOME.r} ${DOME.y} Z`,
    fill: 'url(#ob-dome-shade)',
  }))
  const ribs = shape('g', { 'clip-path': 'url(#ob-dome-clip)', fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0.14, 'stroke-width': 1.5 })
  for (const rx of [0.36, 0.72]) ribs.append(shape('ellipse', { cx: DOME.x, cy: DOME.y, rx: DOME.r * rx, ry: DOME.r }))
  ribs.append(shape('ellipse', { cx: DOME.x, cy: DOME.y, rx: DOME.r, ry: DOME.r * 0.32 }))
  shell.append(ribs)
  picture.append(shell)

  // the slit, the telescope and the shutter all turn with the dome
  const slit = shape('g', { 'clip-path': 'url(#ob-dome-clip)' })
  const slitTurn = shape('g')
  slitTurn.append(
    shape('rect', { x: DOME.x - 17, y: DOME.y - DOME.r - 4, width: 34, height: DOME.r + 4, fill: '#070816' }),
    shape('rect', { x: DOME.x - 17, y: DOME.y - DOME.r - 4, width: 34, height: DOME.r + 4, fill: 'url(#ob-inside)' }),
  )
  slit.append(slitTurn)

  const telescope = shape('g', { class: 'ob-telescope' })
  const scopeTurn = shape('g')
  const tube = shape('g')
  tube.append(
    shape('rect', { x: -9, y: -1, width: 18, height: 1, rx: 4, fill: 'url(#ob-tube)' }),
    shape('rect', { x: -10.5, y: -1, width: 21, height: 14, rx: 3, fill: '#6870a6' }),
  )
  scopeTurn.append(tube, shape('circle', { cx: 0, cy: 0, r: 8, fill: '#2b3160', stroke: '#8f98c8', 'stroke-width': 2 }))
  telescope.append(scopeTurn)

  const shutterClip = shape('g', { 'clip-path': 'url(#ob-dome-clip)' })
  const shutterTurn = shape('g')
  const shutter = shape('g')
  shutter.append(shape('rect', { x: DOME.x - 18, y: DOME.y - DOME.r - 4, width: 36, height: DOME.r + 4, fill: 'url(#ob-shutter)' }))
  for (let i = 1; i < 5; i++) {
    const y = DOME.y - DOME.r + i * (DOME.r / 5)
    shutter.append(shape('line', { x1: DOME.x - 18, y1: y, x2: DOME.x + 18, y2: y, stroke: '#5b6396', 'stroke-opacity': 0.55, 'stroke-width': 1.2 }))
  }
  shutterTurn.append(shutter)
  shutterClip.append(shutterTurn)

  picture.append(slit, telescope, shutterClip, focusLayer)

  // ---------- the moving parts, set from 0 to 1 ----------

  let openK = 0
  let aimK = 0
  let aimAngle = 0
  const PARKED = 40
  const RAISED = 118

  function placeDome() {
    const angle = aimAngle * aimK
    const turn = `rotate(${angle.toFixed(2)} ${DOME.x} ${DOME.y})`
    slitTurn.setAttribute('transform', turn)
    shutterTurn.setAttribute('transform', turn)
    shutter.setAttribute('transform', `translate(0 ${(-(DOME.r + 8) * openK).toFixed(2)})`)
    scopeTurn.setAttribute('transform', `translate(${DOME.x} ${DOME.y - 4}) rotate(${angle.toFixed(2)})`)
    const length = PARKED + (RAISED - PARKED) * aimK
    const [body, cap] = tube.children
    body?.setAttribute('y', String(-length))
    body?.setAttribute('height', String(length))
    cap?.setAttribute('y', String(-length - 2))
    // a closed shutter keeps the telescope inside the dome
    if (openK < 1) telescope.setAttribute('clip-path', 'url(#ob-dome-clip)')
    else telescope.removeAttribute('clip-path')
  }

  // ---------- tweens and the render loop ----------

  let tweens: Tween[] = []
  let clockStart = performance.now()
  const now = () => (performance.now() - clockStart) / 1000
  const tween = (start: number, duration: number, apply: (k: number) => void) => {
    if (reducedMotion.matches) apply(1)
    else {
      apply(0)
      tweens.push({ start, duration, apply })
    }
  }

  function frame() {
    const time = now()
    tweens = tweens.filter((t) => {
      const k = Math.min(1, Math.max(0, (time - t.start) / t.duration))
      t.apply(k)
      return k < 1
    })
    requestAnimationFrame(frame)
  }

  // ---------- the type tag: one short line, joined to what changed ----------

  function typeTag(x: number, y: number, onLeft: boolean, code: string, value: string, toX: number, toY: number, at: number) {
    const tag = shape('g', { class: 'ob-tag' })
    const text = shape('text', { x: 0, y: y + 4.5 })
    text.innerHTML = value ? `${code}<tspan class="ob-tag-value"> → ${value}</tspan>` : code
    const box = shape('rect', { y: y - 14, height: 28, rx: 14 })
    tag.append(box, text)
    focusLayer.append(tag)
    const width = Math.ceil(text.getComputedTextLength())
    const left = onLeft ? x - width - 28 : x
    box.setAttribute('x', String(left))
    box.setAttribute('width', (width + 28).toFixed(1))
    text.setAttribute('x', String(left + 14))
    tag.prepend(shape('line', { x1: toX, y1: toY, x2: onLeft ? left + width + 28 : left, y2: y }))
    tween(at, 0.5, (k) => {
      tag.style.opacity = String(k)
    })
  }

  // ---------- one sweep of the sky ----------

  function build(run: Analysis) {
    tweens = []
    clockStart = performance.now()
    figureLayer.replaceChildren()
    starLayer.replaceChildren()
    focusLayer.replaceChildren()

    const step = (n: number) => run.steps.length === 0 || run.steps.some(s => s.n === n && s.done)
    const positions = new Map<string, { x: number; y: number }>()
    for (const star of run.stars) positions.set(star.name, { x: skyX(star.ra), y: skyY(star.dec) })
    const target = run.target ? positions.get(run.target) : undefined

    picture.setAttribute('aria-label', `An observatory under the winter sky, with ${run.stars.length} catalogued stars${target ? `. The telescope is on ${run.target ?? ''}` : ''}`)

    // the catalogue, in its own order: brightest first
    const gap = 0.16
    run.stars.forEach((star, index) => {
      const at = positions.get(star.name)
      if (!at) return
      const size = Math.max(1.6, 2.4 + (1.8 - star.magnitude) * 1.15)
      const tint = tints[star.name] ?? '#f1f0ff'
      const group = shape('g', { class: 'ob-star' })
      const title = shape('title')
      title.textContent = `${star.name}, ${star.constellation}, magnitude ${star.magnitude}`
      const glow = shape('circle', { cx: at.x, cy: at.y, r: size * 4.2, fill: 'url(#ob-glow)', opacity: 0.55 })
      const core = shape('circle', { cx: at.x, cy: at.y, r: size, fill: tint })
      group.append(title, glow, core)
      if (labelled.has(star.name) || star.name === run.target) {
        const left = labelOnLeft.has(star.name)
        const label = shape('text', {
          x: at.x + (left ? -1 : 1) * (size + 9),
          y: at.y + 4.5,
          'text-anchor': left ? 'end' : 'start',
          class: 'ob-star-name',
        })
        label.textContent = star.name
        if (star.name !== run.target || !step(3)) group.append(label)
      }
      starLayer.append(group)
      tween(0.3 + index * gap, 0.6, (k) => {
        group.style.opacity = String(k)
        core.setAttribute('r', (size * (0.4 + 0.6 * easeOutBack(k))).toFixed(2))
      })
    })

    // the figure of Orion, once its stars are in
    const linesAt = 0.3 + run.stars.length * gap + 0.2
    figures.forEach(([from, to], index) => {
      const a = positions.get(from)
      const b = positions.get(to)
      if (!a || !b) return
      const length = Math.hypot(b.x - a.x, b.y - a.y)
      const line = shape('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'stroke-dasharray': length.toFixed(1) })
      figureLayer.append(line)
      tween(linesAt + index * 0.08, 0.5, (k) => {
        line.setAttribute('stroke-dashoffset', (length * (1 - k)).toFixed(1))
      })
    })

    // step 1 opens the shutter, step 2 turns the dome and raises the telescope
    const domeAt = linesAt + 0.4
    aimAngle = target ? (Math.atan2(target.x - DOME.x, DOME.y - 4 - target.y) * 180) / Math.PI : 0
    openK = 0
    aimK = 0
    placeDome()
    if (step(1)) tween(domeAt, 1.1, (k) => { openK = easeInOut(k); placeDome() })
    if (step(2)) tween(domeAt + (step(1) ? 0.9 : 0), 1.4, (k) => { aimK = easeInOut(k); placeDome() })

    // step 3 focuses the telescope: one ring per level of the zoom path
    if (step(3) && target && run.target) {
      const ringsAt = domeAt + 2.4
      const radii = [44, 34, 24, 14]
      radii.forEach((radius, index) => {
        const ring = shape('circle', { cx: target.x, cy: target.y, r: radius, class: 'ob-ring' })
        ring.style.strokeOpacity = String(0.35 + index * 0.18)
        focusLayer.append(ring)
        tween(ringsAt + index * 0.18, 0.5, (k) => {
          ring.style.opacity = String(k)
          ring.setAttribute('r', (radius * (1.5 - 0.5 * easeInOut(k))).toFixed(2))
        })
      })
    }

    // one quiet tag names the TypeScript idea behind the latest change
    if (step(3) && target && run.target) {
      // on the left of the rings, where the sky is empty
      typeTag(target.x - 70, target.y, true, 'ZoomPath&lt;View&gt;', run.target, target.x - 44, target.y, domeAt + 3.2)
    } else if (step(2)) {
      typeTag(DOME.x + 104, DOME.y - 62, false, 'isolatedDeclarations', '', DOME.x + 62, DOME.y - 62, domeAt + 2.3)
    } else if (step(1)) {
      typeTag(DOME.x + 104, DOME.y - 62, false, 'interface Star extends …', '', DOME.x + 62, DOME.y - 62, domeAt + 1.1)
    }

    // the waiting card floats over the dome until every step is done
    const next = run.steps.find(s => !s.done)
    waiting.hidden = !next
    if (next) waiting.replaceChildren(icon('wait', 'ob-icon ob-waiting-icon'), el('strong', '', `Waiting for step ${next.n}`), el('span', '', next.hint))

    renderCaption(run)
  }

  // ---------- caption under the stage ----------

  function renderCaption(run: Analysis) {
    caption.replaceChildren()
    const latestLine = el('p', 'ob-caption-latest')
    latestLine.append(icon('star'), el('code', '', `Latest: ${run.latest || 'nothing in focus'}`))
    caption.append(latestLine)

    const next = run.steps.find(s => !s.done)
    const status = el('p', 'ob-caption-status')
    if (run.errors.length > 0) {
      status.classList.add('is-error')
      status.append(icon('alert'), el('span', '', `Your code threw: ${run.errors.join(' / ')}`))
    } else if (next) {
      status.classList.add('is-waiting')
      status.append(icon('wait'), el('strong', '', `Waiting for step ${next.n}.`), ` ${next.hint}`)
    } else {
      status.append(icon('check'), 'All steps done: the telescope is focused on Orion’s Belt.')
    }
    caption.append(status)
  }

  let current = first
  sweep.addEventListener('click', () => {
    current = analyse(api)
    build(current)
  })

  // the star names use the page font: wait for it, but never more than a second
  const font = document.fonts.load('600 14px "Open Sans"').catch(() => [])
  void Promise.race([font, new Promise(resolve => setTimeout(resolve, 1000))]).then(() => {
    build(current)
    requestAnimationFrame(frame)
  })
}
