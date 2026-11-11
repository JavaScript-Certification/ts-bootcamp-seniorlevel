// Exercise 2 scene: a small 3D glasshouse that plays one day. You do not need to modify this file.
// Three sensors stand at the door. Each one has a one-line tag: its reading once your Readings
// gives it a type (the type shows on hover), then what your handler did. Your handlers open the
// vents, run the misters and roll the shade down, and the settings you patch with update
// switch the orchid lamp on.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { actuators, day, resetActuators, setHour, type GlasshouseConfig } from '../glasshouse'
import { print } from '../print'
import './glasshouse.css'

// Steps 1 and 3 change types, so the scene also reads your file to see whether they are done
const sources = import.meta.glob<string>('../../2-*.ts', { query: '?raw', import: 'default', eager: true })

function ownSource(): string | undefined {
  if (typeof location === 'undefined') return undefined
  const raw = sources[location.pathname.includes('2-end') ? '../../2-end.ts' : '../../2-begin.ts']
  return raw?.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

/** The text of one type declaration, from `type Name` to the next top-level statement */
function declaration(code: string, name: string): string {
  const start = code.search(new RegExp(`\\btype\\s+${name}\\b`))
  if (start < 0) return ''
  const rest = code.slice(start)
  const end = rest.slice(1).search(/\n(?=(export|type|function|const|let|import|interface|declare|mountScene)\b)/)
  return end < 0 ? rest : rest.slice(0, end + 1)
}

function sourceSteps(): { inferred: boolean; recursive: boolean } {
  const code = ownSource()
  if (code === undefined) return { inferred: true, recursive: true }
  const readingOf = declaration(code, 'ReadingOf')
  const readings = declaration(code, 'Readings')
  const deepPartial = declaration(code, 'DeepPartial').split('=').slice(1).join('=')
  return {
    inferred: /\binfer\b/.test(readingOf) && /\[\s*\w+\s+in\s+keyof\b/.test(readings) && /\bReadingOf\s*</.test(readings),
    recursive: /\bDeepPartial\s*<[^>]*\[/.test(deepPartial),
  }
}

// ---------- what the scene receives from your exercise file ----------

/** The values exported by src/2-begin.ts (or src/2-end.ts) */
export type GlasshouseApi = {
  readAll: () => object
  handlers: object
  settings: GlasshouseConfig
}

// ---------- running your code without letting it break the page ----------

type SensorKey = 'temperature' | 'humidity' | 'light'
type Actuators = ReturnType<typeof actuators>

const sensorKeys: readonly SensorKey[] = ['temperature', 'humidity', 'light']

const sensorInfo: Record<SensorKey, { handler: string; type: string; actuator: keyof Actuators; on: string; off: string }> = {
  temperature: { handler: 'onTemperatureChange', type: 'number', actuator: 'vents', on: 'vents open', off: 'vents closed' },
  humidity: { handler: 'onHumidityChange', type: 'number', actuator: 'misters', on: 'misters on', off: 'misters off' },
  light: { handler: 'onLightChange', type: "'dim' | 'bright'", actuator: 'shade', on: 'shade down', off: 'shade up' },
}

type Round = {
  hour: string
  readings: Record<SensorKey, unknown>
  act: Actuators
  handled: Record<SensorKey, boolean>
  text: string
}

type StepCheck = { n: number; done: boolean; hint: string }

type Analysis = {
  rounds: Round[]
  lamp: { on: boolean; hours: number }
  steps: StepCheck[]
  errors: string[]
  thrown: unknown[]
  lines: string[]
}

function field(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined
  const read: unknown = Reflect.get(value, key)
  return read
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function formatReading(key: SensorKey, value: unknown): string {
  if (key === 'temperature') return `${String(value)} °C`
  if (key === 'humidity') return `${String(value)} %`
  return String(value)
}

function analyse(api: GlasshouseApi): Analysis {
  const errors: string[] = []
  const thrown: unknown[] = []
  const fail = (error: unknown) => {
    const message = messageOf(error)
    if (!errors.includes(message)) {
      errors.push(message)
      thrown.push(error)
    }
  }

  // 1. the day: at each hour, read every sensor and hand each reading to its handler
  const rounds: Round[] = []
  resetActuators()
  for (const moment of day) {
    setHour(moment.hour)
    let read: object = {}
    try {
      read = api.readAll()
    } catch (error) {
      fail(error)
    }
    const readings: Record<SensorKey, unknown> = { temperature: field(read, 'temperature'), humidity: field(read, 'humidity'), light: field(read, 'light') }
    const handled: Record<SensorKey, boolean> = { temperature: false, humidity: false, light: false }
    for (const key of sensorKeys) {
      const handler: unknown = field(api.handlers, sensorInfo[key].handler)
      if (typeof handler !== 'function') continue
      handled[key] = true
      try {
        Reflect.apply(handler, api.handlers, [readings[key]])
      } catch (error) {
        fail(error)
      }
    }
    const act = actuators()
    const reading = sensorKeys.map(key => formatReading(key, readings[key])).join(', ')
    const effects = sensorKeys.filter(key => handled[key]).map(key => (act[sensorInfo[key].actuator] ? sensorInfo[key].on : sensorInfo[key].off))
    rounds.push({ hour: moment.hour, readings, act, handled, text: `${moment.hour} ${reading}: ${effects.length > 0 ? effects.join(', ') : 'no handlers yet'}` })
  }
  resetActuators()
  setHour('14:00')

  // 2. the settings your update returned
  const lampOn = field(field(field(field(api.settings, 'beds'), 'orchids'), 'lamp'), 'on')
  const lampHours = field(field(field(field(api.settings, 'beds'), 'orchids'), 'lamp'), 'hours')
  const lamp = { on: lampOn === true, hours: typeof lampHours === 'number' ? lampHours : 0 }

  const lines = [...rounds.map(round => round.text), lamp.on ? `Orchid lamp: on for ${lamp.hours} hours` : 'Orchid lamp: off']

  // 3. which steps are done (steps 1 and 3 change types, so the file is read too)
  const source = sourceSteps()
  const morning = rounds[0]
  const afternoon = rounds[rounds.length - 1]
  const allHandled = rounds.every(round => sensorKeys.every(key => round.handled[key]))
  const reacts = allHandled && morning !== undefined && afternoon !== undefined
    && !morning.act.vents && !morning.act.misters && !morning.act.shade
    && afternoon.act.vents && afternoon.act.misters && afternoon.act.shade

  const steps: StepCheck[] = [
    { n: 1, done: source.inferred, hint: 'The sensors still read unknown. Write ReadingOf with infer, then map Readings over the sensors.' },
    {
      n: 2,
      done: reacts,
      hint: allHandled
        ? 'Check the rules: vents open above 25 °C, misters on below 55 %, shade down when it is bright.'
        : 'Nothing reacts yet. Write Handlers with key remapping, then add the handlers the compiler asks for.',
    },
    { n: 3, done: lamp.on && source.recursive, hint: 'The orchid lamp is still off. Make DeepPartial recursive, then pass the patch to update.' },
  ]

  return { rounds, lamp, steps, errors, thrown, lines }
}

// ---------- small DOM helpers ----------

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

const svgPaths = {
  play: '<path d="M8 5.5v13l10.5-6.5z" />',
  replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" />',
  clock: '<circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" />',
  leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z" /><path d="M5 19l7-7" />',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5" />',
  wait: '<circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" />',
  alert: '<path d="M12 4 2.8 20h18.4z" /><path d="M12 10v4.5" /><path d="M12 17.5v.01" />',
}

function svg(name: keyof typeof svgPaths, className = 'gh-icon'): SVGSVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  node.setAttribute('viewBox', '0 0 24 24')
  node.setAttribute('aria-hidden', 'true')
  node.setAttribute('class', className)
  node.innerHTML = svgPaths[name]
  return node
}

// ---------- colours of the glasshouse ----------

const palette = {
  ground: '#163a1f',
  path: '#24502d',
  frame: '#eef4ea',
  glass: '#c9efd6',
  stone: '#d9cdb8',
  wood: '#a5714a',
  woodDark: '#7d5234',
  soil: '#4a3223',
  accent: '#8ee07a',
  yellow: '#f1dd35',
  lamp: '#ffd27a',
  mist: '#e4f6ff',
  muted: '#7f9a86',
}

// ---------- canvas textures ----------

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function glowTexture(): THREE.CanvasTexture {
  return canvasTexture(128, 128, (ctx) => {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.35)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
  })
}

/** The shade blind: a cream cloth with soft slats */
function clothTexture(): THREE.CanvasTexture {
  const texture = canvasTexture(256, 64, (ctx) => {
    ctx.fillStyle = '#f2e8cf'
    ctx.fillRect(0, 0, 256, 64)
    ctx.fillStyle = 'rgba(160, 130, 80, 0.22)'
    for (let x = 0; x < 256; x += 16) ctx.fillRect(x, 0, 3, 64)
  })
  texture.wrapS = THREE.RepeatWrapping
  texture.repeat.set(4, 1)
  return texture
}

// ---------- dimensions of the glasshouse ----------

const W = 9 // along x
const D = 4.8 // along z
const KNEE = 0.38 // stone base under the glass
const H = 2.1 // eaves
const RH = 3.45 // ridge
const SLOPE = Math.atan2(RH - H, D / 2)
const SLOPE_LENGTH = Math.hypot(RH - H, D / 2)
const BED_X = [-3, 0, 3] as const
const SENSOR_X = [-3.4, 0, 3.4] as const
const SENSOR_Z = 3.3

type Label = { node: HTMLElement; anchor: THREE.Vector3; place: 'above' | 'below' }

type Visual = { vents: number; mist: number; shade: number; lamp: number; bloom: number; live: number; daylight: number }

/** Shows the glasshouse playing one day: sensors at the door, the roof reacting, the orchid lamp */
export function mountScene(api: GlasshouseApi): void {
  const first = analyse(api)
  first.lines.forEach(line => print(line))

  if (typeof document === 'undefined') return // tests run without a page
  const host = document.querySelector<HTMLElement>('#scene')
  if (!host) return

  // real errors also reach the runtime error panel of the page, pointing at your exercise file
  const exerciseFile = location.pathname.match(/(\d+-(?:begin|end))/)?.[1]
  for (const error of first.thrown) {
    console.error(error)
    const stackFile = error instanceof Error ? error.stack?.match(/\/(src\/\d+-(?:begin|end)\.ts)/)?.[1] : undefined
    window.dispatchEvent(new ErrorEvent('error', {
      error,
      message: messageOf(error),
      filename: stackFile ?? (exerciseFile ? `src/${exerciseFile}.ts` : ''),
    }))
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const root = el('div', 'gh-root')
  host.replaceChildren(root)

  // stage: the 3D glasshouse with its HTML labels
  const stage = el('div', 'gh-stage')
  const labelLayer = el('div', 'gh-labels')
  const toolbar = el('div', 'gh-toolbar')
  const run = el('button', 'gh-run')
  run.type = 'button'
  const clock = el('div', 'gh-clock')
  clock.setAttribute('aria-hidden', 'true')
  const clockText = el('span', '', '08:00')
  clock.append(svg('clock'), clockText)
  toolbar.append(run, clock)
  const waiting = el('div', 'gh-waiting')
  waiting.setAttribute('role', 'status')
  stage.append(labelLayer, waiting, toolbar)

  // one short caption under the stage: the latest reading and what to do next
  const caption = el('div', 'gh-caption')
  caption.setAttribute('aria-live', 'polite')
  root.append(stage, caption)

  let current = first
  let shown = first.rounds.length - 1

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  } catch {
    stage.classList.add('gh-no-webgl')
    run.hidden = true
    waiting.hidden = false
    waiting.replaceChildren(el('strong', '', 'This browser cannot draw the 3D glasshouse.'), el('span', '', 'The day is still printed in the console.'))
    renderCaption()
    return
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.className = 'gh-canvas'
  renderer.domElement.setAttribute('role', 'img')
  stage.prepend(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 100)

  const sky = new THREE.HemisphereLight('#eaf7ff', '#123019', 1.5)
  scene.add(sky)
  const sun = new THREE.DirectionalLight('#fff1d6', 2.1)
  sun.position.set(-5, 14, 10)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -10
  sun.shadow.camera.right = 10
  sun.shadow.camera.top = 9
  sun.shadow.camera.bottom = -9
  sun.shadow.radius = 4
  sun.shadow.bias = -0.0005
  scene.add(sun, sun.target)

  const glow = glowTexture()
  const world = new THREE.Group()
  scene.add(world)

  const mat = (color: string, options: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...options })

  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
    const m = new THREE.Mesh(geometry, material)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    return m
  }

  const up = new THREE.Vector3(0, 1, 0)
  const frameMaterial = mat(palette.frame, { roughness: 0.45 })
  /** A white glazing bar from a to b */
  function bar(a: THREE.Vector3, b: THREE.Vector3, size = 0.07, material: THREE.Material = frameMaterial): THREE.Mesh {
    const length = a.distanceTo(b)
    const m = mesh(new THREE.BoxGeometry(size, length, size), material)
    m.position.copy(a).add(b).multiplyScalar(0.5)
    m.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize())
    return m
  }

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: palette.glass, transparent: true, opacity: 0.1, roughness: 0.08, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false,
  })
  /** A flat pane of glass through four corners */
  function pane(points: THREE.Vector3[], material: THREE.Material = glassMaterial): THREE.Mesh {
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    geometry.setIndex([0, 1, 2, 0, 2, 3])
    geometry.computeVertexNormals()
    const m = new THREE.Mesh(geometry, material)
    m.renderOrder = 2
    return m
  }

  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

  // ---------- ground, path and stone base ----------

  const plinth = mesh(new RoundedBoxGeometry(12.6, 0.36, 9.2, 4, 0.16), mat(palette.ground, { roughness: 0.95 }), 0, -0.18, 0.75)
  plinth.castShadow = false
  world.add(plinth)
  const path = mesh(new RoundedBoxGeometry(10.2, 0.04, 1.4, 2, 0.02), mat(palette.path, { roughness: 1 }), 0, 0.02, SENSOR_Z)
  path.castShadow = false
  world.add(path)
  const floor = mesh(new THREE.BoxGeometry(W, 0.03, D), mat('#2c5634', { roughness: 1 }), 0, 0.015, 0)
  floor.castShadow = false
  world.add(floor)

  const stone = mat(palette.stone, { roughness: 0.85 })
  world.add(mesh(new THREE.BoxGeometry(W + 0.16, KNEE, 0.16), stone, 0, KNEE / 2, D / 2))
  world.add(mesh(new THREE.BoxGeometry(W + 0.16, KNEE, 0.16), stone, 0, KNEE / 2, -D / 2))
  world.add(mesh(new THREE.BoxGeometry(0.16, KNEE, D), stone, -W / 2, KNEE / 2, 0))
  // the right gable has a door: its stone base stops on both sides of it
  world.add(mesh(new THREE.BoxGeometry(0.16, KNEE, D / 2 - 0.55), stone, W / 2, KNEE / 2, -(D / 4 + 0.275)))
  world.add(mesh(new THREE.BoxGeometry(0.16, KNEE, D / 2 - 0.55), stone, W / 2, KNEE / 2, D / 4 + 0.275))

  // ---------- the frame ----------

  const posts = [-4.5, -3, -1.5, 0, 1.5, 3, 4.5]
  for (const x of posts) {
    for (const z of [D / 2, -D / 2]) world.add(bar(v(x, KNEE, z), v(x, H, z)))
    world.add(bar(v(x, H, D / 2), v(x, RH, 0)))
    world.add(bar(v(x, H, -D / 2), v(x, RH, 0)))
  }
  for (const z of [D / 2, -D / 2]) {
    world.add(bar(v(-W / 2, H, z), v(W / 2, H, z), 0.09))
    world.add(bar(v(-W / 2, KNEE, z), v(W / 2, KNEE, z), 0.08))
    world.add(bar(v(-W / 2, 1.25, z), v(W / 2, 1.25, z), 0.045))
  }
  world.add(bar(v(-W / 2 - 0.05, RH, 0), v(W / 2 + 0.05, RH, 0), 0.11))
  // gables: a centre post, and a door on the right
  world.add(bar(v(-W / 2, KNEE, 0), v(-W / 2, RH, 0)))
  world.add(bar(v(-W / 2, KNEE, -D / 2), v(-W / 2, KNEE, D / 2), 0.08))
  for (const z of [-0.55, 0.55]) world.add(bar(v(W / 2, 0, z), v(W / 2, 2.0, z), 0.08))
  world.add(bar(v(W / 2, 2.0, -0.55), v(W / 2, 2.0, 0.55), 0.08))
  world.add(bar(v(W / 2, 2.0, 0), v(W / 2, RH, 0), 0.06))
  for (const z of [D / 2, -D / 2]) world.add(bar(v(W / 2, KNEE, z), v(W / 2, KNEE, z * 0.23), 0.08))

  // ---------- the glass ----------

  for (const z of [D / 2, -D / 2]) world.add(pane([v(-W / 2, KNEE, z), v(W / 2, KNEE, z), v(W / 2, H, z), v(-W / 2, H, z)]))
  world.add(pane([v(-W / 2, H, D / 2), v(W / 2, H, D / 2), v(W / 2, RH, 0), v(-W / 2, RH, 0)]))
  world.add(pane([v(-W / 2, H, -D / 2), v(W / 2, H, -D / 2), v(W / 2, RH, 0), v(-W / 2, RH, 0)]))
  for (const x of [-W / 2, W / 2]) {
    world.add(pane([v(x, KNEE, -D / 2), v(x, KNEE, D / 2), v(x, H, D / 2), v(x, H, -D / 2)]))
    world.add(pane([v(x, H, -D / 2), v(x, H, D / 2), v(x, RH, 0), v(x, RH, 0)]))
  }

  // ---------- roof vents: one per bed, hinged at the ridge ----------

  const vents: THREE.Group[] = []
  const ventGlass = new THREE.MeshStandardMaterial({ color: palette.glass, transparent: true, opacity: 0.32, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false })
  for (const x of BED_X) {
    const hinge = new THREE.Group()
    hinge.position.set(x, RH + 0.04, 0.02)
    hinge.rotation.x = SLOPE
    const w = 1.3
    const l = 0.82
    const panel = mesh(new THREE.BoxGeometry(w, 0.02, l), ventGlass, 0, 0.02, l / 2)
    panel.castShadow = false
    hinge.add(panel)
    hinge.add(bar(v(-w / 2, 0.03, 0), v(-w / 2, 0.03, l), 0.06))
    hinge.add(bar(v(w / 2, 0.03, 0), v(w / 2, 0.03, l), 0.06))
    hinge.add(bar(v(-w / 2, 0.03, l), v(w / 2, 0.03, l), 0.06))
    world.add(hinge)
    vents.push(hinge)
  }

  // ---------- the shade blind, rolled under the vents ----------

  const blindTop = 0.98
  const blindPivot = new THREE.Group()
  blindPivot.position.set(0, RH - Math.sin(SLOPE) * blindTop + 0.07, Math.cos(SLOPE) * blindTop)
  blindPivot.rotation.x = SLOPE
  world.add(blindPivot)
  const roller = mesh(new THREE.CylinderGeometry(0.07, 0.07, W - 0.2, 16), mat('#e9dfc6', { roughness: 0.7 }))
  roller.rotation.z = Math.PI / 2
  blindPivot.add(roller)
  const clothGeometry = new THREE.PlaneGeometry(W - 0.4, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5)
  const cloth = new THREE.Mesh(clothGeometry, new THREE.MeshStandardMaterial({ map: clothTexture(), roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.86 }))
  cloth.castShadow = true
  cloth.position.y = 0.02
  blindPivot.add(cloth)
  const clothLength = SLOPE_LENGTH - blindTop - 0.08

  // ---------- misters along the ridge ----------

  const pipeY = RH - 0.42
  world.add(bar(v(-W / 2 + 0.3, pipeY, 0), v(W / 2 - 0.3, pipeY, 0), 0.05, mat('#9fb8a8', { metalness: 0.5, roughness: 0.3 })))
  const nozzles = [-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6]
  for (const x of nozzles) world.add(mesh(new THREE.SphereGeometry(0.06, 12, 8), mat('#cfe0d4', { metalness: 0.4 }), x, pipeY - 0.05, 0))
  const MIST = 40
  const mistPositions = new Float32Array(nozzles.length * MIST * 3)
  const mistSeeds = Array.from({ length: nozzles.length * MIST }, (_, i) => ({ phase: (i * 0.6180339) % 1, angle: i * 2.39996, spread: 0.4 + ((i * 0.37) % 1) * 0.6 }))
  const mistGeometry = new THREE.BufferGeometry()
  const mistAttribute = new THREE.BufferAttribute(mistPositions, 3)
  mistGeometry.setAttribute('position', mistAttribute)
  const mistMaterial = new THREE.PointsMaterial({ color: palette.mist, map: glow, size: 0.5, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  const mist = new THREE.Points(mistGeometry, mistMaterial)
  mist.renderOrder = 3
  world.add(mist)
  function placeMist(time: number) {
    mistSeeds.forEach((seed, i) => {
      const nozzle = nozzles[Math.floor(i / MIST)] ?? 0
      const k = (seed.phase + time * 0.22) % 1
      const r = seed.spread * k * 0.9
      mistPositions[i * 3] = nozzle + Math.cos(seed.angle) * r
      mistPositions[i * 3 + 1] = pipeY - 0.1 - k * 2.1
      mistPositions[i * 3 + 2] = Math.sin(seed.angle) * r
    })
    mistAttribute.needsUpdate = true
  }
  placeMist(0)

  // ---------- three raised beds ----------

  const woodMaterial = mat(palette.wood, { roughness: 0.75 })
  const soilMaterial = mat(palette.soil, { roughness: 1 })
  for (const x of BED_X) {
    world.add(mesh(new RoundedBoxGeometry(2.3, 0.5, 3.3, 2, 0.05), woodMaterial, x, 0.25, 0))
    world.add(mesh(new THREE.BoxGeometry(2.12, 0.04, 3.12), soilMaterial, x, 0.49, 0))
    for (const z of [-1.62, 1.62]) world.add(mesh(new THREE.BoxGeometry(2.32, 0.05, 0.08), mat(palette.woodDark), x, 0.51, z))
  }

  const leaf = (color: string) => mat(color, { roughness: 0.7, flatShading: true })
  const greens = [leaf('#5fae5a'), leaf('#4c9a4b'), leaf('#79c46a')]

  // herbs: rows of round basil bushes
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const bush = new THREE.Group()
      bush.position.set(BED_X[0] - 0.65 + col * 0.65, 0.52, -1.15 + row * 0.77)
      for (let k = 0; k < 3; k++) {
        const r = 0.17 + ((row + col + k) % 3) * 0.03
        bush.add(mesh(new THREE.IcosahedronGeometry(r, 1), greens[(row + k) % 3] ?? leaf('#5fae5a'), Math.cos(k * 2.1) * 0.1, r * 0.8 + k * 0.03, Math.sin(k * 2.1) * 0.1))
      }
      world.add(bush)
    }
  }

  // tomatoes: plants tied to bamboo canes
  const cane = mat('#cdb57d', { roughness: 0.8 })
  const tomato = mat('#e5533d', { roughness: 0.35 })
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const x = BED_X[1] - 0.45 + col * 0.9
      const z = -1.0 + row * 1.0
      world.add(bar(v(x, 0.5, z), v(x, 1.75, z), 0.035, cane))
      for (let k = 0; k < 4; k++) {
        world.add(mesh(new THREE.IcosahedronGeometry(0.2 - k * 0.025, 1), greens[(k + row) % 3] ?? leaf('#4c9a4b'), x + Math.cos(k * 2.4 + row) * 0.12, 0.72 + k * 0.28, z + Math.sin(k * 2.4 + row) * 0.12))
      }
      for (let k = 0; k < 3; k++) world.add(mesh(new THREE.SphereGeometry(0.075, 14, 10), tomato, x + Math.cos(k * 2.1 + col) * 0.2, 0.85 + k * 0.22, z + Math.sin(k * 2.1 + col) * 0.2))
    }
  }

  // orchids: arching stems with buds that open when the lamp is on
  const orchidLeaf = leaf('#2f6f3d')
  const stemMaterial = mat('#5d8a4c', { roughness: 0.7 })
  const budMaterial = mat('#cfe3b0', { roughness: 0.6 })
  const petalMaterial = mat('#f7d3e4', { roughness: 0.5, emissive: '#f0a8c8', emissiveIntensity: 0 })
  const lipMaterial = mat('#d9467e', { roughness: 0.5 })
  const flowers: THREE.Group[] = []
  const buds: THREE.Group[] = []
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const x = BED_X[2] - 0.45 + col * 0.9
      const z = -1.0 + row * 1.0
      for (let k = 0; k < 3; k++) {
        const l = mesh(new THREE.SphereGeometry(0.3, 12, 8), orchidLeaf, x + Math.cos(k * 2.1) * 0.16, 0.56, z + Math.sin(k * 2.1) * 0.16)
        l.scale.set(1, 0.12, 0.38)
        l.rotation.y = k * 2.1
        world.add(l)
      }
      const lean = col === 0 ? -1 : 1
      const curve = new THREE.CatmullRomCurve3([v(x, 0.55, z), v(x + lean * 0.05, 1.05, z), v(x + lean * 0.22, 1.35, z + 0.05), v(x + lean * 0.42, 1.38, z + 0.08)])
      world.add(mesh(new THREE.TubeGeometry(curve, 20, 0.018, 6), stemMaterial))
      for (let k = 0; k < 3; k++) {
        const point = curve.getPoint(0.55 + k * 0.2)
        const bud = new THREE.Group()
        bud.position.copy(point).add(v(0, -0.05, 0))
        bud.add(mesh(new THREE.SphereGeometry(0.055, 10, 8), budMaterial))
        world.add(bud)
        buds.push(bud)
        const flower = new THREE.Group()
        flower.position.copy(point).add(v(0, -0.06, 0.02))
        for (let p = 0; p < 5; p++) {
          const petal = mesh(new THREE.SphereGeometry(0.08, 10, 8), petalMaterial, Math.cos((p / 5) * Math.PI * 2) * 0.075, Math.sin((p / 5) * Math.PI * 2) * 0.075, 0)
          petal.scale.set(1, 0.7, 0.25)
          petal.rotation.z = (p / 5) * Math.PI * 2
          petal.castShadow = false
          flower.add(petal)
        }
        flower.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), lipMaterial, 0, -0.01, 0.03))
        flower.rotation.y = lean * 0.4
        flower.scale.setScalar(0.001)
        world.add(flower)
        flowers.push(flower)
      }
    }
  }

  // ---------- the orchid lamp ----------

  const lampY = 2.2
  world.add(bar(v(BED_X[2] - 0.8, lampY, 0), v(BED_X[2] - 0.8, pipeY - 0.03, 0), 0.025, mat('#4b5a50')))
  world.add(bar(v(BED_X[2] + 0.8, lampY, 0), v(BED_X[2] + 0.8, pipeY - 0.03, 0), 0.025, mat('#4b5a50')))
  world.add(mesh(new RoundedBoxGeometry(2.0, 0.09, 0.3, 2, 0.03), mat('#34423a', { roughness: 0.4, metalness: 0.3 }), BED_X[2], lampY, 0))
  const lampStripMaterial = mat('#5b5544', { emissive: palette.lamp, emissiveIntensity: 0 })
  const lampStrip = mesh(new THREE.BoxGeometry(1.84, 0.02, 0.18), lampStripMaterial, BED_X[2], lampY - 0.05, 0)
  lampStrip.castShadow = false
  world.add(lampStrip)
  const beamMaterial = new THREE.MeshBasicMaterial({ color: palette.lamp, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.25, lampY - 0.55, 32, 1, true), beamMaterial)
  beam.scale.z = 1.6
  beam.position.set(BED_X[2], (lampY + 0.55) / 2, 0)
  beam.renderOrder = 3
  world.add(beam)
  const lampLight = new THREE.PointLight(palette.lamp, 0, 4.5, 1.4)
  lampLight.position.set(BED_X[2], lampY - 0.35, 0.2)
  world.add(lampLight)

  // ---------- sensors at the door ----------

  const ledMaterials: THREE.MeshStandardMaterial[] = []
  const halos: THREE.SpriteMaterial[] = []
  SENSOR_X.forEach((x) => {
    const post = new THREE.Group()
    post.position.set(x, 0, SENSOR_Z)
    post.add(mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.85, 12), mat('#d6e2d9', { metalness: 0.3, roughness: 0.4 }), 0, 0.43, 0))
    post.add(mesh(new RoundedBoxGeometry(0.42, 0.28, 0.16, 3, 0.05), mat('#f4f6f1', { roughness: 0.4 }), 0, 0.95, 0))
    const led = mat('#4d5e52', { emissive: palette.muted, emissiveIntensity: 0.2 })
    post.add(mesh(new THREE.SphereGeometry(0.05, 14, 10), led, 0, 0.95, 0.085))
    const halo = new THREE.SpriteMaterial({ map: glow, color: palette.accent, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
    const sprite = new THREE.Sprite(halo)
    sprite.position.set(0, 0.95, 0.12)
    sprite.scale.setScalar(0.7)
    post.add(sprite)
    ledMaterials.push(led)
    halos.push(halo)
    world.add(post)
  })

  // ---------- HTML labels: one short tag per sensor ----------

  const labels: Label[] = []
  function addLabel(anchor: THREE.Vector3, node: HTMLElement, place: Label['place']): void {
    node.classList.add('gh-label')
    labelLayer.append(node)
    labels.push({ node, anchor, place })
  }

  const tags = sensorKeys.map((key, i) => {
    const node = el('div', 'gh-tag')
    addLabel(v(SENSOR_X[i] ?? 0, 0, SENSOR_Z + 0.25), node, 'below')
    return { key, node }
  })

  // ---------- what the scene shows, eased towards its target every frame ----------

  const visual: Visual = { vents: 0, mist: 0, shade: 0, lamp: 0, bloom: 0, live: 0, daylight: 0.6 }
  const target: Visual = { ...visual }
  let timers: number[] = []

  function stepDone(n: number): boolean {
    return current.steps.filter(s => s.n === n).every(s => s.done)
  }

  function showRound(index: number) {
    const round = current.rounds[index]
    if (!round) return
    shown = index
    const live = stepDone(1)
    target.live = live ? 1 : 0
    target.vents = round.act.vents ? 1 : 0
    target.mist = round.act.misters ? 1 : 0
    target.shade = round.act.shade ? 1 : 0
    target.daylight = round.readings.light === 'dim' ? 0.55 : 1
    clockText.textContent = round.hour
    for (const tag of tags) {
      const info = sensorInfo[tag.key]
      // one line: the reading, then what the handler did. Under it, a faint hint names the
      // concept: the type step 1 inferred, then the handler name step 2 remapped from the key
      const handled = round.handled[tag.key]
      tag.node.classList.toggle('is-live', live)
      tag.node.title = `${tag.key}: ${live ? info.type : 'unknown'}${handled ? `, handled by ${info.handler}` : ''}`
      const line = el('span', 'gh-tag-line')
      line.append(el('span', 'gh-tag-value', live ? formatReading(tag.key, round.readings[tag.key]) : '?'))
      if (handled) {
        const on = round.act[info.actuator]
        line.append(el('span', 'gh-tag-dot', ' · '), el('span', `gh-effect${on ? ' is-on' : ''}`, on ? info.on : info.off))
      }
      tag.node.replaceChildren(line, el('code', 'gh-tag-hint', handled ? info.handler : `${tag.key}: ${live ? info.type : 'unknown'}`))
    }
    renderCaption()
  }

  function showLamp() {
    const on = current.lamp.on
    target.lamp = on ? 1 : 0
    target.bloom = on && stepDone(3) ? 1 : 0
  }

  function play() {
    for (const timer of timers) clearTimeout(timer)
    timers = []
    const next = current.steps.find(s => !s.done)
    waiting.hidden = !next
    if (next) waiting.replaceChildren(svg('wait', 'gh-icon gh-waiting-icon'), el('strong', '', `Waiting for step ${next.n}`), el('span', '', next.hint))
    run.replaceChildren(svg('replay'), 'Run the day again')

    if (reducedMotion.matches) {
      showRound(current.rounds.length - 1)
      showLamp()
      Object.assign(visual, target)
      return
    }
    target.lamp = 0
    target.bloom = 0
    showRound(0)
    current.rounds.forEach((_, i) => {
      if (i > 0) timers.push(window.setTimeout(() => showRound(i), 300 + i * 1900))
    })
    timers.push(window.setTimeout(showLamp, 300 + current.rounds.length * 1900 - 600))
  }

  // ---------- caption under the stage ----------

  function renderCaption() {
    caption.replaceChildren()
    const latest = el('p', 'gh-caption-latest')
    latest.append(svg('leaf'), el('code', '', `Latest: ${current.rounds[shown]?.text ?? ''}`))
    caption.append(latest)

    const next = current.steps.find(s => !s.done)
    const status = el('p', 'gh-caption-status')
    if (current.errors.length > 0) {
      status.classList.add('is-error')
      status.append(svg('alert'), el('span', '', `Your code threw: ${current.errors.join(' / ')}`))
    } else if (next) {
      status.classList.add('is-waiting')
      const text = el('span', '')
      text.append(el('strong', '', `Waiting for step ${next.n}.`), ` ${next.hint}`)
      status.append(svg('wait'), text)
    } else {
      status.append(svg('check'), 'All steps done: the glasshouse looks after itself.')
    }
    caption.append(status)
  }

  // ---------- camera, resize and the render loop ----------

  const focus = new THREE.Vector3(0.45, 1.05, 1.0)
  const FIT_WIDTH = 11.6
  let distance = 20
  function fitCamera() {
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2)
    const horizontal = Math.atan(Math.tan(halfFov) * camera.aspect)
    distance = Math.max(16, (FIT_WIDTH / 2) / Math.tan(horizontal))
    camera.position.copy(focus).addScaledVector(new THREE.Vector3(0.2, 0.5, 1).normalize(), distance)
    camera.lookAt(focus)
  }

  function resize() {
    const width = stage.clientWidth
    const height = stage.clientHeight
    if (width === 0 || height === 0) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    fitCamera()
  }

  const projected = new THREE.Vector3()
  function placeLabels() {
    const width = stage.clientWidth
    const height = stage.clientHeight
    for (const { node, anchor, place } of labels) {
      projected.copy(anchor)
      world.localToWorld(projected)
      projected.project(camera)
      const x = (projected.x * 0.5 + 0.5) * width
      const y = (-projected.y * 0.5 + 0.5) * height
      node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, ${place === 'above' ? '-100%' : '0'})`
    }
  }

  let last = performance.now()
  function frame(now: number) {
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    const motion = !reducedMotion.matches
    const ease = motion ? 1 - Math.exp(-dt * 3.2) : 1
    for (const key of Object.keys(target)) {
      const goal: unknown = Reflect.get(target, key)
      const value: unknown = Reflect.get(visual, key)
      if (typeof goal === 'number' && typeof value === 'number') Reflect.set(visual, key, value + (goal - value) * ease)
    }
    const time = now / 1000

    vents.forEach((hinge) => {
      hinge.rotation.x = SLOPE - visual.vents * 0.62
    })
    cloth.scale.z = Math.max(0.001, visual.shade * clothLength)
    cloth.visible = visual.shade > 0.01
    mistMaterial.opacity = 0.7 * visual.mist
    mist.visible = visual.mist > 0.01
    if (mist.visible) placeMist(motion ? time : 0.5)
    lampStripMaterial.emissiveIntensity = 2.2 * visual.lamp
    beamMaterial.opacity = 0.17 * visual.lamp
    lampLight.intensity = 10 * visual.lamp
    const breathe = motion ? 1 + Math.sin(time * 1.4) * 0.03 : 1
    flowers.forEach((flower, i) => {
      const k = Math.min(1, Math.max(0, visual.bloom * 1.6 - (i % 6) * 0.1))
      flower.scale.setScalar(Math.max(0.001, k * breathe))
    })
    buds.forEach((bud) => {
      bud.scale.setScalar(Math.max(0.001, 1 - visual.bloom))
    })
    petalMaterial.emissiveIntensity = 0.25 * visual.lamp
    for (const led of ledMaterials) {
      led.color.set(visual.live > 0.5 ? palette.accent : '#4d5e52')
      led.emissive.set(visual.live > 0.5 ? palette.accent : palette.muted)
      led.emissiveIntensity = 0.2 + 1.4 * visual.live * (motion ? 0.85 + 0.15 * Math.sin(time * 2.4) : 1)
    }
    for (const halo of halos) halo.opacity = 0.6 * visual.live
    sky.intensity = 0.9 + 0.75 * visual.daylight
    sun.intensity = 1.0 + 1.3 * visual.daylight

    renderer.render(scene, camera)
    placeLabels()
    requestAnimationFrame(frame)
  }

  new ResizeObserver(resize).observe(stage)

  run.addEventListener('click', () => {
    current = analyse(api)
    play()
  })

  // the tags use the page fonts: wait for them (never more than a second and a half)
  const fonts = ['700 16px Montserrat', '500 14px "JetBrains Mono"'].map(font => document.fonts.load(font).catch(() => []))
  const fontsOrTimeout = Promise.race([Promise.all(fonts), new Promise(resolve => setTimeout(resolve, 1500))])
  void fontsOrTimeout.then(() => {
    resize()
    play()
    requestAnimationFrame(frame)
  })
}
