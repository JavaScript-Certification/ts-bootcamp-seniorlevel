// Exercise 3 scene: one arcade cabinet whose pixel screen shows your work. You do not need to modify this file.
// The screen has one row per step: the high score your scoreLine writes, the combo your combo joins
// (the joystick and the buttons move with it) and the cheat, once CheckCheat guards it.
import { type Move, matchPattern, scoreCommands } from '../arcade-feed'
import { print } from '../print'
import './arcade.css'

// Steps 1 to 3 also change types, so the scene reads your file to see whether they are done
const sources = import.meta.glob<string>('../../3-*.ts', { query: '?raw', import: 'default', eager: true })

// ---------- what the scene receives from your exercise file ----------

/** The functions exported by src/3-begin.ts (or src/3-end.ts) */
export type ArcadeApi = {
  scoreLine: (score: { player: string; points: string }) => string
  combo: (first: readonly Move[], second: readonly Move[]) => readonly Move[]
  enterCheat: (code: 'KONAMI') => string
  board: () => string[]
}

const dashMoves: readonly Move[] = ['right', 'right']
const hadoukenMoves: readonly Move[] = ['down', 'right', 'punch']
const expectedCombo: readonly Move[] = [...dashMoves, ...hadoukenMoves]

// ---------- reading your file ----------

