// Exercise 4 scene: one hot air balloon on a launch field at dusk. You do not need to modify this file.
// The balloon flies the plan your code builds, under the ceiling your code computes,
// and the altimeter reads the peak in feet with your altitudeIn.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { print } from '../print'
import './balloon.css'

// Steps 1, 2 and 3 also change types, so the scene reads your file to see whether they are done
const sources = import.meta.glob<string>('../../4-*.ts', { query: '?raw', import: 'default', eager: true })

function sourceCode(): string | undefined {
  if (typeof location === 'undefined') return undefined
  const raw = sources[location.pathname.includes('4-end') ? '../../4-end.ts' : '../../4-begin.ts']
  return raw?.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

// ---------- what the scene receives from your exercise file ----------

type LegShape = { kind: string }

/** The values exported by src/4-begin.ts (or src/4-end.ts) */
export type LaunchApi<M extends number, P extends { readonly legs: readonly LegShape[] }> = {
  metres: (value: number) => M
  altitudeIn: (unit: 'feet', altitude: M) => number
  cloudBase: number
  ceiling: number
  plan: P
  board: (flight: P) => string[]
}

// ---------- running your code without letting it break the page ----------

type FlightLeg =
  | { kind: 'climb'; to: number }
  | { kind: 'drift'; minutes: number }
  | { kind: 'toast' }
  | { kind: 'land' }

type StepCheck = { n: number; done: boolean; hint: string }

type Analysis = {
  lines: string[]
  legs: FlightLeg[]
  ceiling: number
  cloudBaseFt: number
  cloudBaseM: number
  /** the highest climb, with the feet your altitudeIn returned (undefined when it threw) */
  peak?: { metres: number; feet?: number }
  steps: StepCheck[]
  errors: string[]
  thrown: unknown[]
}

const PLAN = ['climb', 'drift', 'toast', 'land']

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

function legOf(raw: unknown): FlightLeg | undefined {
  const kind = field(raw, 'kind')
  const to = field(raw, 'to')
  const minutes = field(raw, 'minutes')
  if (kind === 'climb' && typeof to === 'number') return { kind, to }
  if (kind === 'drift' && typeof minutes === 'number') return { kind, minutes }
  if (kind === 'toast' || kind === 'land') return { kind }
  return undefined
}

function analyse<M extends number, P extends { readonly legs: readonly LegShape[] }>(api: LaunchApi<M, P>): Analysis {
  const errors: string[] = []
  const thrown: unknown[] = []
  const fail = (error: unknown) => {
    const message = messageOf(error)
    if (!errors.includes(message)) {
      errors.push(message)
      thrown.push(error)
    }
  }

  // 1. the launch board, printed in the console
  let lines: string[] = []
  try {
    lines = api.board(api.plan).map(String)
  } catch (error) {
    fail(error)
  }

  // 2. the legs of your plan, in order
  const rawLegs: unknown = field(api.plan, 'legs')
  const legs = Array.isArray(rawLegs) ? rawLegs.map(legOf).filter(leg => leg !== undefined) : []

  // 3. the highest climb, read back in feet by your altitudeIn
  let peak: Analysis['peak']
  for (const leg of legs) {
    if (leg.kind === 'climb' && (!peak || leg.to > peak.metres)) peak = { metres: leg.to }
  }
  if (peak) {
    const top = peak.metres
    try {
      peak.feet = Number(api.altitudeIn('feet', api.metres(top)))
    } catch (error) {
      fail(error)
    }
  }

  const ceiling = Number(api.ceiling)
  const cloudBaseFt = Number(api.cloudBase)
  const cloudBaseM = Math.round(cloudBaseFt * 0.3048)

  // 4. quiet probes and your source tell which steps are done
  const code = sourceCode()
  const known = code !== undefined
  const brandOf = (name: string) => code?.match(new RegExp(`type\\s+${name}\\s*=([^\\n]*)`))?.[1] ?? ''
  const branded = !known || (/&/.test(brandOf('Metres')) && /&/.test(brandOf('Feet')))
  const refuses = quietly(() => {
    api.metres(-1)
    return false
  }, true)
  const ceilingOk = ceiling === cloudBaseM - 150

  const returnsThis = !known || !/\)\s*:\s*FlightPlan\s*\{/.test(code)
  const kinds = legs.map(leg => leg.kind)
  const planOk = kinds.length === PLAN.length && kinds.every((kind, i) => kind === PLAN[i])

  const overloaded = !known || (code.match(/function\s+altitudeIn\b/g) ?? []).length >= 3
  const probeFeet = quietly(() => Number(api.altitudeIn('feet', api.metres(900))), Number.NaN)
  const feetOk = probeFeet === 2953

  const steps: StepCheck[] = [
    {
      n: 1,
      done: branded && refuses && ceilingOk,
      hint: !branded
        ? 'Metres and Feet are still plain numbers. Brand them.'
        : !refuses
          ? 'metres(-1) still returns a value. Check it with isAltitude and throw.'
          : `The ceiling reads ${ceiling} m, above the clouds. Follow the compiler.`,
    },
    {
      n: 2,
      done: returnsThis && planOk,
      hint: legs.length === 0
        ? 'The plan is empty, so the balloon stays on the field. Chain its legs.'
        : !planOk
          ? 'The plan should climb, drift, toast, then land.'
          : 'The methods still return FlightPlan. Make them return this.',
    },
    {
      n: 3,
      done: overloaded && feetOk,
      hint: !feetOk
        ? 'altitudeIn still answers in metres when you ask for feet.'
        : 'altitudeIn still returns Metres | Feet. Add one overload per unit.',
    },
  ]

  return { lines, legs, ceiling, cloudBaseFt, cloudBaseM, peak, steps, errors, thrown }
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
  up: '<path d="M12 19V5" /><path d="m6 11 6-6 6 6" />',
  glass: '<path d="M8 3h8l-.6 6.2a3.4 3.4 0 0 1-6.8 0z" /><path d="M12 12.6V20" /><path d="M8.5 20h7" />',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5" />',
  wait: '<circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" />',
  alert: '<path d="M12 4 2.8 20h18.4z" /><path d="M12 10v4.5" /><path d="M12 17.5v.01" />',
}

function svg(name: keyof typeof svgPaths, className = 'hb-icon'): SVGSVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  node.setAttribute('viewBox', '0 0 24 24')
  node.setAttribute('aria-hidden', 'true')
  node.setAttribute('class', className)
  node.innerHTML = svgPaths[name]
  return node
}

