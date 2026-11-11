// Page header, exercise menu, themed board and runtime error panel. You do not need to modify this file.
import { type IconName, icons } from './icons'

type Exercise = { n: number; name: string; theme: string; board: string; icon: IconName }

const exercises: Exercise[] = [
  { n: 1, name: 'Coral Reef Aquarium', theme: 'aquarium', board: 'Feeding log', icon: 'fish' },
  { n: 2, name: 'Glasshouse Garden', theme: 'greenhouse', board: 'Glasshouse', icon: 'plant' },
  { n: 3, name: 'Pixel Arcade', theme: 'arcade', board: 'Arcade', icon: 'controller' },
  { n: 4, name: 'Hot Air Balloon Launch', theme: 'balloon', board: 'Launch field', icon: 'balloon' },
  { n: 5, name: 'Harbour Lighthouse', theme: 'lighthouse', board: 'Harbour', icon: 'lighthouse' },
  { n: 6, name: 'Night Observatory', theme: 'observatory', board: 'Observatory', icon: 'gauge' },
  { n: 7, name: 'Alpine Hut Bookings', theme: 'hut', board: 'Bookings', icon: 'mountains' },
]

const match = location.pathname.match(/\/(\d+)-(begin|end)(?:\.html)?$/)
const current = match ? { n: Number(match[1]), part: match[2] === 'end' ? 'end' : 'begin' } : undefined
const exercise = exercises.find(e => e.n === current?.n)

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function icon(name: IconName, className = 'icon'): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 256 256')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('class', className)
  svg.innerHTML = icons[name]
  return svg
}

function link(href: string, text: string, className: string, active: boolean): HTMLAnchorElement {
  const anchor = el('a', className, text)
  anchor.href = href
  if (active) anchor.setAttribute('aria-current', 'page')
  return anchor
}

// ---------- header: brand, begin/end switch, menu of every exercise ----------

const header = el('header', 'topbar')
const brand = link('/', '', 'brand', false)
brand.append(el('span', 'brand-badge', 'TS'), el('span', 'brand-name', 'Senior Bootcamp'))
header.append(brand)

if (current && exercise) {
  const switcher = el('nav', 'switch')
  switcher.setAttribute('aria-label', 'Starting point or solution')
  switcher.append(
    link(`/${current.n}-begin.html`, 'Begin', 'switch-option', current.part === 'begin'),
    link(`/${current.n}-end.html`, 'End', 'switch-option', current.part === 'end'),
  )
  header.append(switcher)
}

const menu = el('details', 'menu')
const summary = el('summary', 'menu-button', 'All exercises')
const panel = el('nav', 'menu-panel')
panel.setAttribute('aria-label', 'Exercises')
for (const e of exercises) {
  const row = el('div', `menu-row theme-${e.theme}`)
  const label = el('span', 'menu-label')
  label.append(icon(e.icon, 'menu-icon'), el('span', 'menu-name', `${e.n}. ${e.name}`))
  row.append(
    label,
    link(`/${e.n}-begin.html`, 'Begin', 'menu-link', current?.n === e.n && current.part === 'begin'),
    link(`/${e.n}-end.html`, 'End', 'menu-link', current?.n === e.n && current.part === 'end'),
  )
  if (current?.n === e.n) row.classList.add('is-current')
  panel.append(row)
}
menu.append(summary, panel)
header.append(menu)

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') menu.open = false
})
document.addEventListener('click', (event) => {
  if (event.target instanceof Node && !menu.contains(event.target)) menu.open = false
})

// ---------- page: intro, error panel, themed board ----------

const page = el('main', 'page')
page.append(...Array.from(document.body.childNodes).filter(node => !(node instanceof HTMLScriptElement)))

const title = page.querySelector('h1')
if (title && current && exercise) {
  const kicker = el('p', 'kicker', `Exercise ${current.n}`)
  kicker.append(el('span', `tag tag--${current.part}`, current.part === 'begin' ? 'Your starting point' : 'Reference solution'))
  title.textContent = exercise.name
  title.before(kicker)
  document.body.dataset.theme = exercise.theme
}

const output = page.querySelector<HTMLUListElement>('#output')
const problems = el('section', 'problems')
problems.setAttribute('role', 'alert')
problems.setAttribute('aria-live', 'assertive')
problems.hidden = true

if (output && exercise) {
  const board = el('section', 'board')
  const head = el('header', 'board-head')
  const count = el('span', 'board-count')
  head.append(icon(exercise.icon, 'board-icon'), el('h2', 'board-title', exercise.board), count)
  output.before(board)
  board.append(head, output)
  if (!page.querySelector('#scene')) board.before(problems)

  const updateCount = () => {
    const lines = output.children.length
    count.textContent = lines === 0 ? 'Nothing printed yet' : `${lines} ${lines === 1 ? 'line' : 'lines'}`
    board.classList.toggle('is-empty', lines === 0)
  }
  new MutationObserver(updateCount).observe(output, { childList: true })
  updateCount()
}