function codeOf(): string | undefined {
  if (typeof location === 'undefined') return undefined
  const raw = sources[location.pathname.includes('3-end') ? '../../3-end.ts' : '../../3-begin.ts']
  return raw === undefined ? undefined : raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

// the declaration that starts with `start`, up to the next export
function declaration(code: string, start: RegExp): string {
  const from = code.search(start)
  if (from < 0) return ''
  const rest = code.slice(from)
  const next = rest.slice(1).search(/\nexport /)
  return next < 0 ? rest : rest.slice(0, next + 1)
}

// ---------- running your functions without letting them break the page ----------

type Attempt<T> = { ok: true; value: T } | { ok: false; error: unknown }

function attempt<T>(run: () => T): Attempt<T> {
  try {
    return { ok: true, value: run() }
  } catch (error) {
    return { ok: false, error }
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

type StepCheck = { n: number; done: boolean; hint: string }

type Analysis = {
  /** what your scoreLine wrote for each score command */
  scores: string[]
  /** the moves your combo returned */
  moves: string[]
  cheat: string
  steps: StepCheck[]
  lines: string[]
  thrown: unknown[]
}

function analyse(api: ArcadeApi): Analysis {
  const thrown: unknown[] = []
  const fail = (error: unknown) => {
    if (!thrown.some(known => messageOf(known) === messageOf(error))) thrown.push(error)
    return messageOf(error)
  }

  const board = attempt(() => api.board())
  const lines = board.ok ? board.value.map(String) : []
  if (!board.ok) fail(board.error)

  const scores = scoreCommands.map((path) => {
    const values = matchPattern('/score/:player/:points', path) ?? {}
    const score = { player: values.player ?? '', points: values.points ?? '' }
    const line = attempt(() => String(api.scoreLine(score)))
    return line.ok ? line.value : `THREW ${fail(line.error)}`
  })

  const joined = attempt(() => api.combo(dashMoves, hadoukenMoves))
  const moves = joined.ok && Array.isArray(joined.value) ? joined.value.map(String) : []
  if (!joined.ok) fail(joined.error)

  const entered = attempt(() => String(api.enterCheat('KONAMI')))
  const cheat = entered.ok ? entered.value : `THREW ${fail(entered.error)}`

  // the steps: what runs, and what your types say
  const code = codeOf()
  const known = code !== undefined
  const read = (start: RegExp) => (code === undefined ? '' : declaration(code, start))
  const paramNames = read(/export type ParamNames\b/)
  const hadouken = read(/export type Hadouken\b/)
  const comboType = read(/export function combo\b/)
  const checkCheat = read(/export type CheckCheat\b/)

  const namesTyped = !known || /`[^`]*\$\{\s*infer\s+\w+\s*\}/.test(paramNames)
  const scoreWritten = scores[0]?.trim() === 'ADA 4200'
  const comboRuns = moves.length === expectedCombo.length && moves.every((move, i) => move === expectedCombo[i])
  const labelled = !known || /\[\s*\w+\??\s*:/.test(hadouken.replace(/^[^=]*=/, ''))
  // the return type, not the body: `): [...A, ...B]`
  const variadic = !known || (/combo\s*</.test(comboType) && /\)\s*:\s*\[\s*\.\.\.\s*\w+\s*,\s*\.\.\.\s*\w+\s*\]/.test(comboType))
  const guarded = !known || (/\bIf\s*</.test(checkCheat) && /\bUppercase\s*</.test(checkCheat) && /\bKnownCheat\b/.test(checkCheat))

  const steps: StepCheck[] = [
    { n: 1, done: namesTyped, hint: 'ParamNames is still never. Read each :name with infer in a template literal type.' },
    { n: 1, done: scoreWritten, hint: 'scoreLine still returns ???. Return the player in capitals and the points.' },
    { n: 2, done: labelled, hint: 'Hadouken is still Move[]. Write it as a labelled tuple of three moves.' },
    { n: 2, done: comboRuns && variadic, hint: comboRuns ? 'combo runs, but its type loses the moves. Return [...A, ...B].' : 'combo returns no moves yet. Join both tuples with two spreads.' },
    { n: 3, done: guarded, hint: 'CheckCheat lets any string through. Use If, Equals and Uppercase to refuse bad codes.' },
  ]

  return { scores, moves, cheat, steps, lines, thrown }
}

const stepDone = (run: Analysis, n: number) => run.steps.filter(step => step.n === n).every(step => step.done)

// ---------- a 5 by 7 pixel font, and a few 7 by 7 sprites ----------

const font: Record<string, string> = {
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 10001 11001 10101 10011 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110',
  1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111',
  3: '11111 00010 00100 00010 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010',
  5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110',
  7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110',
  9: '01110 10001 10001 01111 00001 00010 01100',
  ' ': '00000 00000 00000 00000 00000 00000 00000',
  ':': '00000 01100 01100 00000 01100 01100 00000',
  '-': '00000 00000 00000 11111 00000 00000 00000',
  '.': '00000 00000 00000 00000 00000 01100 01100',
  ',': '00000 00000 00000 00000 01100 00100 01000',
  '!': '00100 00100 00100 00100 00100 00000 00100',
  '?': '01110 10001 00001 00010 00100 00000 00100',
  '/': '00000 00001 00010 00100 01000 10000 00000',
  "'": '00100 00100 01000 00000 00000 00000 00000',
}

const sprites = {
  up: '0001000 0011100 0111110 1111111 0011100 0011100 0011100',
  down: '0011100 0011100 0011100 1111111 0111110 0011100 0001000',
  left: '0001000 0011000 0111111 1111111 0111111 0011000 0001000',
  right: '0001000 0001100 1111110 1111111 1111110 0001100 0001000',
  button: '0011100 0111110 1111111 1111111 1111111 0111110 0011100',
  heart: '0110110 1111111 1111111 1111111 0111110 0011100 0001000',
  star: '0001000 0001000 1111111 0111110 0011100 0110110 0100010',
  lock: '0011100 0100010 0100010 1111111 1110111 1110111 1111111',
}

type SpriteName = keyof typeof sprites

const screenColor = {
  back: '#14041c',
  text: '#fbeffc',
  pink: '#ff8ad8',
  yellow: '#f1dd35',
  green: '#4be0a6',
  red: '#ff7a6b',
  lilac: '#b9a4ff',
  dim: '#5b3a68',
}

function drawBits(ctx: CanvasRenderingContext2D, bits: string, x: number, y: number, color: string, size = 1) {
  ctx.fillStyle = color
  bits.split(' ').forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      if (row[dx] === '1') ctx.fillRect(x + dx * size, y + dy * size, size, size)
    }
  })
}

/** draws text in the pixel font and returns the x where it ends */
function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size = 1): number {
  let cursor = x
  for (const char of text.toUpperCase()) {
    drawBits(ctx, font[char] ?? font['?'] ?? '', cursor, y, color, size)
    cursor += 6 * size
  }
  return cursor
}

const textWidth = (text: string, size = 1) => text.length * 6 * size - size