const number = (value: number) => Math.round(value).toLocaleString('en-GB')

// ---------- colours of the dusk ----------

const palette = {
  night: '#0b2238',
  accent: '#ffa45c',
  cream: '#fff1df',
  coral: '#e8664f',
  ember: '#c4503c',
  gold: '#ffd27a',
  red: '#ff6f61',
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

function radialTexture(inner: string, outer: string): THREE.CanvasTexture {
  return canvasTexture(128, 128, (ctx) => {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, inner)
    gradient.addColorStop(0.5, inner.replace(/[\d.]+\)$/, '0.4)'))
    gradient.addColorStop(1, outer)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
  })
}

/** the gores of the envelope: canvas x goes around the balloon, canvas top is the crown */
function envelopeTexture(): THREE.CanvasTexture {
  return canvasTexture(768, 256, (ctx) => {
    const gores = 12
    const width = 768 / gores
    for (let i = 0; i < gores; i++) {
      ctx.fillStyle = i % 2 === 0 ? palette.accent : palette.cream
      ctx.fillRect(i * width, 0, width + 1, 256)
    }
    ctx.fillStyle = palette.accent
    ctx.fillRect(0, 0, 768, 26)
    ctx.fillStyle = palette.coral
    ctx.fillRect(0, 150, 768, 18)
    ctx.fillStyle = palette.ember
    ctx.fillRect(0, 226, 768, 30)
    ctx.fillStyle = 'rgba(60, 20, 10, 0.18)'
    for (let i = 0; i <= gores; i++) ctx.fillRect(i * width - 1, 0, 2, 256)
  })
}

// ---------- easing ----------

