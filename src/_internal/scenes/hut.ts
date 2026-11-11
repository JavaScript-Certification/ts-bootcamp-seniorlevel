// Exercise 7 scene: a small 3D mountain hut that shows tonight's bookings. You do not need to modify this file.
// Every request your parseBooking accepts leaves a backpack on the porch, every bunk your assignBunks
// hands out gets a blanket with the guest's name, and the requests you turn away pile up in the snow.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { CAPACITY, requests } from '../hut-inbox'
import type { Result } from '../hut-schema'
import { print } from '../print'
import './hut.css'

// Step 1 only changes types, so the scene reads your file to see whether it is done
const sources = import.meta.glob<string>('../../7-*.ts', { query: '?raw', import: 'default', eager: true })

function bookingFromSchema(): boolean {
  if (typeof location === 'undefined') return true
  const raw = sources[location.pathname.includes('7-end') ? '../../7-end.ts' : '../../7-begin.ts']
  if (raw === undefined) return true
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  const infer = /\btype\s+Infer\s*<[^>]*>\s*=[^;\n]*\bextends\b[^;\n]*\binfer\b/.test(code)
  const booking = /\btype\s+Booking\s*=\s*Infer\s*<\s*typeof\s+bookingSchema\s*>/.test(code)
  return infer && booking
}

// ---------- what the scene receives from your exercise file ----------

/** The functions exported by src/7-begin.ts (or src/7-end.ts) */
export type HutApi<B extends object> = {
  parseBooking: (json: string) => Result<B>
  assignBunks: (bookings: readonly B[], capacity: number) => string[]
  board: (inbox: readonly string[]) => string[]
}

// ---------- running your functions without letting them break the page ----------

type Party = { request: number; guest: string; nights: number; color: string; bunks: number[] }
type StepCheck = { n: number; done: boolean; hint: string }

type Analysis = {
  parties: Party[]
  /** owner of each bunk, by guest name ('' when free) */
  bunks: string[]
  turnedAway: { request: number; label: string; reason: string }[]
  /** what happened to each request, in order */
  order: ({ kind: 'party'; party: number } | { kind: 'away'; slot: number })[]
  lit: boolean
  steps: StepCheck[]
  errors: string[]
  thrown: unknown[]
  lines: string[]
}

const partyColors = ['#ff8f6b', '#f2c94c', '#7fd1ae', '#a5b8ff', '#f39bc4', '#8fd3e8']

function field(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined
  const read: unknown = Reflect.get(value, key)
  return read
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function quietly<T>(run: () => T, fallback: T): T {
  try {
    return run()
  } catch {
    return fallback
  }
}

/** a name for a request, even when its JSON is broken */
function labelOf(json: string, index: number): string {
  return json.match(/"guest"\s*:\s*"([^"]{1,12})"/)?.[1] ?? `#${index + 1}`
}