function drawSprite(ctx: CanvasRenderingContext2D, name: SpriteName, x: number, y: number, color: string) {
  drawBits(ctx, sprites[name], x, y, color)
}

function moveSprite(move: string): { name: SpriteName; color: string } | undefined {
  if (move === 'up' || move === 'down' || move === 'left' || move === 'right') return { name: move, color: screenColor.text }
  if (move === 'punch') return { name: 'button', color: screenColor.pink }
  if (move === 'kick') return { name: 'button', color: screenColor.lilac }
  return undefined
}

// ---------- the screen, frame by frame ----------

const SCREEN_W = 160
const SCREEN_H = 112

/** what the screen shows at one moment of the run */
type ScreenView = { boot: boolean; scoreRows: number; moves: number; cheat: boolean }

function fit(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}.` : text
}

function drawScreen(ctx: CanvasRenderingContext2D, run: Analysis, view: ScreenView) {
  ctx.fillStyle = screenColor.back
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)

  if (view.boot) {
    const title = 'PIXEL'
    drawText(ctx, title, (SCREEN_W - textWidth(title, 2)) / 2, 26, screenColor.pink, 2)
    const second = 'ARCADE'
    drawText(ctx, second, (SCREEN_W - textWidth(second, 2)) / 2, 46, screenColor.pink, 2)
    const ready = 'READY!'
    drawText(ctx, ready, (SCREEN_W - textWidth(ready)) / 2, 76, screenColor.yellow)
    return
  }

  const one = stepDone(run, 1)
  const two = stepDone(run, 2)
  const three = stepDone(run, 3)

  // three rows, one per step: label on the left, what your code gave on the right
  const left = 20
  const value = 60

  // step 1, the high score: the text your scoreLine returned, ticking up to the best one
  drawText(ctx, 'SCORE', left, 24, screenColor.pink)
  if (view.scoreRows > 0) {
    const line = run.scores[run.scores.length - view.scoreRows] ?? ''
    drawText(ctx, fit(line, 15), value, 24, one ? screenColor.text : screenColor.dim)
  }

  dotted(ctx, 40)

  // step 2, the combo: one sprite per move your combo returned
  drawText(ctx, 'COMBO', left, 52, screenColor.pink)
  if (view.scoreRows >= run.scores.length) {
    if (run.moves.length === 0) drawText(ctx, '- - -', value, 52, screenColor.dim)
    run.moves.slice(0, Math.min(view.moves, 8)).forEach((move, i) => {
      const sprite = moveSprite(move)
      if (sprite) drawSprite(ctx, sprite.name, value + i * 11, 52, two ? sprite.color : screenColor.dim)
      else drawText(ctx, '?', value + 1 + i * 11, 52, screenColor.dim)
    })
  }

  dotted(ctx, 68)

  // step 3, the cheat: lit once CheckCheat guards it
  drawText(ctx, 'CHEAT', left, 80, screenColor.pink)
  if (view.cheat) {
    if (three) {
      const x = drawText(ctx, 'KONAMI', value, 80, screenColor.text) + 5
      drawSprite(ctx, 'heart', x, 80, screenColor.red)
      drawText(ctx, 'X99', x + 10, 80, screenColor.text)
    } else {
      drawSprite(ctx, 'lock', value, 80, screenColor.dim)
      drawText(ctx, 'UNGUARDED', value + 12, 80, screenColor.dim)
    }
  }
}

function dotted(ctx: CanvasRenderingContext2D, y: number) {
  ctx.fillStyle = screenColor.dim
  for (let x = 20; x < SCREEN_W - 20; x += 3) ctx.fillRect(x, y, 1, 1)
}

function drawMarquee(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 104, 12)
  const title = 'PIXEL ARCADE'
  const x = (104 - textWidth(title)) / 2
  drawText(ctx, title, x, 3, screenColor.pink)
  drawBits(ctx, sprites.star, x - 12, 3, screenColor.yellow)
  drawBits(ctx, sprites.star, x + textWidth(title) + 5, 3, screenColor.yellow)
}

// ---------- the cabinet drawing ----------

const cabinetDrawing = `<svg class="ac-body" viewBox="0 0 420 440" aria-hidden="true">
  <defs>
    <linearGradient id="ac-side" x1="0" x2="1">
      <stop offset="0" stop-color="#4a1659"/><stop offset="0.5" stop-color="#3a1048"/><stop offset="1" stop-color="#2c0a37"/>
    </linearGradient>
    <linearGradient id="ac-panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5b2170"/><stop offset="1" stop-color="#43145a"/>
    </linearGradient>
    <radialGradient id="ac-ball" cx="0.35" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#ffd0ec"/><stop offset="0.45" stop-color="#ff6fb8"/><stop offset="1" stop-color="#c2307f"/>
    </radialGradient>
  </defs>
  <ellipse cx="210" cy="430" rx="196" ry="8" fill="#000" opacity="0.35"/>
  <rect x="26" y="6" width="368" height="420" rx="18" fill="url(#ac-side)"/>
  <rect x="29" y="9" width="362" height="414" rx="16" fill="none" stroke="#ff8ad8" stroke-opacity="0.45" stroke-width="2"/>
  <rect class="ac-marquee-box" x="40" y="16" width="340" height="52" rx="8" fill="#12031a" stroke="#ff8ad8" stroke-opacity="0.6" stroke-width="2"/>
  <rect x="40" y="78" width="340" height="240" rx="14" fill="#0b0110"/>
  <rect x="44" y="82" width="332" height="232" rx="11" fill="none" stroke="#2c0c38" stroke-width="2"/>
  <path d="M26 328 H394 L410 380 H10 Z" fill="url(#ac-panel)"/>
  <path d="M26 328 H394" stroke="#ff8ad8" stroke-opacity="0.5" stroke-width="2"/>
  <rect x="10" y="380" width="400" height="12" rx="3" fill="#2a0934"/>
  <g class="ac-stick">
    <line x1="120" y1="356" x2="120" y2="334" stroke="#e7def0" stroke-width="6" stroke-linecap="round"/>
    <circle cx="120" cy="330" r="12" fill="url(#ac-ball)"/>
  </g>
  <ellipse cx="120" cy="357" rx="24" ry="7" fill="#1c0624"/>
  <ellipse cx="120" cy="356" rx="9" ry="3" fill="#0d0212"/>
  <g class="ac-button ac-button-punch">
    <ellipse cx="270" cy="358" rx="16" ry="6" fill="#1c0624"/>
    <ellipse class="ac-cap" cx="270" cy="353" rx="13" ry="6.5" fill="#ff8ad8"/>
  </g>
  <g class="ac-button ac-button-kick">
    <ellipse cx="322" cy="358" rx="16" ry="6" fill="#1c0624"/>
    <ellipse class="ac-cap" cx="322" cy="353" rx="13" ry="6.5" fill="#b9a4ff"/>
  </g>
  <text x="270" y="375" class="ac-key">PUNCH</text>
  <text x="322" y="375" class="ac-key">KICK</text>
  <rect x="176" y="398" width="68" height="24" rx="4" fill="#1a0522" stroke="#5a2a6a"/>
  <rect class="ac-slot" x="192" y="404" width="6" height="12" rx="2"/>
  <rect class="ac-slot" x="222" y="404" width="6" height="12" rx="2"/>
  <path d="M46 400 l10 -8 h10 l-10 8 Z M64 400 l10 -8 h10 l-10 8 Z" fill="#ff8ad8" opacity="0.4"/>
  <path d="M374 400 l-10 -8 h-10 l10 8 Z M356 400 l-10 -8 h-10 l10 8 Z" fill="#ff8ad8" opacity="0.4"/>
  <circle class="ac-coin" cx="195" cy="380" r="7"/>