// A page with an interactive scene shows the error panel just above it
const scene = page.querySelector<HTMLElement>('#scene')
if (scene) scene.before(problems)
else if (!output) page.append(problems)

document.body.prepend(header, page)

// ---------- type errors and runtime errors ----------

type TypeProblem = { code: string; message: string; where: string; frame?: string }
type RuntimeProblem = { message: string; where?: string }

let typeErrors: TypeProblem[] = []
const runtimeErrors: RuntimeProblem[] = []

function renderProblems() {
  problems.replaceChildren()
  problems.hidden = typeErrors.length === 0 && runtimeErrors.length === 0

  if (typeErrors.length > 0) {
    const block = el('div', 'problem-block problem-block--types')
    const heading = el('h2', 'problem-title')
    const count = typeErrors.length === 1 ? 'a type error' : `${typeErrors.length} type errors`
    heading.append(icon('warning', 'problem-icon'), `TypeScript found ${count} in your file`)
    const list = el('ol', 'problem-list')
    for (const error of typeErrors) {
      const item = el('li', 'problem')
      item.append(el('span', 'problem-where', error.where), el('span', 'problem-code', error.code))
      item.append(el('pre', 'problem-message', error.message))
      if (error.frame) item.append(el('pre', 'problem-frame', error.frame))
      list.append(item)
    }
    block.append(heading, list, el('p', 'problem-hint', 'Save the file after a fix: this list updates by itself.'))
    problems.append(block)
  }

  if (runtimeErrors.length > 0) {
    const block = el('div', 'problem-block problem-block--runtime')
    const heading = el('h2', 'problem-title')
    heading.append(icon('bug', 'problem-icon'), 'Your code threw an error while running')
    const list = el('ol', 'problem-list')
    for (const error of runtimeErrors) {
      const item = el('li', 'problem')
      if (error.where) item.append(el('span', 'problem-where', error.where))
      item.append(el('pre', 'problem-message', error.message))
      list.append(item)
    }
    block.append(heading, list, el('p', 'problem-hint', 'The full stack trace is in the browser console.'))
    problems.append(block)
  }
}

function describeError(reason: unknown): string {
  if (reason instanceof Error) return `${reason.name}: ${reason.message}`
  return `Thrown value: ${String(reason)}`
}

window.addEventListener('error', (event) => {
  // only point at a file when it is one of the exercise sources, not the HTML page
  const path = event.filename ? new URL(event.filename, location.href).pathname.replace(/^\//, '') : ''
  runtimeErrors.push({ message: describeError(event.error ?? event.message), where: path.startsWith('src/') ? path : undefined })
  renderProblems()
})

window.addEventListener('unhandledrejection', (event) => {
  runtimeErrors.push({ message: `${describeError(event.reason)} (in a promise nobody caught)` })
  renderProblems()
})

// vite-plugin-checker (see vite.config.ts) checks the whole project and hides its own overlay.
// This page keeps only the errors of the file it runs, so another exercise never shows up here.
type CheckerDiagnostic = { message?: string; id?: string; frame?: string; loc?: { line: number; column: number } }
type CheckerPayload = { checkerId: string; diagnostics: CheckerDiagnostic[] }
type CheckerMessage =
  | { event: 'vite-plugin-checker:error'; data: CheckerPayload }
  | { event: 'vite-plugin-checker:reconnect'; data: { data: CheckerPayload }[] }

const ownFile = current ? `src/${current.n}-${current.part}.ts` : undefined

function showTypeErrors(payload: CheckerPayload) {
  if (payload.checkerId !== 'typescript' || !ownFile) return
  typeErrors = payload.diagnostics
    .filter(d => d.id?.replaceAll('\\', '/').endsWith(`/${ownFile}`))
    .map(d => {
      const [, code = 'TS', message = d.message ?? ''] = d.message?.match(/^(TS\d+): ([\s\S]*)$/) ?? []
      const where = d.loc ? `${ownFile}:${d.loc.line}:${d.loc.column}` : ownFile
      return { code, message: message.trim(), where, frame: d.frame }
    })
  renderProblems()
}

import.meta.hot?.on('vite-plugin-checker', (message: CheckerMessage) => {
  if (message.event === 'vite-plugin-checker:error') showTypeErrors(message.data)
  else for (const payload of message.data) showTypeErrors(payload.data)
})