function analyse<B extends object>(api: HutApi<B>): Analysis {
  const errors: string[] = []
  const thrown: unknown[] = []
  const fail = (error: unknown) => {
    const message = messageOf(error)
    if (!errors.includes(message)) {
      errors.push(message)
      thrown.push(error)
    }
    return message
  }

  // 1. the board itself, printed in the console like before
  let lines: string[] = []
  try {
    lines = api.board(requests)
  } catch (error) {
    fail(error)
  }

  // 2. every request goes through parseBooking: a party on the porch, or the pile in the snow
  const admitted: B[] = []
  const parties: Party[] = []
  const turnedAway: Analysis['turnedAway'] = []
  const order: Analysis['order'] = []
  requests.forEach((json, request) => {
    let reason = ''
    try {
      const result = api.parseBooking(json)
      if (result.ok) {
        const guest = field(result.value, 'guest')
        const nights = field(result.value, 'nights')
        admitted.push(result.value)
        order.push({ kind: 'party', party: parties.length })
        parties.push({
          request,
          guest: typeof guest === 'string' ? guest : labelOf(json, request),
          nights: typeof nights === 'number' ? nights : 0,
          color: partyColors[parties.length % partyColors.length] ?? '#ff8f6b',
          bunks: [],
        })
        return
      }
      reason = result.errors.join(', ')
    } catch (error) {
      reason = `threw: ${fail(error)}`
    }
    order.push({ kind: 'away', slot: turnedAway.length })
    turnedAway.push({ request, label: labelOf(json, request), reason })
  })

  // 3. the valid bookings go through assignBunks
  let bunks: string[] = []
  try {
    bunks = api.assignBunks(admitted, CAPACITY).slice(0, CAPACITY).map(name => (typeof name === 'string' ? name : ''))
  } catch (error) {
    fail(error)
  }
  while (bunks.length < CAPACITY) bunks.push('')
  for (const party of parties) {
    party.bunks = bunks.flatMap((name, slot) => (name === party.guest ? [slot] : []))
  }

  // 4. quiet probes that tell which steps are done (their errors are expected)
  const lit = bookingFromSchema()
  const accepts = (json: string) => quietly(() => api.parseBooking(json).ok, false)
  const parses = accepts(requests[0] ?? '') && !accepts('{"guest":"Luca","party":1,') && !accepts('{"guest":"Reto","party":"3","nights":2}')
  const probe: unknown = { guest: 'Heidi', party: 2, nights: 1 }
  const assigns = quietly(() => {
    // the probe is a valid booking: it goes through your own parseBooking first when it can
    const parsed = api.parseBooking(JSON.stringify(probe))
    if (!parsed.ok) return false
    const plan = api.assignBunks([parsed.value], 3)
    return plan.join('|') === 'Heidi|Heidi|'
  }, false)

  const steps: StepCheck[] = [
    { n: 1, done: lit, hint: 'Booking is still a hand-written copy. Compute it from bookingSchema with Infer.' },
    {
      n: 2,
      done: parses,
      hint: parties.length === 0
        ? 'parseBooking turns every request away. Parse the JSON, then let the schema check it.'
        : 'parseBooking should accept Heidi, and turn away the broken JSON and the party written as text.',
    },
    { n: 3, done: assigns, hint: 'The guests are in, but nobody gets a bunk. Type assignBunks with Booking.' },
  ]

  return { parties, bunks, turnedAway, order, lit, steps, errors, thrown, lines }
}

// ---------- small DOM helpers ----------

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

const svgPaths = {
  replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.5h4.5" />',
  door: '<path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21" /><path d="M3.5 21h17" /><path d="M14.5 12.5v.01" />',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" />',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5" />',
  wait: '<circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" />',
  alert: '<path d="M12 4 2.8 20h18.4z" /><path d="M12 10v4.5" /><path d="M12 17.5v.01" />',
}

function svg(name: keyof typeof svgPaths, className = 'hut-icon'): SVGSVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  node.setAttribute('viewBox', '0 0 24 24')
  node.setAttribute('aria-hidden', 'true')
  node.setAttribute('class', className)
  node.innerHTML = svgPaths[name]
  return node
}

// ---------- colours of the hut ----------

const palette = {
  pine: '#1a2421',
  snow: '#dfe9e5',
  snowShade: '#b9cbc4',
  stone: '#5f6d68',
  wood: '#8a5a36',
  woodDark: '#5e3b22',
  woodLight: '#b07a4c',
  linen: '#e6dcc6',
  lamp: '#ffc27a',
  coral: '#ff8f6b',
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
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.45)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
  })
}

/** vertical planks for the walls */
function plankTexture(base: string, line: string, planks: number): THREE.CanvasTexture {
  return canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, 512, 256)
    const w = 512 / planks
    for (let i = 0; i < planks; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)'
      ctx.fillRect(i * w, 0, w, 256)
      ctx.fillStyle = line
      ctx.fillRect(i * w, 0, 3, 256)
    }
  })
}