</svg>`

// ---------- small DOM helpers ----------

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

const svgPaths = {
  coin: '<circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9" /><path d="M14.5 9.5c-.5-1-1.4-1.4-2.5-1.4-1.5 0-2.5.8-2.5 1.9 0 2.6 5.2 1.3 5.2 4 0 1.1-1.1 1.9-2.7 1.9-1.2 0-2.2-.5-2.7-1.5" />',
  joystick: '<path d="M12 4.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z" /><path d="M12 9.5v6" /><path d="M5 16.5h14l1 3H4z" />',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5" />',
  wait: '<circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" />',
  alert: '<path d="M12 4 2.8 20h18.4z" /><path d="M12 10v4.5" /><path d="M12 17.5v.01" />',
}

function svg(name: keyof typeof svgPaths, className = 'ac-icon'): SVGSVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  node.setAttribute('viewBox', '0 0 24 24')
  node.setAttribute('aria-hidden', 'true')
  node.setAttribute('class', className)
  node.innerHTML = svgPaths[name]
  return node
}

function pixelCanvas(className: string, width: number, height: number): HTMLCanvasElement {
  const canvas = el('canvas', className)
  canvas.width = width
  canvas.height = height
  return canvas
}

// ---------- the scene ----------

// the run, in seconds: coin, boot, scores, combo, cheat
const COIN = 0.5
const BOOT = 0.8
const ROW = 0.35
const MOVE = 0.42

/** Shows your work on the cabinet: high scores, the combo and the cheat */
export function mountScene(api: ArcadeApi): void {
  const first = analyse(api)
  first.lines.forEach(print)

  if (typeof document === 'undefined') return // tests run without a page
  const host = document.querySelector<HTMLElement>('#scene')
  if (!host) return

  // real errors also reach the runtime error panel of the page, pointing at your exercise file
  const exerciseFile = location.pathname.match(/(\d+-(?:begin|end))/)?.[1]
  for (const error of first.thrown) {
    console.error(error)
    window.dispatchEvent(new ErrorEvent('error', { error, message: messageOf(error), filename: exerciseFile ? `src/${exerciseFile}.ts` : '' }))
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const root = el('div', 'ac-root')
  host.replaceChildren(root)

  const toolbar = el('div', 'ac-toolbar')
  const coinButton = el('button', 'ac-play')
  coinButton.type = 'button'
  coinButton.append(svg('coin'), 'Insert coin')
  toolbar.append(coinButton)

  const stage = el('div', 'ac-stage')
  const cabinet = el('div', 'ac-cabinet')
  cabinet.innerHTML = cabinetDrawing
  const marquee = pixelCanvas('ac-marquee', 104, 12)
  const screen = pixelCanvas('ac-screen', SCREEN_W, SCREEN_H)
  screen.setAttribute('role', 'img')
  const glass = el('div', 'ac-glass')
  cabinet.append(marquee, screen, glass)
  const waiting = el('div', 'ac-waiting')
  waiting.setAttribute('role', 'status')
  stage.append(cabinet, waiting)

  const caption = el('div', 'ac-caption')
  caption.setAttribute('aria-live', 'polite')
  root.append(toolbar, stage, caption)

  const stick = cabinet.querySelector<SVGGElement>('.ac-stick')
  const punch = cabinet.querySelector<SVGGElement>('.ac-button-punch')
  const kick = cabinet.querySelector<SVGGElement>('.ac-button-kick')

  const screenCtx = screen.getContext('2d')
  const marqueeCtx = marquee.getContext('2d')
  if (marqueeCtx) drawMarquee(marqueeCtx)

  let current = first
  let started = 0
  let frameId = 0

  function describeScreen(run: Analysis): string {
    const parts = [`High scores: ${run.scores.join(', ')}`, `Combo: ${run.moves.join(' ') || 'no moves'}`]
    parts.push(stepDone(run, 3) ? 'Cheat on: KONAMI, 99 lives' : 'Cheat unguarded')
    return `Arcade screen. ${parts.join('. ')}.`
  }

  function viewAt(run: Analysis, time: number): ScreenView {
    const t = time - COIN
    const afterBoot = t - BOOT
    const scoreRows = Math.max(0, Math.min(run.scores.length, Math.floor(afterBoot / ROW) + 1))
    const comboStart = BOOT + run.scores.length * ROW + 0.2
    const moves = Math.max(0, Math.floor((t - comboStart) / MOVE) + 1)
    const cheatAt = comboStart + Math.max(1, run.moves.length) * MOVE + 0.2
    return { boot: t >= 0 && afterBoot < 0, scoreRows: afterBoot < 0 ? 0 : scoreRows, moves, cheat: t >= cheatAt }
  }

  const finalView = (run: Analysis): ScreenView => ({ boot: false, scoreRows: run.scores.length, moves: run.moves.length, cheat: true })

  // the joystick and the buttons follow the move on screen
  function pose(move: string | undefined) {
    for (const direction of ['up', 'down', 'left', 'right']) stick?.classList.toggle(`is-${direction}`, move === direction)
    punch?.classList.toggle('is-pressed', move === 'punch')
    kick?.classList.toggle('is-pressed', move === 'kick')
  }

  function frame() {
    const time = (performance.now() - started) / 1000
    const run = current
    const view = viewAt(run, time)
    const comboStart = COIN + BOOT + run.scores.length * ROW + 0.2
    const index = Math.floor((time - comboStart) / MOVE)
    const within = (time - comboStart) - index * MOVE < MOVE * 0.6
    pose(index >= 0 && within ? run.moves[index] : undefined)
    cabinet.classList.toggle('is-off', time < COIN)
    if (screenCtx) drawScreen(screenCtx, run, time < COIN ? { boot: false, scoreRows: 0, moves: 0, cheat: false } : view)
    if (view.cheat && view.scoreRows >= run.scores.length) {
      finish(run)
      return
    }
    frameId = requestAnimationFrame(frame)
  }

  function finish(run: Analysis) {
    pose(undefined)
    cabinet.classList.remove('is-off', 'is-coin')
    if (screenCtx) drawScreen(screenCtx, run, finalView(run))
    cabinet.classList.toggle('is-cheat', stepDone(run, 3))
    coinButton.disabled = false
  }

  function play() {
    cancelAnimationFrame(frameId)
    current = analyse(api)
    const run = current
    const done = [1, 2, 3].filter(n => stepDone(run, n)).length
    cabinet.dataset.steps = String(done)
    cabinet.classList.remove('is-cheat')
    screen.setAttribute('aria-label', describeScreen(run))
    renderWaiting(run)
    renderCaption(run)
    if (reducedMotion.matches) {
      finish(run)
      return
    }
    coinButton.disabled = true
    cabinet.classList.remove('is-coin')
    void cabinet.offsetWidth // restart the coin animation
    cabinet.classList.add('is-coin')
    started = performance.now()
    frameId = requestAnimationFrame(frame)
  }

  function renderWaiting(run: Analysis) {
    const next = run.steps.find(step => !step.done)
    waiting.hidden = !next
    if (next) waiting.replaceChildren(svg('wait', 'ac-icon ac-waiting-icon'), el('strong', '', `Waiting for step ${next.n}`), el('span', '', next.hint))
  }

  function renderCaption(run: Analysis) {
    caption.replaceChildren()
    const latest = el('p', 'ac-caption-latest')
    // only show what a finished step produced: the cheat line means nothing until CheckCheat guards it
    const doneUpTo = (run.steps.find(step => !step.done)?.n ?? 4) - 1
    const shown = run.lines.filter(line => (line.startsWith('Combo') ? doneUpTo >= 2 : line.startsWith('Cheat') ? doneUpTo >= 3 : doneUpTo >= 1))
    latest.append(svg('joystick'), el('code', '', `Latest: ${shown.at(-1) ?? 'nothing printed yet'}`))
    caption.append(latest)

    const next = run.steps.find(step => !step.done)
    const status = el('p', 'ac-caption-status')
    if (run.thrown.length > 0) {
      status.classList.add('is-error')
      status.append(svg('alert'), el('span', '', `Your code threw: ${run.thrown.map(messageOf).join(' / ')}`))
    } else if (next) {
      status.classList.add('is-waiting')
      const text = el('span', '')
      text.append(el('strong', '', `Waiting for step ${next.n}.`), ` ${next.hint}`)
      status.append(svg('wait'), text)
    } else {
      status.append(svg('check'), 'All steps done: every command, combo and cheat is checked by its type.')
    }
    caption.append(status)
  }

  // narrow pages: the cabinet keeps its pixels and scales as a whole
  new ResizeObserver(() => {
    const scale = Math.min(1, (stage.clientWidth - 8) / 420)
    cabinet.style.setProperty('--ac-scale', String(Math.max(0.5, scale)))
    stage.style.height = `${Math.round(440 * Math.max(0.5, scale))}px`
  }).observe(stage)

  coinButton.addEventListener('click', play)
  play()
}