const easeInOutSine = (k: number) => -(Math.cos(Math.PI * k) - 1) / 2
const easeOutCubic = (k: number) => 1 - (1 - k) ** 3

// ---------- the world ----------

/** the balloon is drawn a little larger than its model */
const SIZE = 1.15
/** height of the balloon, from the bottom of the basket to the crown */
const HEIGHT = 4.2 * SIZE
/** world units per metre of altitude: tonight's cloud base sits at 9.6 */
const SCALE = (9.6 - HEIGHT) / 1219
const START_X = -4.4
/** a ceiling above the clouds is drawn here, near the top of the stage */
const TOP_Y = 10.15
const MAX_ALTITUDE = (TOP_Y - HEIGHT - 1.2) / SCALE

/** the height of a line drawn where the crown is when the basket is at this altitude */
const lineY = (altitude: number) => HEIGHT + altitude * SCALE

type Segment = {
  kind: FlightLeg['kind']
  line: number
  start: number
  duration: number
  from: THREE.Vector2
  to: THREE.Vector2
}

type Label = { node: HTMLElement; anchor: THREE.Vector3 }

/** Shows the launch field: the balloon flies your plan, under your ceiling */
export function mountScene<M extends number, P extends { readonly legs: readonly LegShape[] }>(api: LaunchApi<M, P>): void {
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
  const root = el('div', 'hb-root')
  host.replaceChildren(root)

  // stage: the 3D launch field with its HTML labels
  const stage = el('div', 'hb-stage')
  const labelLayer = el('div', 'hb-labels')
  const toolbar = el('div', 'hb-toolbar')
  const replay = el('button', 'hb-replay')
  replay.type = 'button'
  replay.append(svg('replay'), 'Replay the flight')
  toolbar.append(replay)
  const waiting = el('div', 'hb-waiting')
  waiting.setAttribute('role', 'status')
  stage.append(labelLayer, waiting, toolbar)

  // one short caption under the stage: the latest line of the board and what to do next
  const caption = el('div', 'hb-caption')
  caption.setAttribute('aria-live', 'polite')
  const latestLine = el('p', 'hb-caption-latest')
  const status = el('p', 'hb-caption-status')
  caption.append(latestLine, status)
  root.append(stage, caption)

  let current = first

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  } catch {
    stage.classList.add('hb-no-webgl')
    waiting.hidden = false
    waiting.replaceChildren(el('strong', '', 'This browser cannot draw the launch field.'), el('span', '', 'The board is still printed in the console.'))
    renderLatest(current.lines.at(-1) ?? '')
    renderStatus()
    return
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.domElement.className = 'hb-canvas'
  renderer.domElement.setAttribute('role', 'img')
  stage.prepend(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 200)
  const target = new THREE.Vector3(0, 5.15, 0)

  // dusk light: a cool sky, a low warm sun from the right
  scene.add(new THREE.HemisphereLight('#a9c1ff', '#2b2018', 1.25))
  const sun = new THREE.DirectionalLight('#ffb27a', 2.6)
  sun.position.set(9, 4, 7)
  scene.add(sun)
  const rim = new THREE.DirectionalLight('#7fa6ff', 0.7)
  rim.position.set(-8, 6, -4)
  scene.add(rim)

  const mat = (color: string, options: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.02, ...options })

  const glow = radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)')
  const soft = radialTexture('rgba(0,0,0,0.85)', 'rgba(0,0,0,0)')

  // ---------- the field, the hills, the stars ----------

  const fieldFade = canvasTexture(256, 256, (ctx) => {
    const gradient = ctx.createRadialGradient(128, 128, 30, 128, 128, 128)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.7, '#9a9a9a')
    gradient.addColorStop(1, '#000000')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)
  })
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(15, 72),
    mat('#2a5a4c', { roughness: 1, alphaMap: fieldFade, transparent: true, depthWrite: false }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.scale.set(1.2, 0.62, 1)
  scene.add(ground)

  const treeGeometry = new THREE.ConeGeometry(0.42, 1.25, 7)
  const trunkGeometry = new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6)
  for (const [x, z, s] of [[-10.5, -5.5, 1], [-9.6, -6.4, 0.8], [-8.7, -5.8, 0.65], [10.8, -6.4, 0.9], [11.8, -5.8, 1.1]] as const) {
    const tree = new THREE.Group()
    const cone = new THREE.Mesh(treeGeometry, mat('#183f36'))
    cone.position.y = 0.92
    const trunk = new THREE.Mesh(trunkGeometry, mat('#3b2a20'))
    trunk.position.y = 0.15
    tree.add(cone, trunk)
    tree.position.set(x, 0, z)
    tree.scale.setScalar(s)
    scene.add(tree)
  }

  const starPositions: number[] = []
  for (let i = 0; i < 26; i++) {
    const a = Math.sin(i * 12.9898) * 43758.5453
    const b = Math.sin(i * 78.233) * 12345.6789
    starPositions.push((a - Math.floor(a)) * 44 - 22, 9 + (b - Math.floor(b)) * 6, -16)
  }
  const starGeometry = new THREE.BufferGeometry()
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3))
  const starMaterial = new THREE.PointsMaterial({ color: '#fff4e2', size: 0.07, transparent: true, opacity: 0.6, depthWrite: false })
  scene.add(new THREE.Points(starGeometry, starMaterial))

  // ---------- the clouds, at the cloud base ----------

  const cloudMaterial = mat('#f6e6d6', { roughness: 1, emissive: '#5a4a5e', emissiveIntensity: 0.35, transparent: true, opacity: 0.94 })
  const puff = new THREE.IcosahedronGeometry(1, 3)
  const clouds = new THREE.Group()
  for (const [cx, cz, s] of [[-3.2, -3, 0.85], [2.6, -6, 0.6], [6.2, -2, 1.05]] as const) {
    const cloud = new THREE.Group()
    for (const [px, py, r] of [[-1.1, 0.25, 0.7], [-0.3, 0.55, 0.95], [0.6, 0.4, 0.8], [1.35, 0.2, 0.55], [0.2, 0.1, 0.75]] as const) {
      const ball = new THREE.Mesh(puff, cloudMaterial)
      ball.position.set(px, py, 0)
      ball.scale.set(r, r * 0.78, r * 0.85)
      cloud.add(ball)
    }
    cloud.position.set(cx, 0, cz)
    cloud.scale.setScalar(s)
    clouds.add(cloud)
  }
  scene.add(clouds)

  // ---------- the ceiling ----------

  const ceilingMaterial = new THREE.LineDashedMaterial({ color: palette.accent, dashSize: 0.35, gapSize: 0.22, transparent: true, opacity: 0.85 })
  const ceilingLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-13, 0, 0), new THREE.Vector3(13, 0, 0)]), ceilingMaterial)
  ceilingLine.computeLineDistances()
  scene.add(ceilingLine)

  // ---------- the launch spot and the landing target ----------

  const spotMaterial = new THREE.MeshBasicMaterial({ color: palette.cream, transparent: true, opacity: 0.3, depthWrite: false })
  const spot = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.86, 48), spotMaterial)
  spot.rotation.x = -Math.PI / 2
  spot.position.set(START_X, 0.02, 0)
  scene.add(spot)

  const targetGroup = new THREE.Group()
  const targetMaterial = new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.35, depthWrite: false })
  const targetGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ color: palette.accent, map: glow, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }))
  targetGlow.rotation.x = -Math.PI / 2
  targetGroup.add(targetGlow)
  for (const [inner, outer] of [[0.86, 0.96], [0.42, 0.5]] as const) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 48), targetMaterial)
    ring.rotation.x = -Math.PI / 2
    targetGroup.add(ring)
  }
  targetGroup.position.y = 0.025
  scene.add(targetGroup)

  // ---------- the balloon ----------

  const balloon = new THREE.Group()
  balloon.scale.setScalar(SIZE)
  scene.add(balloon)

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: soft, transparent: true, opacity: 0.5, depthWrite: false }))
  shadow.rotation.x = -Math.PI / 2
  shadow.scale.set(1, 0.75, 1)
  scene.add(shadow)

  const profile = new THREE.SplineCurve([
    new THREE.Vector2(0.34, 1.25),
    new THREE.Vector2(0.46, 1.5),
    new THREE.Vector2(0.75, 1.9),
    new THREE.Vector2(1.06, 2.35),
    new THREE.Vector2(1.24, 2.85),
    new THREE.Vector2(1.27, 3.3),
    new THREE.Vector2(1.13, 3.7),
    new THREE.Vector2(0.84, 3.98),
    new THREE.Vector2(0.45, 4.15),
    new THREE.Vector2(0.001, 4.2),
  ]).getPoints(56)
  const envelopeMap = envelopeTexture()
  const envelopeMaterial = new THREE.MeshStandardMaterial({
    map: envelopeMap,
    emissiveMap: envelopeMap,
    emissive: '#ffffff',
    emissiveIntensity: 0.08,
    roughness: 0.72,
    side: THREE.DoubleSide,
  })
  const envelope = new THREE.Mesh(new THREE.LatheGeometry(profile, 72), envelopeMaterial)
  balloon.add(envelope)

  const wicker = mat('#a0703f', { roughness: 0.95 })
  const basket = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.48, 0.62, 2, 0.07), wicker)
  basket.position.y = 0.24
  const basketRim = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.08, 0.7, 2, 0.03), mat('#6e4526'))
  basketRim.position.y = 0.5
  balloon.add(basket, basketRim)

  const ropeMaterial = mat('#3a2d24')
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const from = new THREE.Vector3(sx * 0.29, 0.52, sz * 0.29)
    const to = new THREE.Vector3(sx * 0.25, 1.27, sz * 0.25)
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, from.distanceTo(to), 5), ropeMaterial)
    rope.position.copy(from).add(to).multiplyScalar(0.5)
    rope.lookAt(to)
    rope.rotateX(Math.PI / 2)
    balloon.add(rope)
  }

  const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 16), mat('#c9ccd2', { metalness: 0.7, roughness: 0.35 }))
  burner.position.y = 0.95
  balloon.add(burner)
  const flameMaterial = new THREE.MeshBasicMaterial({ color: palette.gold, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 12), flameMaterial)
  flame.position.y = 1.28
  balloon.add(flame)
  const flameGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: palette.accent, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }))
  flameGlow.position.y = 1.3
  flameGlow.scale.setScalar(1.6)
  balloon.add(flameGlow)
  const flameLight = new THREE.PointLight('#ffb35c', 0, 5, 1.6)
  flameLight.position.y = 1.9
  balloon.add(flameLight)

  // ---------- the trail and the sparkles of the toast ----------

  const trailMaterial = new THREE.LineDashedMaterial({ color: '#ffd9b5', dashSize: 0.16, gapSize: 0.14, transparent: true, opacity: 0.6 })
  let trail: THREE.Line = new THREE.Line(new THREE.BufferGeometry(), trailMaterial)
  scene.add(trail)

  const sparkleCount = 34
  const sparkleDirections: THREE.Vector3[] = []
  for (let i = 0; i < sparkleCount; i++) {
    const angle = (i / sparkleCount) * Math.PI * 2
    sparkleDirections.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle * 3) * 0.35 + 0.6, Math.sin(angle)).normalize().multiplyScalar(0.9 + (i % 3) * 0.35))
  }
  const sparkleGeometry = new THREE.BufferGeometry()
  sparkleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(sparkleCount * 3), 3))
  const sparkleMaterial = new THREE.PointsMaterial({ color: palette.gold, size: 0.26, map: glow, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial)
  scene.add(sparkles)

  // ---------- HTML labels ----------

  let labels: Label[] = []
  function addLabel(anchor: THREE.Vector3, node: HTMLElement): HTMLElement {
    node.classList.add('hb-label')
    labelLayer.append(node)
    labels.push({ node, anchor })
    return node
  }

  // ---------- one flight ----------

  let segments: Segment[] = []
  let trailCounts: number[] = []
  let trailTotal = 0
  let flightEnd = 0
  let toastAt: { start: number; position: THREE.Vector2 } | undefined
  let reveals: { at: number; node: HTMLElement }[] = []
  let shownLine = -1
  let clockStart = performance.now()
  const now = () => (performance.now() - clockStart) / 1000

  const SAMPLES = 32
  function pointAt(segment: Segment, k: number): THREE.Vector2 {
    const { from, to } = segment
    if (segment.kind === 'climb') return new THREE.Vector2(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * easeInOutSine(k))
    if (segment.kind === 'land') return new THREE.Vector2(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * easeInOutSine(k))
    return new THREE.Vector2(from.x + (to.x - from.x) * k, from.y)
  }

  function fly(run: Analysis) {
    labelLayer.replaceChildren()
    labels = []
    reveals = []
    segments = []
    shownLine = -1
    clockStart = performance.now()

    // the ceiling and the clouds: a ceiling above the clouds is a unit mix-up
    const cloudY = lineY(run.cloudBaseM)
    clouds.position.y = cloudY + 0.25
    const overClouds = !(run.ceiling < run.cloudBaseM)
    const ceilingY = overClouds ? TOP_Y : lineY(Math.max(0, run.ceiling))
    ceilingLine.position.y = ceilingY
    ceilingMaterial.color.set(overClouds ? palette.red : palette.accent)
    const ceilingLabel = el('div', `hb-ceiling-label${overClouds ? ' is-wrong' : ''}`)
    ceilingLabel.append(el('span', 'hb-label-key', 'Ceiling'), el('strong', '', Number.isFinite(run.ceiling) ? `${number(run.ceiling)} m` : String(run.ceiling)))
    if (overClouds) ceilingLabel.append(el('span', 'hb-label-note', 'above the clouds'))
    addLabel(new THREE.Vector3(-6.4, ceilingY, 0), ceilingLabel).dataset.besideButton = 'true'
    const cloudLabel = el('div', 'hb-cloud-label')
    cloudLabel.append(el('span', 'hb-label-key', 'Cloud base'), el('strong', '', `${number(run.cloudBaseFt)} ft`))
    addLabel(new THREE.Vector3(11.2, cloudY + 0.35, 0), cloudLabel)

    // the legs of your plan become a path: up, across, down
    let position = new THREE.Vector2(START_X, 0)
    let time = 0.7
    let peakPoint: THREE.Vector2 | undefined
    run.legs.forEach((leg, index) => {
      const from = position.clone()
      let to = from.clone()
      let duration = 1.2
      if (leg.kind === 'climb') {
        to = new THREE.Vector2(from.x + 0.8, Math.min(MAX_ALTITUDE, Math.max(0, leg.to)) * SCALE)
        duration = 2.8
      } else if (leg.kind === 'drift') {
        to = new THREE.Vector2(Math.min(9, from.x + Math.max(0, leg.minutes) * 0.4), from.y)
        duration = Math.min(3.2, Math.max(1.2, leg.minutes * 0.11))
      } else if (leg.kind === 'land') {
        to = new THREE.Vector2(Math.min(9.5, from.x + (from.y > 0 ? 1 : 0)), 0)
        duration = from.y > 0 ? 2.6 : 0.6
      } else {
        duration = 1.6
        toastAt = { start: time, position: from.clone() }
      }
      segments.push({ kind: leg.kind, line: index + 1, start: time, duration, from, to })
      if (leg.kind === 'climb' && run.peak && leg.to === run.peak.metres && !peakPoint) {
        peakPoint = to.clone()
        const peakLabel = el('div', 'hb-peak-label')
        peakLabel.append(el('span', 'hb-label-key', 'Peak'))
        const reading = el('code', 'hb-reading', `${number(leg.to)} m`)
        const feet = run.peak.feet
        const converted = feet !== undefined && Number.isFinite(feet) && Math.round(feet) !== Math.round(leg.to)
        reading.append(el('span', 'hb-reading-sep', ' · '), converted ? `${number(feet)} ft` : '? ft')
        peakLabel.append(reading)
        reveals.push({ at: time + duration, node: addLabel(new THREE.Vector3(to.x, to.y, 0), peakLabel) })
      }
      if (leg.kind === 'toast') {
        const toastLabel = el('div', 'hb-toast-label')
        toastLabel.append(svg('glass', 'hb-icon hb-toast-icon'), el('span', '', 'Toast'))
        reveals.push({ at: time + 0.3, node: addLabel(new THREE.Vector3(from.x, from.y, 0), toastLabel) })
      }
      time += duration
      position = to
    })
    flightEnd = time
    if (!run.legs.some(leg => leg.kind === 'toast')) toastAt = undefined
    for (const reveal of reveals) reveal.node.hidden = !reducedMotion.matches

    // the dashed trail along the whole path, drawn as the balloon goes
    const points: THREE.Vector3[] = []
    trailCounts = []
    for (const segment of segments) {
      trailCounts.push(points.length)
      for (let i = 0; i <= SAMPLES; i++) {
        const p = pointAt(segment, i / SAMPLES)
        points.push(new THREE.Vector3(p.x, p.y + 0.24, 0))
      }
    }
    trailTotal = points.length
    scene.remove(trail)
    trail.geometry.dispose()
    trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), trailMaterial)
    trail.computeLineDistances()
    trail.geometry.setDrawRange(0, reducedMotion.matches ? trailTotal : 0)
    scene.add(trail)

    // the landing target waits where the plan ends
    const end = segments.at(-1)?.to ?? new THREE.Vector2(START_X, 0)
    const landsAtTheEnd = segments.at(-1)?.kind === 'land'
    targetGroup.visible = landsAtTheEnd
    targetGroup.position.x = end.x
    targetMaterial.opacity = 0.35
    targetGlow.material.opacity = 0

    renderer.domElement.setAttribute('aria-label', run.legs.length === 0
      ? 'A hot air balloon waits on the launch field under the clouds'
      : `A hot air balloon flies ${run.legs.length} legs: ${run.legs.map(leg => leg.kind).join(', ')}`)

    // the empty plan waits for its steps
    const next = run.steps.find(s => !s.done)
    waiting.hidden = run.legs.length > 0
    if (run.legs.length === 0) {
      waiting.replaceChildren(svg('wait', 'hb-icon hb-waiting-icon'), el('strong', '', `Waiting for step ${next?.n ?? 2}`), el('span', '', next?.hint ?? ''))
    }

    renderLatest(run.lines[0] ?? '')
    renderStatus()
  }

  // ---------- caption under the stage ----------

  function renderLatest(line: string) {
    latestLine.replaceChildren(svg('up'), el('code', '', `Latest: ${line || '(the board is empty)'}`))
  }

  function renderStatus() {
    status.replaceChildren()
    status.className = 'hb-caption-status'
    const next = current.steps.find(s => !s.done)
    if (current.errors.length > 0) {
      status.classList.add('is-error')
      status.append(svg('alert'), el('span', '', `Your code threw: ${current.errors.join(' / ')}`))
    } else if (next) {
      status.classList.add('is-waiting')
      status.append(svg('wait'), el('strong', '', `Waiting for step ${next.n}.`), ` ${next.hint}`)
    } else {
      status.append(svg('check'), 'All steps done: the balloon flies its plan and lands on the target.')
    }
  }

  // ---------- camera, resize and the render loop ----------

  function fitCamera() {
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2)
    const vertical = 5.65 / Math.tan(halfFov)
    const horizontal = 10.8 / (Math.tan(halfFov) * camera.aspect)
    const distance = Math.max(vertical, horizontal)
    camera.position.copy(target).addScaledVector(new THREE.Vector3(0, 0.16, 1).normalize(), distance)
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
    // the ceiling label never slides under the replay button
    const besideButton = toolbar.offsetLeft + replay.offsetLeft + replay.offsetWidth + 16
    for (const { node, anchor } of labels) {
      projected.copy(anchor).project(camera)
      const left = node.dataset.besideButton ? besideButton : 12
      const x = Math.min(width - 12, Math.max(left, (projected.x * 0.5 + 0.5) * width))
      const y = (-projected.y * 0.5 + 0.5) * height
      node.style.setProperty('--x', `${x.toFixed(1)}px`)
      node.style.setProperty('--y', `${y.toFixed(1)}px`)
    }
  }

  function placeBalloon(p: THREE.Vector2, time: number, airborne: boolean, motion: boolean) {
    const bob = airborne && motion ? Math.sin(time * 1.7) * 0.05 : 0
    balloon.position.set(p.x, p.y + bob, 0)
    balloon.rotation.z = airborne && motion ? Math.sin(time * 1.1) * 0.025 : 0
    shadow.position.set(p.x + p.y * 0.12, 0.03, 0.2)
    const lift = Math.min(1, p.y / 6)
    shadow.scale.set(1 + lift * 0.6, 0.75 + lift * 0.4, 1)
    shadow.material.opacity = 0.5 * (1 - lift * 0.75)
  }

  function frame() {
    const motion = !reducedMotion.matches
    const time = motion ? now() : flightEnd + 10
    const run = current

    // where the balloon is in its plan
    let p = new THREE.Vector2(START_X, 0)
    let burning = 0.18
    let active: Segment | undefined
    for (const segment of segments) {
      if (time < segment.start) break
      active = segment
      const k = Math.min(1, (time - segment.start) / segment.duration)
      p = pointAt(segment, k)
      if (segment.kind === 'climb' && k < 1) burning = 0.65 + 0.35 * Math.abs(Math.sin(time * 9))
      const index = segments.indexOf(segment)
      const drawn = (trailCounts[index] ?? 0) + Math.floor(k * SAMPLES) + 1
      trail.geometry.setDrawRange(0, Math.min(trailTotal, drawn))
    }
    if (segments.length > 0 && time < (segments[0]?.start ?? 0)) burning = 0.18 + 0.5 * (time / (segments[0]?.start ?? 1))
    placeBalloon(p, time, p.y > 0.01, motion)

    // the burner warms the envelope from inside
    const flicker = motion ? 0.85 + 0.15 * Math.sin(time * 23) : 1
    flame.scale.set(1, Math.max(0.2, burning * 1.6) * flicker, 1)
    flame.position.y = 1.1 + 0.18 * Math.max(0.2, burning * 1.6)
    flameMaterial.opacity = 0.5 + 0.45 * burning
    flameGlow.material.opacity = 0.25 + 0.6 * burning
    flameLight.intensity = 6 * burning
    envelopeMaterial.emissiveIntensity = 0.06 + 0.16 * burning

    // the latest line of the board follows the flight
    const line = active ? active.line : 0
    if (line !== shownLine) {
      shownLine = line
      renderLatest(run.lines[line] ?? run.lines.at(-1) ?? '')
    }

    // the toast: a burst of golden sparkles around the basket
    const toast = toastAt
    if (toast) {
      const k = (time - toast.start) / 1.6
      const positions = sparkleGeometry.getAttribute('position')
      if (k >= 0 && k <= 1 && motion) {
        sparkleDirections.forEach((direction, i) => {
          const r = 0.4 + easeOutCubic(k) * 1.5
          positions.setXYZ(i, toast.position.x + direction.x * r, toast.position.y + 0.9 + direction.y * r - k * k * 0.6, direction.z * r)
        })
        positions.needsUpdate = true
        sparkleMaterial.opacity = Math.sin(Math.PI * k)
      } else sparkleMaterial.opacity = 0
    }

    for (const reveal of reveals) if (reveal.node.hidden && time >= reveal.at) reveal.node.hidden = false

    // touchdown: the target lights up
    const last = segments.at(-1)
    if (last?.kind === 'land' && time >= last.start + last.duration) {
      const pulse = motion ? 0.5 + 0.5 * Math.sin((time - flightEnd) * 2) : 1
      targetMaterial.opacity = 0.7 + 0.25 * pulse
      targetGlow.material.opacity = 0.35 + 0.2 * pulse
    }

    starMaterial.opacity = motion ? 0.55 + 0.15 * Math.sin(time * 0.7) : 0.7
    renderer.render(scene, camera)
    placeLabels()
    requestAnimationFrame(frame)
  }

  new ResizeObserver(resize).observe(stage)

  replay.addEventListener('click', () => {
    current = analyse(api)
    fly(current)
  })

  fly(current)
  resize()
  requestAnimationFrame(frame)
}