function blanketTexture(name: string, color: string): THREE.CanvasTexture {
  return canvasTexture(256, 200, (ctx) => {
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 256, 200)
    // a soft quilted check
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth = 3
    for (let x = 32; x < 256; x += 48) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 200)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    ctx.fillRect(0, 0, 256, 26)
    ctx.fillStyle = '#1a2421'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 ${name.length > 6 ? 46 : 54}px Montserrat, sans-serif`
    ctx.fillText(name, 128, 112)
  })
}

function envelopeTexture(label: string): THREE.CanvasTexture {
  return canvasTexture(256, 172, (ctx) => {
    ctx.fillStyle = '#efe6d2'
    ctx.fillRect(0, 0, 256, 172)
    ctx.strokeStyle = '#cbbd9f'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(6, 6)
    ctx.lineTo(128, 92)
    ctx.lineTo(250, 6)
    ctx.stroke()
    ctx.fillStyle = '#1a2421'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `700 ${label.length > 5 ? 36 : 42}px Montserrat, sans-serif`
    ctx.fillText(label, 128, 128)
    // the stamp
    ctx.save()
    ctx.translate(206, 44)
    ctx.rotate(-0.3)
    ctx.strokeStyle = '#d9583a'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(0, 0, 26, 0, Math.PI * 2)
    ctx.moveTo(-12, -12)
    ctx.lineTo(12, 12)
    ctx.moveTo(12, -12)
    ctx.lineTo(-12, 12)
    ctx.stroke()
    ctx.restore()
  })
}

// ---------- easing ----------

const easeOutCubic = (k: number) => 1 - (1 - k) ** 3
function easeOutBounce(k: number): number {
  if (k < 1 / 2.75) return 7.5625 * k * k
  if (k < 2 / 2.75) return 7.5625 * (k -= 1.5 / 2.75) * k + 0.75
  if (k < 2.5 / 2.75) return 7.5625 * (k -= 2.25 / 2.75) * k + 0.9375
  return 7.5625 * (k -= 2.625 / 2.75) * k + 0.984375
}

type Tween = { start: number; duration: number; apply: (k: number) => void }
type Label = { node: HTMLElement; anchor: THREE.Vector3; below: boolean }

// ---------- the hut ----------

const HALF = 4 // half the inside width
const FLOOR = 0.6 // top of the floor
const EAVES = 4.5
const RIDGE = 6.9
const SLOT = (HALF * 2 - 0.4) / 5
const TIERS = [1.35, 2.95] // top of each bunk platform
const BUNK_Z = -1.13
const PILE_X = 6.1

function bunkPosition(slot: number): THREE.Vector3 {
  const tier = slot < 5 ? 0 : 1
  const column = slot % 5
  return new THREE.Vector3(-HALF + 0.2 + SLOT * (column + 0.5), (TIERS[tier] ?? 0) + 0.18, BUNK_Z)
}

/** Shows tonight's bookings as a mountain hut: bunks for the valid bookings, a pile of turned-away requests */
export function mountScene<B extends object>(api: HutApi<B>): void {
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
  const root = el('div', 'hut-root')
  host.replaceChildren(root)

  const stage = el('div', 'hut-stage')
  const labelLayer = el('div', 'hut-labels')
  const toolbar = el('div', 'hut-toolbar')
  const replay = el('button', 'hut-replay')
  replay.type = 'button'
  replay.append(svg('replay'), 'Replay the bookings')
  toolbar.append(replay)
  const waiting = el('div', 'hut-waiting')
  waiting.setAttribute('role', 'status')
  stage.append(labelLayer, waiting, toolbar)

  const caption = el('div', 'hut-caption')
  caption.setAttribute('aria-live', 'polite')
  root.append(stage, caption)

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  } catch {
    stage.classList.add('hut-no-webgl')
    waiting.hidden = false
    waiting.replaceChildren(el('strong', '', 'This browser cannot draw the 3D hut.'), el('span', '', 'The board is still printed in the console.'))
    renderCaption(first)
    return
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.className = 'hut-canvas'
  renderer.domElement.setAttribute('role', 'img')
  stage.prepend(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 120)

  scene.add(new THREE.HemisphereLight('#e4f1ec', '#22302c', 1.5))
  const moon = new THREE.DirectionalLight('#fff3e3', 2.1)
  moon.position.set(-7, 15, 11)
  moon.castShadow = true
  moon.shadow.mapSize.set(2048, 2048)
  moon.shadow.camera.left = -14
  moon.shadow.camera.right = 14
  moon.shadow.camera.top = 12
  moon.shadow.camera.bottom = -8
  moon.shadow.radius = 4
  moon.shadow.bias = -0.0005
  scene.add(moon, moon.target)

  const glow = glowTexture()
  const mat = (color: string, options: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.02, ...options })

  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0): THREE.Mesh {
    const m = new THREE.Mesh(geometry, material)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    return m
  }

  // ---------- the fixed world: ground, mountains, pines and the hut ----------

  const fixed = new THREE.Group()
  scene.add(fixed)

  const ground = mesh(new RoundedBoxGeometry(19, 0.6, 7.6, 4, 0.28), mat(palette.snow, { roughness: 0.95 }), 0, -0.3, 0.4)
  ground.castShadow = false
  fixed.add(ground)

  // far mountains, quiet and low in contrast
  for (const [x, z, r, h, color] of [[-8.5, -15, 6.5, 7.5, '#22312d'], [1.5, -19, 8.5, 9.5, '#253530'], [11, -14, 5.5, 6.5, '#22312d']] as const) {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5, 1), mat(color, { flatShading: true, roughness: 1 }))
    peak.position.set(x, h / 2 - 1, z)
    peak.rotation.y = x * 0.37
    fixed.add(peak)
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.3, h * 0.3, 5, 1), mat('#9fb4ac', { flatShading: true, roughness: 1 }))
    cap.position.set(x, h - 1 - h * 0.15 + 0.02, z)
    cap.rotation.y = x * 0.37
    fixed.add(cap)
  }

  function pine(x: number, z: number, scale: number) {
    const tree = new THREE.Group()
    tree.position.set(x, 0, z)
    tree.scale.setScalar(scale)
    tree.add(mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.7, 8), mat(palette.woodDark), 0, 0.35, 0))
    const layers = [[1.25, 1.6, 1.2], [1.0, 1.4, 2.0], [0.7, 1.2, 2.7]] as const
    for (const [r, h, y] of layers) {
      tree.add(mesh(new THREE.ConeGeometry(r, h, 7), mat('#2f5a47', { flatShading: true }), 0, y, 0))
      tree.add(mesh(new THREE.ConeGeometry(r * 0.55, h * 0.32, 7), mat(palette.snow, { flatShading: true }), 0, y + h * 0.36, 0))
    }
    fixed.add(tree)
  }
  pine(-6.9, -1.7, 1.15)
  pine(-8.1, 0.6, 0.85)
  pine(7.9, -2.3, 1.0)

  // the hut: stone base, floor, walls, bunks and roof
  const hut = new THREE.Group()
  fixed.add(hut)
  hut.add(mesh(new RoundedBoxGeometry(HALF * 2 + 0.9, 0.62, 4.7, 2, 0.08), mat(palette.stone, { roughness: 0.9 }), 0, 0.3, 0))
  const floorMat = new THREE.MeshStandardMaterial({ map: plankTexture('#a5713f', '#7d522c', 10), roughness: 0.8 })
  const floor = mesh(new THREE.BoxGeometry(HALF * 2 + 0.44, 0.1, 4.3), floorMat, 0, FLOOR - 0.04, 0)
  hut.add(floor)

  const wallMat = new THREE.MeshStandardMaterial({ map: plankTexture('#7b4f2f', '#5a3820', 12), roughness: 0.85 })
  hut.add(mesh(new THREE.BoxGeometry(HALF * 2 + 0.44, EAVES - FLOOR, 0.2), wallMat, 0, (EAVES + FLOOR) / 2, -2.05))
  for (const side of [-1, 1]) {
    hut.add(mesh(new THREE.BoxGeometry(0.22, EAVES - FLOOR, 4.3), mat(palette.woodDark), side * (HALF + 0.11), (EAVES + FLOOR) / 2, 0))
  }
  // the back gable, a triangle up to the ridge
  const gableShape = new THREE.Shape()
  gableShape.moveTo(-HALF - 0.22, 0)
  gableShape.lineTo(HALF + 0.22, 0)
  gableShape.lineTo(0, RIDGE - EAVES)
  gableShape.closePath()
  const gable = mesh(new THREE.ExtrudeGeometry(gableShape, { depth: 0.2, bevelEnabled: false }), mat('#6f4629'), 0, EAVES, -2.15)
  hut.add(gable)

  // a small window in the gable and a hanging lantern: they light up once Booking comes from the schema
  const windowMat = mat('#2b3a36', { emissive: palette.lamp, emissiveIntensity: 0 })
  hut.add(mesh(new RoundedBoxGeometry(0.9, 0.9, 0.08, 2, 0.04), mat(palette.woodDark), 0, 5.4, -1.93))
  hut.add(mesh(new THREE.PlaneGeometry(0.66, 0.66), windowMat, 0, 5.4, -1.88))
  const lantern = new THREE.Group()
  lantern.position.set(0, 4.75, 0.5)
  hut.add(lantern)
  lantern.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 6), mat('#2a2a2a'), 0, 0.85, 0))
  const lanternGlass = mat('#3a463f', { emissive: palette.lamp, emissiveIntensity: 0, roughness: 0.3 })
  lantern.add(mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.38, 8), lanternGlass, 0, 0, 0))
  lantern.add(mesh(new THREE.ConeGeometry(0.26, 0.2, 8), mat('#2f3532'), 0, 0.29, 0))
  const lanternHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: palette.lamp, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }))
  lanternHalo.scale.setScalar(2.4)
  lantern.add(lanternHalo)
  const lamp = new THREE.PointLight(palette.lamp, 0, 11, 1.6)
  lamp.position.set(0, -0.3, 0)
  lantern.add(lamp)

  // two tiers of bunks along the back wall, five bunks each
  const bunkWood = mat(palette.woodLight, { roughness: 0.7 })
  for (const top of TIERS) {
    hut.add(mesh(new THREE.BoxGeometry(HALF * 2 - 0.2, 0.14, 1.78), bunkWood, 0, top - 0.07, BUNK_Z))
    hut.add(mesh(new THREE.BoxGeometry(HALF * 2 - 0.2, 0.2, 0.1), mat(palette.wood), 0, top - 0.04, BUNK_Z + 0.9))
  }
  hut.add(mesh(new THREE.BoxGeometry(HALF * 2 - 0.2, 0.08, 0.08), mat(palette.wood), 0, (TIERS[1] ?? 0) + 0.42, BUNK_Z + 0.9))
  for (const x of [-HALF + 0.14, HALF - 0.14]) {
    hut.add(mesh(new THREE.BoxGeometry(0.14, (TIERS[1] ?? 0) + 0.5 - FLOOR, 0.14), mat(palette.wood), x, (FLOOR + (TIERS[1] ?? 0) + 0.5) / 2, BUNK_Z + 0.9))
  }
  for (let slot = 0; slot < CAPACITY; slot++) {
    const at = bunkPosition(slot)
    hut.add(mesh(new RoundedBoxGeometry(SLOT - 0.12, 0.18, 1.58, 2, 0.06), mat(palette.linen, { roughness: 0.95 }), at.x, at.y - 0.09, at.z))
    hut.add(mesh(new RoundedBoxGeometry(0.62, 0.13, 0.36, 2, 0.06), mat('#f4efe3', { roughness: 0.95 }), at.x, at.y + 0.05, at.z - 0.5))
  }

  // the roof, with snow on both slopes, and a stone chimney
  const slope = Math.atan2(RIDGE - EAVES, HALF + 0.11)
  const span = Math.hypot(RIDGE - EAVES, HALF + 0.11) + 0.75
  for (const side of [-1, 1]) {
    const half = new THREE.Group()
    half.position.set(0, RIDGE, 0)
    half.rotation.z = -side * slope
    half.add(mesh(new THREE.BoxGeometry(span, 0.26, 4.9), mat(palette.woodDark), side * span / 2, 0.13, 0))
    half.add(mesh(new RoundedBoxGeometry(span + 0.06, 0.3, 5.0, 3, 0.12), mat(palette.snow, { roughness: 0.95 }), side * span / 2, 0.38, 0))
    hut.add(half)
  }
  const chimney = mesh(new THREE.BoxGeometry(0.6, 1.9, 0.6), mat(palette.stone, { roughness: 0.9 }), 2.4, 6.55, -1.2)
  hut.add(chimney)
  hut.add(mesh(new RoundedBoxGeometry(0.76, 0.18, 0.76, 2, 0.06), mat(palette.snow), 2.4, 7.55, -1.2))

  // smoke from the chimney while the hut is open
  const puffs: THREE.Sprite[] = []
  for (let i = 0; i < 4; i++) {
    const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#eef3f1', transparent: true, opacity: 0, depthWrite: false }))
    fixed.add(puff)
    puffs.push(puff)
  }

  // a few snowflakes, falling slowly
  const flakeCount = 140
  const flakePositions = new Float32Array(flakeCount * 3)
  for (let i = 0; i < flakeCount; i++) {
    flakePositions[i * 3] = (Math.random() - 0.5) * 26
    flakePositions[i * 3 + 1] = Math.random() * 12
    flakePositions[i * 3 + 2] = (Math.random() - 0.5) * 10
  }
  const flakeGeometry = new THREE.BufferGeometry()
  flakeGeometry.setAttribute('position', new THREE.BufferAttribute(flakePositions, 3))
  const flakes = new THREE.Points(flakeGeometry, new THREE.PointsMaterial({ color: '#e8f1ee', size: 0.07, transparent: true, opacity: 0.7, depthWrite: false }))
  fixed.add(flakes)

  // ---------- what changes on each run ----------

  const world = new THREE.Group() // rebuilt on each replay
  scene.add(world)

  let labels: Label[] = []
  let tweens: Tween[] = []
  let open = false
  const target = new THREE.Vector3(0.3, 3.2, 0)
  let distance = 26
  let clockStart = performance.now()

  const now = () => (performance.now() - clockStart) / 1000
  const tween = (start: number, duration: number, apply: (k: number) => void) => {
    if (reducedMotion.matches || duration === 0) apply(1)
    else {
      apply(0)
      tweens.push({ start, duration, apply })
    }
  }

  function dispose(object: THREE.Object3D) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
        child.geometry.dispose()
        const materials: THREE.Material[] = Array.isArray(child.material) ? child.material : [child.material]
        for (const material of materials) {
          if ('map' in material && material.map instanceof THREE.Texture && material.map !== glow) material.map.dispose()
          material.dispose()
        }
      }
    })
  }

  function addLabel(anchor: THREE.Vector3, node: HTMLElement, below = false): void {
    node.classList.add('hut-label')
    labelLayer.append(node)
    labels.push({ node, anchor, below })
  }

  function backpack(color: string): THREE.Group {
    const group = new THREE.Group()
    group.add(mesh(new RoundedBoxGeometry(0.56, 0.7, 0.36, 3, 0.12), mat(color, { roughness: 0.65 }), 0, 0.35, 0))
    group.add(mesh(new RoundedBoxGeometry(0.58, 0.26, 0.38, 3, 0.1), mat(color, { roughness: 0.5, emissive: color, emissiveIntensity: 0.08 }), 0, 0.62, 0.02))
    group.add(mesh(new RoundedBoxGeometry(0.4, 0.22, 0.08, 2, 0.04), mat(color, { roughness: 0.8 }), 0, 0.28, 0.2))
    const roll = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.62, 12), mat(palette.linen), 0, 0.84, 0)
    roll.rotation.z = Math.PI / 2
    group.add(roll)
    return group
  }

  function build(run: Analysis) {
    dispose(world)
    world.clear()
    labelLayer.replaceChildren()
    labels = []
    tweens = []
    clockStart = performance.now()
    open = run.lit

    // the hut lights up once step 1 is done
    lanternGlass.emissiveIntensity = run.lit ? 1.6 : 0
    windowMat.emissiveIntensity = run.lit ? 1.1 : 0
    lanternHalo.material.opacity = run.lit ? 0.75 : 0
    lamp.intensity = run.lit ? 9 : 0
    for (const puff of puffs) puff.visible = run.lit

    const away = run.turnedAway.length
    renderer.domElement.setAttribute(
      'aria-label',
      `Mountain hut with ${run.bunks.filter(name => name !== '').length} of ${CAPACITY} bunks taken and ${away} requests turned away`,
    )

    // the pile of turned-away requests, in the snow by the hut
    const pileLabel = el('div', 'hut-pile-label')
    const pileCount = el('strong', 'hut-pile-count', '0')
    pileLabel.append(svg('mail'), el('span', '', 'Turned away'), pileCount)
    addLabel(new THREE.Vector3(PILE_X, 1.25, 1.2), pileLabel)

    // step 1: the lamp comes on once Booking is computed from the schema, and says how
    if (run.lit) addLabel(new THREE.Vector3(0, 6.1, -1.88), el('code', 'hut-type', 'Infer<typeof bookingSchema>'))

    const step = 0.55
    let landed = 0
    const porch = run.parties.length
    run.order.forEach((outcome, index) => {
      const start = 0.35 + index * step
      if (outcome.kind === 'party') {
        const party = run.parties[outcome.party]
        if (!party) return
        const x = porch <= 1 ? 0 : -3.15 + (6.3 * outcome.party) / (porch - 1)
        addParty(party, x, start)
      } else {
        addEnvelope(run.turnedAway[outcome.slot]?.label ?? '?', outcome.slot, start, () => {
          landed++
          pileCount.textContent = String(landed)
        })
      }
    })
    if (reducedMotion.matches) pileCount.textContent = String(away)

    // no guest yet: the hut waits for the first unfinished step
    const next = run.steps.find(s => !s.done)
    waiting.hidden = run.parties.length > 0
    if (run.parties.length === 0) {
      waiting.replaceChildren(svg('wait', 'hut-icon hut-waiting-icon'), el('strong', '', `Waiting for step ${next?.n ?? 2}`), el('span', '', next?.hint ?? ''))
    }

    renderCaption(run)
  }

  function addParty(party: Party, x: number, start: number) {
    // a backpack on the porch
    const pack = backpack(party.color)
    pack.position.set(x, FLOOR, 1.45)
    pack.rotation.y = (x % 2) * 0.08
    world.add(pack)
    tween(start, 0.8, (k) => {
      pack.position.y = FLOOR + (1 - easeOutBounce(k)) * 4
      pack.visible = k > 0 || reducedMotion.matches
    })

    // one blanket per bunk your assignBunks gave this party
    party.bunks.forEach((slot, i) => {
      const at = bunkPosition(slot)
      const blanket = mesh(
        new RoundedBoxGeometry(SLOT - 0.18, 0.1, 1.02, 2, 0.04),
        [mat(party.color), mat(party.color), new THREE.MeshStandardMaterial({ map: blanketTexture(party.guest, party.color), roughness: 0.9 }), mat(party.color), mat(party.color), mat(party.color)],
        at.x,
        at.y + 0.05,
        at.z + 0.24,
      )
      world.add(blanket)
      tween(start + 0.35 + i * 0.12, 0.6, (k) => {
        const e = easeOutCubic(k)
        blanket.position.y = at.y + 0.05 + (1 - e) * 0.9
        blanket.scale.setScalar(0.4 + 0.6 * e)
        blanket.visible = k > 0 || reducedMotion.matches
      })
    })

    // its tag, in the snow in front of the hut
    const tag = el('div', 'hut-tag')
    tag.style.setProperty('--party', party.color)
    // just the name: the blankets above already show how many bunks it got
    const bunks = party.bunks.length
    const count = bunks === 0 ? 'no bunk' : `${bunks} ${bunks === 1 ? 'bunk' : 'bunks'}`
    tag.append(el('strong', 'hut-tag-name', party.guest))
    if (bunks === 0) tag.classList.add('hut-tag-warn')
    tag.title = `${party.guest}: ${count}, ${party.nights} ${party.nights === 1 ? 'night' : 'nights'}`
    tag.hidden = true
    addLabel(new THREE.Vector3(x, 0.05, 2.45), tag, true)
    tween(start + 0.4, 0.01, (k) => {
      tag.hidden = k < 1
    })
  }

  function addEnvelope(label: string, slot: number, start: number, onLand: () => void) {
    const paper = mat('#e8dfcb', { roughness: 0.9 })
    const face = new THREE.MeshStandardMaterial({ map: envelopeTexture(label), roughness: 0.9 })
    const envelope = mesh(new THREE.BoxGeometry(1.15, 0.06, 0.78), [paper, paper, face, paper, paper, paper])
    const tx = PILE_X + (slot % 2 === 0 ? -0.18 : 0.2) + (slot % 3) * 0.05
    const tz = 1.2 + (slot % 3 === 1 ? 0.2 : -0.1)
    const ty = 0.03 + slot * 0.065
    const turn = (slot % 2 ? 1 : -1) * (0.25 + 0.12 * (slot % 3))
    envelope.position.set(tx, ty, tz)
    world.add(envelope)
    tween(start, 0.95, (k) => {
      const e = easeOutBounce(k)
      envelope.position.y = ty + (1 - e) * 5
      envelope.rotation.set((1 - k) * 1.6, turn + (1 - k) * 2.4, (1 - k) * 0.8)
      envelope.visible = k > 0 || reducedMotion.matches
      if (k >= 1) onLand()
    })
  }

  // ---------- caption under the stage ----------

  function renderCaption(run: Analysis) {
    caption.replaceChildren()
    const latestLine = el('p', 'hut-caption-latest')
    latestLine.append(svg('door'))
    const latest = run.lines[requests.length - 1]
    latestLine.append(el('code', '', latest === undefined ? 'Latest: the board printed nothing' : `Latest: ${latest}`))
    caption.append(latestLine)

    const next = run.steps.find(s => !s.done)
    const status = el('p', 'hut-caption-status')
    if (run.errors.length > 0) {
      status.classList.add('is-error')
      status.append(svg('alert'), el('span', '', `Your code threw: ${run.errors.join(' / ')}`))
    } else if (next) {
      status.classList.add('is-waiting')
      status.append(svg('wait'), el('strong', '', `Waiting for step ${next.n}.`), ` ${next.hint}`)
    } else {
      status.append(svg('check'), 'All steps done: every valid booking has its bunks, and the rest are turned away.')
    }
    caption.append(status)
  }

  // ---------- camera, resize and the render loop ----------

  function fitCamera() {
    // the whole hut, the pile and the tags in the snow must fit, whatever the shape of the stage
    const width = 19
    const height = 11.2
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2)
    const horizontal = Math.atan(Math.tan(halfFov) * camera.aspect)
    distance = Math.max((width / 2) / Math.tan(horizontal), (height / 2) / Math.tan(halfFov))
    camera.position.copy(target).addScaledVector(new THREE.Vector3(0, 0.3, 1).normalize(), distance)
    camera.lookAt(target)
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
    for (const { node, anchor, below } of labels) {
      projected.copy(anchor)
      projected.project(camera)
      const x = (projected.x * 0.5 + 0.5) * width
      const y = (-projected.y * 0.5 + 0.5) * height
      node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, ${below ? '0' : '-100%'})`
    }
  }

  function frame() {
    const time = now()
    const motion = !reducedMotion.matches
    tweens = tweens.filter((t) => {
      const k = Math.min(1, Math.max(0, (time - t.start) / t.duration))
      t.apply(k)
      return k < 1
    })
    if (open) {
      lamp.intensity = motion ? 9 + Math.sin(time * 7) * 0.5 + Math.sin(time * 13) * 0.3 : 9
      puffs.forEach((puff, i) => {
        const k = motion ? (time * 0.22 + i / puffs.length) % 1 : i / puffs.length
        puff.position.set(2.4 + k * 0.9 + Math.sin(k * 5 + i) * 0.15, 7.75 + k * 2.6, -1.2)
        puff.scale.setScalar(0.5 + k * 1.3)
        puff.material.opacity = 0.3 * Math.sin(Math.PI * k)
      })
    }
    if (motion) {
      const positions = flakeGeometry.getAttribute('position')
      for (let i = 0; i < flakeCount; i++) {
        let y = positions.getY(i) - 0.008
        if (y < 0) y = 12
        positions.setY(i, y)
        positions.setX(i, positions.getX(i) + Math.sin(time + i) * 0.002)
      }
      positions.needsUpdate = true
    }
    renderer.render(scene, camera)
    placeLabels()
    requestAnimationFrame(frame)
  }

  let current = first
  new ResizeObserver(resize).observe(stage)

  replay.addEventListener('click', () => {
    current = analyse(api)
    build(current)
    resize()
  })

  // painted names use the page fonts: wait for them before the first build
  const fonts = ['700 48px Montserrat'].map(font => document.fonts.load(font).catch(() => []))
  // never wait more than a second and a half: the hut must always appear
  const fontsOrTimeout = Promise.race([Promise.all(fonts), new Promise(resolve => setTimeout(resolve, 1500))])
  void fontsOrTimeout.then(() => {
    build(current)
    resize()
    requestAnimationFrame(frame)
  })
}
