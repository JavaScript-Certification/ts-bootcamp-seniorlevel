// Exercise 1 scene: a small 3D reef tank where your code feeds the fish. You do not need to modify this file.
// The feeder drops flakes, every fish your feedTank serves swims up to eat, then the keeper on duty
// writes a short note above it. The plaque and the feeder tag show your variance annotations.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { print } from '../print'
import { type Fish, type ReefFish, type Treat, eveningTreat, residents } from '../reef-tank'
import './aquarium.css'

// Steps 1 and 2 also change types, so the scene reads your file to see whether they are done
const sources = import.meta.glob<string>('../../1-*.ts', { query: '?raw', import: 'default', eager: true })

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

type SourceFacts = { known: boolean; tankOut: boolean; feederIn: boolean; noteProperty: boolean; treatsBang: boolean }

function readSource(): SourceFacts {
  if (typeof location === 'undefined') return { known: false, tankOut: true, feederIn: true, noteProperty: true, treatsBang: false }
  const raw = sources[location.pathname.includes('1-end') ? '../../1-end.ts' : '../../1-begin.ts']
  if (raw === undefined) return { known: false, tankOut: true, feederIn: true, noteProperty: true, treatsBang: false }
  const code = withoutComments(raw)
  const keeper = declaration(code, /export interface Keeper\b/)
  return {
    known: true,
    tankOut: /interface\s+Tank\s*<\s*out\s+\w+/.test(code),
    feederIn: /interface\s+Feeder\s*<\s*in\s+\w+/.test(code),
    noteProperty: /\bnote\s*:\s*\(/.test(keeper),
    treatsBang: /[\w)\]]!(?!=)/.test(declaration(code, /export function treats\b/)),
  }
}

// ---------- what the scene receives from your exercise file ----------

type TankLike = { readonly residents: readonly ReefFish[] }
type FeederLike = { readonly food: string; readonly serve: (fish: Fish) => string }
type KeeperLike = { note: (fish: ReefFish) => string }
type PlanLike = { readonly tank: TankLike; readonly treat?: Treat }

/** What src/1-begin.ts (or src/1-end.ts) hands to the scene */
export type AquariumApi = {
  feedTank: (tank: TankLike, feeder: FeederLike) => string[]
  reef: TankLike
  flakes: FeederLike
  onDuty: KeeperLike
  treats: (plan: PlanLike) => string[]
  tonight: PlanLike
  board: () => string[]
}

// ---------- running your functions without letting them break the page ----------

type Kind = 'clownfish' | 'blue tang' | 'yellow tang'

type FishInfo = {
  name: string
  kind: Kind
  fed: boolean
  note: string
  /** the note mentions something this fish does not have */
  wrong: boolean
  treat: string
  problem?: string
}

type StepCheck = { n: number; done: boolean; hint: string }

type Analysis = {
  fish: FishInfo[]
  tankOut: boolean
  feederIn: boolean
  steps: StepCheck[]
  errors: string[]
  thrown: unknown[]
  lines: string[]
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const expectedNote = (fish: ReefFish) =>
  fish.species === 'clownfish' ? `${fish.name} hides in the ${fish.anemone}` : `${fish.name} swims back to the coral`
const expectedTreat = (fish: ReefFish) => `${fish.name} gets ${eveningTreat.food} at ${eveningTreat.time}`
const sameLines = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((line, i) => line === b[i])

function analyse(api: AquariumApi): Analysis {
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
  const attempt = <T>(run: () => T, fallback: T): T => {
    try {
      return run()
    } catch (error) {
      fail(error)
      return fallback
    }
  }
  const asLines = (value: unknown): string[] => (Array.isArray(value) ? value.map(v => String(v)) : [])

  // 1. the feeding log, printed to the console
  const lines = asLines(attempt(() => api.board(), []))

  // 2. the tank, fish by fish
  const fedLines = asLines(attempt(() => api.feedTank(api.reef, api.flakes), []))
  const treatLines = asLines(attempt(() => api.treats(api.tonight), []))
  const fish = residents.map((resident, i): FishInfo => {
    let note = ''
    let problem: string | undefined
    try {
      note = String(api.onDuty.note(resident))
    } catch (error) {
      problem = fail(error)
    }
    return {
      name: resident.name,
      kind: resident.species,
      fed: typeof fedLines[i] === 'string' && fedLines[i] !== '',
      note,
      wrong: note.includes('undefined') || note.includes('null'),
      treat: treatLines[i] ?? '',
      problem,
    }
  })

  // 3. which steps are done (the source tells what the types say)
  const source = readSource()
  const feeds = sameLines(fedLines, residents.map(r => `${r.name} eats flakes`))
  const notes = fish.every((f, i) => {
    const resident = residents[i]
    return resident !== undefined && f.note === expectedNote(resident)
  })
  let noTreat: string[] = ['?']
  try {
    noTreat = asLines(api.treats({ tank: api.reef }))
  } catch {
    // a missing treat must not throw: the step stays open
  }
  const treats = sameLines(treatLines, residents.map(expectedTreat)) && noTreat.length === 0

  const steps: StepCheck[] = [
    {
      n: 1,
      done: feeds && source.tankOut && source.feederIn,
      hint: !feeds
        ? 'feedTank serves nobody yet, so the flakes sink to the sand.'
        : 'The fish eat. Now mark Tank<out T> and Feeder<in T>.',
    },
    {
      n: 2,
      done: notes && source.noteProperty,
      hint: !source.noteProperty
        ? 'The keeper writes "undefined" about the tangs. Turn note into a function property.'
        : 'Follow the compiler: the keeper on duty must know every reef fish.',
    },
    {
      n: 3,
      done: treats && !source.treatsBang,
      hint: source.treatsBang
        ? 'treats uses a non-null assertion. Copy plan.treat into a const instead.'
        : 'No fish has a treat yet. Map over the residents in treats.',
    },
  ]

  return { fish, tankOut: source.tankOut, feederIn: source.feederIn, steps, errors, thrown, lines }
}

// ---------- small DOM helpers ----------

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

const svgPaths = {
  flakes: '<path d="M5 4h14l-2 5H7z" /><path d="M12 9v3" /><circle cx="8" cy="16" r="1.2" /><circle cx="13" cy="19" r="1.2" /><circle cx="16.5" cy="15" r="1.2" />',
  fish: '<path d="M3 12c3-5 9-6 14-2l4-3v10l-4-3c-5 4-11 3-14-2z" /><circle cx="8" cy="11" r="0.6" />',
  clock: '<circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" />',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5" />',
  wait: '<circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" />',
  alert: '<path d="M12 4 2.8 20h18.4z" /><path d="M12 10v4.5" /><path d="M12 17.5v.01" />',
}

function svg(name: keyof typeof svgPaths, className = 'aq-icon'): SVGSVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  node.setAttribute('viewBox', '0 0 24 24')
  node.setAttribute('aria-hidden', 'true')
  node.setAttribute('class', className)
  node.innerHTML = svgPaths[name]
  return node
}

/** `Tank<out ReefFish>`, with the annotation highlighted when it is there */
function typeTag(name: string, keyword: 'in' | 'out', argument: string, annotated: boolean): HTMLElement {
  const tag = el('code', `aq-type ${annotated ? 'is-annotated' : 'is-plain'}`)
  tag.append(`${name}<`)
  if (annotated) tag.append(el('span', 'aq-keyword', keyword), ' ')
  tag.append(`${argument}>`)
  return tag
}

// ---------- colours ----------

const palette = {
  deep: '#04263a',
  water: '#0d4f6e',
  accent: '#5fd4ff',
  sand: '#e8d6aa',
  yellow: '#f1dd35',
  text: '#faf9f8',
  orange: '#ff7a1a',
  blue: '#2f6bff',
  gold: '#ffd23f',
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
  return texture
}

/** the deep blue back wall of the tank, lighter near the surface */
function backdropTexture(): THREE.CanvasTexture {
  return canvasTexture(8, 256, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, '#2aa7cf')
    gradient.addColorStop(0.45, '#126a91')
    gradient.addColorStop(1, '#073b57')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 8, 256)
  })
}

/** a soft beam of light, bright at the top */
function beamTexture(): THREE.CanvasTexture {
  return canvasTexture(64, 256, (ctx) => {
    const vertical = ctx.createLinearGradient(0, 0, 0, 256)
    vertical.addColorStop(0, 'rgba(255,255,255,0.9)')
    vertical.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = vertical
    ctx.fillRect(0, 0, 64, 256)
    ctx.globalCompositeOperation = 'destination-in'
    const horizontal = ctx.createLinearGradient(0, 0, 64, 0)
    horizontal.addColorStop(0, 'rgba(0,0,0,0)')
    horizontal.addColorStop(0.5, 'rgba(0,0,0,1)')
    horizontal.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = horizontal
    ctx.fillRect(0, 0, 64, 256)
  })
}

/** the web of light that waves draw on the sand (tiles seamlessly) */
function causticTexture(): THREE.CanvasTexture {
  const size = 256
  const texture = canvasTexture(size, size, (ctx) => {
    const points = Array.from({ length: 22 }, (_, i) => [((i * 97) % 23) / 23 * size + (i % 3) * 7, ((i * 53) % 19) / 19 * size + (i % 4) * 5] as const)
    const image = ctx.createImageData(size, size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let d1 = Infinity
        let d2 = Infinity
        for (const [px, py] of points) {
          const dx = Math.min(Math.abs(x - px), size - Math.abs(x - px))
          const dy = Math.min(Math.abs(y - py), size - Math.abs(y - py))
          const d = Math.hypot(dx, dy)
          if (d < d1) {
            d2 = d1
            d1 = d
          } else if (d < d2) d2 = d
        }
        const edge = Math.max(0, 1 - (d2 - d1) / 7)
        const value = Math.round(255 * edge ** 2)
        const at = (y * size + x) * 4
        image.data[at] = value
        image.data[at + 1] = value
        image.data[at + 2] = value
        image.data[at + 3] = 255
      }
    }
    ctx.putImageData(image, 0, 0)
  })
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 1.2)
  return texture
}

// ---------- easing ----------

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)
const clamp01 = (k: number) => Math.min(1, Math.max(0, k))

// ---------- the scene ----------

const W = 10 // tank width
const H = 5.2 // tank height
const D = 3.4 // tank depth
const SURFACE = H - 0.45
const SAND = 0.32
const HOMES: readonly [number, number][] = [[-3.7, 2.15], [-1.25, 2.75], [1.25, 2.35], [3.7, 2.0]]
const FEEDER = new THREE.Vector3(0.4, H + 0.25, -0.6)

type Label = { node: HTMLElement; anchor: THREE.Vector3 }

type Swimmer = {
  group: THREE.Group
  tail: THREE.Object3D
  home: THREE.Vector3
  phase: number
  facing: number
  last: THREE.Vector3
  /** when it swims up to eat, in seconds after the feed starts, or undefined when it is not served */
  eatAt?: number
  flakes: THREE.Mesh[]
}

type Flake = { mesh: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3; launch: number; eatenAt?: number; owner: number }

/** Shows the reef tank: every fish your feedTank serves comes up to eat, with a dot (and the latest note) above it */
export function mountScene(api: AquariumApi): void {
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
  const root = el('div', 'aq-root')
  host.replaceChildren(root)

  const stage = el('div', 'aq-stage')
  const labelLayer = el('div', 'aq-labels')
  const toolbar = el('div', 'aq-toolbar')
  const feedButton = el('button', 'aq-feed')
  feedButton.type = 'button'
  feedButton.append(svg('flakes'), 'Feed the tank')
  toolbar.append(feedButton)
  const waiting = el('div', 'aq-waiting')
  waiting.setAttribute('role', 'status')
  stage.append(labelLayer, waiting, toolbar)

  const caption = el('div', 'aq-caption')
  caption.setAttribute('aria-live', 'polite')
  root.append(stage, caption)

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  } catch {
    stage.classList.add('aq-no-webgl')
    waiting.hidden = false
    waiting.replaceChildren(el('strong', '', 'This browser cannot draw the 3D tank.'), el('span', '', 'The feeding log is still printed in the console.'))
    renderCaption(first)
    return
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.className = 'aq-canvas'
  renderer.domElement.setAttribute('role', 'img')
  stage.prepend(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 100)
  const target = new THREE.Vector3(0, 2.25, 0)

  scene.add(new THREE.HemisphereLight('#c9f3ff', '#06324a', 1.5))
  const sun = new THREE.DirectionalLight('#f2fdff', 2.3)
  sun.position.set(-2, 12, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -7
  sun.shadow.camera.right = 7
  sun.shadow.camera.top = 5
  sun.shadow.camera.bottom = -5
  sun.shadow.radius = 5
  sun.shadow.bias = -0.0008
  scene.add(sun, sun.target)
  // a warm fill from the front, so the fish keep their colours under the blue water
  const fill = new THREE.DirectionalLight('#fff3dc', 0.9)
  fill.position.set(1, 3, 10)
  scene.add(fill)
  const glowLight = new THREE.PointLight(palette.accent, 4, 9, 1.4)
  glowLight.position.set(0, SURFACE - 0.4, 1.4)
  scene.add(glowLight)

  const mat = (color: string, options: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...options })

  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
    const m = new THREE.Mesh(geometry, material)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    return m
  }

  // ---------- the tank: stand, back wall, sand, decor, water, glass ----------

  const tank = new THREE.Group()
  scene.add(tank)

  // the stand
  tank.add(mesh(new RoundedBoxGeometry(W + 0.7, 1.5, D + 0.7, 3, 0.12), mat('#0a3149', { roughness: 0.75 }), 0, -0.78, 0))
  tank.add(mesh(new RoundedBoxGeometry(W + 0.9, 0.16, D + 0.9, 2, 0.06), mat('#164a6a', { roughness: 0.5 }), 0, -0.06, 0))

  // back wall
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.08, H - 0.1), new THREE.MeshBasicMaterial({ map: backdropTexture() }))
  back.position.set(0, H / 2, -D / 2 + 0.04)
  tank.add(back)

  // sand, with soft dunes
  const sandGeometry = new THREE.PlaneGeometry(W - 0.1, D - 0.1, 60, 20)
  sandGeometry.rotateX(-Math.PI / 2)
  const sandPositions = sandGeometry.attributes.position
  if (sandPositions) {
    for (let i = 0; i < sandPositions.count; i++) {
      const x = sandPositions.getX(i)
      const z = sandPositions.getZ(i)
      const dune = 0.12 * Math.sin(x * 0.9 + 1.3) + 0.07 * Math.sin(x * 2.1 + z * 1.7) + 0.1 * (-z / D + 0.5)
      sandPositions.setY(i, dune)
    }
    sandGeometry.computeVertexNormals()
  }
  const sand = mesh(sandGeometry, mat(palette.sand, { roughness: 1 }), 0, SAND - 0.12, 0)
  sand.castShadow = false
  tank.add(sand)

  const caustics = causticTexture()
  const causticPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.1, D - 0.1),
    new THREE.MeshBasicMaterial({ map: caustics, color: '#bff4ff', transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }),
  )
  causticPlane.rotation.x = -Math.PI / 2
  causticPlane.position.set(0, SAND + 0.09, 0)
  tank.add(causticPlane)

  // rocks
  const rockMaterial = mat('#6a7896', { roughness: 0.9, flatShading: true })
  for (const [x, z, s] of [[-4.2, -0.9, 0.8], [-2.9, -1.1, 0.55], [2.6, -1.0, 0.7], [4.3, -0.6, 0.5], [0.2, -1.2, 0.45]] as const) {
    const rock = mesh(new THREE.DodecahedronGeometry(s, 0), rockMaterial, x, SAND + s * 0.3, z)
    rock.scale.set(1.3, 0.75, 1)
    rock.rotation.set(0.3 * x, 0.7 * z, 0.2)
    tank.add(rock)
  }

  // branching corals
  const swaying: { object: THREE.Object3D; base: THREE.Euler; phase: number; amount: number }[] = []
  function coral(x: number, z: number, color: string, scale: number) {
    const group = new THREE.Group()
    group.position.set(x, SAND, z)
    const material = mat(color, { roughness: 0.7 })
    const branch = (length: number, tiltX: number, tiltZ: number, y: number) => {
      const pivot = new THREE.Group()
      pivot.position.y = y
      pivot.rotation.set(tiltX, 0, tiltZ)
      const stick = mesh(new THREE.CapsuleGeometry(0.09 * scale, length * scale, 4, 10), material, 0, (length * scale) / 2, 0)
      pivot.add(stick)
      group.add(pivot)
    }
    branch(0.9, 0, 0, 0)
    branch(0.7, 0.2, 0.55, 0.15)
    branch(0.65, -0.3, -0.6, 0.1)
    branch(0.5, 0.5, 0.2, 0.45 * scale)
    branch(0.45, -0.2, -0.25, 0.55 * scale)
    tank.add(group)
  }
  coral(-0.2, -0.7, '#ff7d6e', 1.05)
  coral(2.2, -0.3, '#c79bff', 0.95)
  coral(4.5, 0.2, '#ffb05c', 0.85)
  coral(-4.6, 0.6, '#ffb05c', 0.7)

  // a round brain coral
  const brain = mesh(new THREE.SphereGeometry(0.55, 28, 18), mat('#f0a46b', { roughness: 0.85 }), 1.0, SAND + 0.12, 0.5)
  brain.scale.set(1.2, 0.7, 1)
  tank.add(brain)

  // the pink anemone where the clownfish live
  const anemone = new THREE.Group()
  anemone.position.set(-2.5, SAND, 0.1)
  anemone.add(mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.35, 24), mat('#c25d8e', { roughness: 0.8 }), 0, 0.15, 0))
  const tentacleGeometry = new THREE.CapsuleGeometry(0.06, 0.55, 4, 8)
  const tentacleMaterial = mat('#ff9fd0', { roughness: 0.5, emissive: '#ff5fae', emissiveIntensity: 0.15 })
  for (let i = 0; i < 46; i++) {
    const angle = i * 2.4
    const radius = 0.12 + 0.36 * ((i * 37) % 46) / 46
    const pivot = new THREE.Group()
    pivot.position.set(Math.cos(angle) * radius, 0.3, Math.sin(angle) * radius)
    const base = new THREE.Euler(Math.sin(angle) * radius * 1.4, 0, -Math.cos(angle) * radius * 1.4)
    pivot.rotation.copy(base)
    const tentacle = mesh(tentacleGeometry, tentacleMaterial, 0, 0.32, 0)
    tentacle.castShadow = false
    pivot.add(tentacle)
    anemone.add(pivot)
    swaying.push({ object: pivot, base, phase: i * 0.37, amount: 0.12 })
  }
  tank.add(anemone)

  // seaweed, in short segments that sway
  function seaweed(x: number, z: number, segments: number, phase: number) {
    let parent: THREE.Object3D = tank
    let y = SAND
    const material = mat('#3fbf8f', { roughness: 0.6 })
    for (let i = 0; i < segments; i++) {
      const pivot = new THREE.Group()
      pivot.position.set(i === 0 ? x : 0, i === 0 ? y : 0.42, i === 0 ? z : 0)
      const base = new THREE.Euler(0, 0, 0)
      pivot.add(mesh(new THREE.CapsuleGeometry(0.07 - i * 0.004, 0.32, 4, 8), material, 0, 0.21, 0))
      parent.add(pivot)
      swaying.push({ object: pivot, base, phase: phase + i * 0.5, amount: 0.09 })
      parent = pivot
      y += 0.42
    }
  }
  seaweed(-4.6, -1.2, 9, 0)
  seaweed(-4.2, -1.3, 7, 1.1)
  seaweed(3.3, -1.3, 8, 2.2)
  seaweed(4.6, -1.0, 6, 0.6)

  // beams of light from the surface
  const beamMap = beamTexture()
  const beams: THREE.MeshBasicMaterial[] = []
  for (const [x, tilt, width] of [[-2.8, 0.18, 1.3], [0.6, 0.12, 1.0], [3.1, 0.2, 1.5]] as const) {
    const material = new THREE.MeshBasicMaterial({ map: beamMap, color: '#d8fbff', transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(width, SURFACE - SAND), material)
    beam.position.set(x, (SURFACE + SAND) / 2, -0.4)
    beam.rotation.z = tilt
    tank.add(beam)
    beams.push(material)
  }

  // bubbles rising from an air stone
  tank.add(mesh(new RoundedBoxGeometry(0.5, 0.16, 0.3, 2, 0.06), mat('#9fb3c6'), 3.0, SAND + 0.05, 0.7))
  const bubbleMaterial = new THREE.MeshStandardMaterial({ color: '#e9fbff', transparent: true, opacity: 0.55, roughness: 0.1, emissive: '#bdf1ff', emissiveIntensity: 0.25 })
  const bubbles = Array.from({ length: 16 }, (_, i) => {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.045 + (i % 4) * 0.018, 12, 8), bubbleMaterial)
    tank.add(bubble)
    return { mesh: bubble, offset: i / 16, drift: (i % 5) * 0.4 }
  })

  // the automatic feeder, clipped on the back rim
  const feeder = new THREE.Group()
  feeder.position.copy(FEEDER)
  feeder.add(mesh(new RoundedBoxGeometry(0.9, 0.6, 0.7, 3, 0.12), mat('#e8eef4', { roughness: 0.4 }), 0, 0.05, 0))
  feeder.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 24), mat(palette.accent, { emissive: palette.accent, emissiveIntensity: 0.5 }), 0, 0.4, 0))
  const spout = mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.3, 16), mat('#9fb3c6'), 0.2, -0.32, 0.15)
  feeder.add(spout)
  tank.add(feeder)

  // water: a light volume and a moving surface
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.06, SURFACE, D - 0.06),
    new THREE.MeshStandardMaterial({ color: '#43c4ec', transparent: true, opacity: 0.1, roughness: 0.1, depthWrite: false }),
  )
  water.position.set(0, SURFACE / 2, 0)
  water.renderOrder = 2
  tank.add(water)
  const surfaceGeometry = new THREE.PlaneGeometry(W - 0.06, D - 0.06, 40, 14)
  surfaceGeometry.rotateX(-Math.PI / 2)
  const surface = new THREE.Mesh(
    surfaceGeometry,
    new THREE.MeshStandardMaterial({ color: '#7fe3ff', transparent: true, opacity: 0.35, roughness: 0.15, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
  )
  surface.position.y = SURFACE
  surface.renderOrder = 3
  tank.add(surface)

  // glass and frame
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, D),
    new THREE.MeshStandardMaterial({ color: '#d6f6ff', transparent: true, opacity: 0.07, roughness: 0.05, metalness: 0.2, depthWrite: false }),
  )
  glass.position.y = H / 2
  glass.renderOrder = 4
  tank.add(glass)
  const frameMaterial = mat('#0c2a3d', { roughness: 0.4, metalness: 0.3 })
  for (const y of [0.04, H - 0.04]) {
    for (const z of [-D / 2, D / 2]) tank.add(mesh(new THREE.BoxGeometry(W + 0.08, 0.1, 0.08), frameMaterial, 0, y, z))
    for (const x of [-W / 2, W / 2]) tank.add(mesh(new THREE.BoxGeometry(0.08, 0.1, D + 0.08), frameMaterial, x, y, 0))
  }
  for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) tank.add(mesh(new THREE.BoxGeometry(0.07, H, 0.07), frameMaterial, x, H / 2, z))
  // two faint reflections on the front pane
  for (const [x, width] of [[-3.4, 0.35], [-2.8, 0.12]] as const) {
    const streak = new THREE.Mesh(
      new THREE.PlaneGeometry(width, H * 0.9),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.05, depthWrite: false }),
    )
    streak.position.set(x, H / 2, D / 2 + 0.01)
    streak.rotation.z = 0.35
    streak.renderOrder = 5
    tank.add(streak)
  }

  // ---------- the fish ----------

  type Look = { body: (x: number, y: number) => string; tail: string; fin: string; fins: number; scale: [number, number, number] }

  const looks: Record<Kind, Look> = {
    clownfish: {
      // orange, with three white bands edged in black
      body: (x) => {
        for (const centre of [0.22, -0.02, -0.3]) {
          const d = Math.abs(x - centre)
          if (d < 0.055) return '#fbfaf5'
          if (d < 0.08) return '#16120f'
        }
        return palette.orange
      },
      tail: palette.orange,
      fin: '#ff8c33',
      fins: 1,
      scale: [1, 0.62, 0.4],
    },
    'blue tang': {
      // royal blue, with the dark palette mark along the back
      body: (x, y) => (y > 0.04 - 0.25 * (x + 0.1) ** 2 && x < 0.32 && x > -0.42 && y < 0.24 ? '#0d1838' : palette.blue),
      tail: palette.gold,
      fin: '#1f3fae',
      fins: 1.4,
      scale: [1, 0.78, 0.32],
    },
    'yellow tang': {
      body: (x) => (x < -0.4 ? '#fff4c4' : palette.gold),
      tail: palette.gold,
      fin: '#ffc21f',
      fins: 1.9,
      scale: [0.9, 0.95, 0.3],
    },
  }

  function finShape(points: [number, number][]): THREE.ShapeGeometry {
    const shape = new THREE.Shape()
    const [start, ...rest] = points
    if (start) shape.moveTo(start[0], start[1])
    for (const [x, y] of rest) shape.lineTo(x, y)
    shape.closePath()
    return new THREE.ShapeGeometry(shape)
  }

  function makeFish(kind: Kind): { group: THREE.Group; tail: THREE.Object3D } {
    const look = looks[kind]
    const group = new THREE.Group()
    const geometry = new THREE.SphereGeometry(0.5, 48, 32)
    const positions = geometry.attributes.position
    const colors: number[] = []
    const color = new THREE.Color()
    if (positions) {
      for (let i = 0; i < positions.count; i++) {
        color.set(look.body(positions.getX(i), positions.getY(i)))
        colors.push(color.r, color.g, color.b)
      }
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    const body = mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.05 }))
    body.scale.set(...look.scale)
    group.add(body)

    const finMaterial = new THREE.MeshStandardMaterial({ color: look.fin, roughness: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
    const tailMaterial = new THREE.MeshStandardMaterial({ color: look.tail, roughness: 0.5, side: THREE.DoubleSide })
    const tailPivot = new THREE.Group()
    tailPivot.position.set(-0.46 * look.scale[0], 0, 0)
    const tail = mesh(finShape([[0, 0], [-0.32, 0.24], [-0.26, 0], [-0.32, -0.24]]), tailMaterial)
    tailPivot.add(tail)
    group.add(tailPivot)
    const fin = look.fins
    const dorsal = mesh(finShape([[0.2, 0], [-0.05, 0.2 * fin], [-0.32, 0.06 * fin], [-0.3, 0]]), finMaterial, 0, look.scale[1] * 0.4, 0)
    group.add(dorsal)
    const belly = mesh(finShape([[0.08, 0], [-0.12, -0.16 * fin], [-0.3, -0.03]]), finMaterial, 0, -look.scale[1] * 0.4, 0)
    group.add(belly)
    // a little snout for the tangs
    if (kind !== 'clownfish') group.add(mesh(new THREE.ConeGeometry(0.09, 0.2, 14).rotateZ(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: kind === 'blue tang' ? palette.blue : palette.gold, roughness: 0.4 }), 0.47 * look.scale[0], -0.08, 0))

    const eyeWhite = mat('#ffffff', { roughness: 0.3 })
    const eyeBlack = mat('#0b0b10', { roughness: 0.2 })
    for (const side of [1, -1]) {
      const eye = mesh(new THREE.SphereGeometry(0.06, 16, 12), eyeWhite, 0.32 * look.scale[0], 0.06, side * look.scale[2] * 0.36)
      eye.add(mesh(new THREE.SphereGeometry(0.038, 12, 10), eyeBlack, 0.012, 0, side * 0.03))
      group.add(eye)
    }
    group.scale.setScalar(kind === 'clownfish' ? 1 : 1.12)
    return { group, tail: tailPivot }
  }

  const swimmers: Swimmer[] = residents.map((resident, i) => {
    const [hx, hy] = HOMES[i] ?? [0, 2]
    const { group, tail } = makeFish(resident.species)
    const home = new THREE.Vector3(hx, hy, 0.25 + (i % 2) * 0.25)
    group.position.copy(home)
    tank.add(group)
    return { group, tail, home, phase: i * 1.7, facing: i % 2 ? Math.PI : 0, last: home.clone(), flakes: [] }
  })

  // ---------- one feeding run ----------

  const flakeGroup = new THREE.Group()
  tank.add(flakeGroup)
  const flakeGeometry = new THREE.BoxGeometry(0.09, 0.015, 0.07)
  const flakeMaterials = ['#ff9a3d', '#ffcf5a', '#e8613c'].map(color => mat(color, { roughness: 0.8 }))

  let labels: Label[] = []
  let fishLabels: { node: HTMLElement; shownAt: number }[] = []
  let focus = -1
  let flakes: Flake[] = []
  let clockStart = performance.now()
  let current = first
  let feeding = false
  const now = () => (performance.now() - clockStart) / 1000

  function addLabel(anchor: THREE.Vector3, node: HTMLElement): void {
    node.classList.add('aq-label')
    labelLayer.append(node)
    labels.push({ node, anchor })
  }

  function later(seconds: number, run: () => void) {
    if (reducedMotion.matches || seconds <= 0) run()
    else window.setTimeout(run, seconds * 1000)
  }

  /** the one fish label that shows its note: the last fish that has eaten so far */
  function updateFocus() {
    const feedTime = reducedMotion.matches ? Infinity : now()
    let next = -1
    fishLabels.forEach((label, i) => {
      if (label.shownAt <= feedTime) next = i
    })
    if (next === focus) return
    focus = next
    fishLabels.forEach((label, i) => label.node.classList.toggle('is-focus', i === focus))
  }

  function showAt(node: HTMLElement, seconds: number) {
    if (reducedMotion.matches || seconds <= 0) return
    node.hidden = true
    window.setTimeout(() => {
      node.hidden = false
    }, seconds * 1000)
  }

  function build(run: Analysis) {
    labelLayer.replaceChildren()
    labels = []
    for (const flake of flakes) flakeGroup.remove(flake.mesh)
    flakes = []
    clockStart = performance.now()
    feeding = true

    // the variance of the tank and of the feeder, as your file declares them, on one quiet plaque
    const plaque = el('div', 'aq-plaque')
    plaque.append(typeTag('Feeder', 'in', 'Fish', run.feederIn), el('span', 'aq-plaque-sep'), typeTag('Tank', 'out', 'ReefFish', run.tankOut))
    addLabel(new THREE.Vector3(0, -0.55, D / 2 + 0.36), plaque)

    // three flakes per fish, fanned out from the feeder over the surface
    const lastEat = run.fish.reduce((latest, fish, i) => (fish.fed ? Math.max(latest, 1.0 + i * 0.45) : latest), 0)
    swimmers.forEach((swimmer, i) => {
      const info = run.fish[i]
      swimmer.flakes = []
      swimmer.eatAt = info?.fed ? 1.0 + i * 0.45 : undefined
      for (let k = 0; k < 3; k++) {
        const flake = new THREE.Mesh(flakeGeometry, flakeMaterials[(i + k) % 3])
        flake.castShadow = true
        const to = new THREE.Vector3(swimmer.home.x + (k - 1) * 0.28, SURFACE - 0.02, swimmer.home.z + ((k * 7) % 3 - 1) * 0.18)
        flake.position.copy(FEEDER)
        flakeGroup.add(flake)
        swimmer.flakes.push(flake)
        flakes.push({ mesh: flake, from: FEEDER.clone().add(new THREE.Vector3(0.2, -0.4, 0.15)), to, launch: 0.05 * (i * 3 + k), owner: i })
      }
    })

    // a small dot over every fish that ate; the keeper's note shows on one line over the fish eating
    // right now, then stays on the last one. Tonight's treat turns each dot into a tiny clock.
    fishLabels = []
    focus = -1
    run.fish.forEach((info, i) => {
      const swimmer = swimmers[i]
      if (!swimmer || !info.fed) return
      const label = el('div', `aq-fish-label aq-kind-${info.kind.replace(' ', '-')}`)
      if (info.problem) label.classList.add('aq-has-problem')
      else if (info.wrong) label.classList.add('aq-is-wrong')
      const note = info.problem ? `threw: ${info.problem}` : info.note || '(empty note)'
      label.title = info.treat ? `${note} · ${info.treat}` : note
      const marker = el('span', 'aq-marker')
      marker.append(el('span', 'aq-dot'))
      label.append(marker, el('code', 'aq-note', note))
      if (info.treat) {
        const treat = svg('clock', 'aq-icon aq-treat')
        treat.setAttribute('aria-label', info.treat)
        marker.append(treat)
        later(lastEat + 2.4 + i * 0.2, () => label.classList.add('has-treat'))
      }
      const shownAt = (swimmer.eatAt ?? 0) + 1.15
      addLabel(swimmer.home.clone().add(new THREE.Vector3(0, 0.62, 0)), label)
      showAt(label, shownAt)
      fishLabels.push({ node: label, shownAt })
    })

    const fedCount = run.fish.filter(f => f.fed).length
    renderer.domElement.setAttribute('aria-label', `Reef tank with ${run.fish.length} fish. ${fedCount} of them ate the flakes.`)

    // nobody eats yet: the card waits for step 1
    const step1 = run.steps.find(s => s.n === 1)
    waiting.hidden = fedCount > 0
    if (fedCount === 0) waiting.replaceChildren(svg('wait', 'aq-icon aq-waiting-icon'), el('strong', '', 'Waiting for step 1'), el('span', '', step1?.hint ?? ''))

    renderCaption(run)
  }

  // ---------- caption under the stage ----------

  function renderCaption(run: Analysis) {
    caption.replaceChildren()
    const latestLine = el('p', 'aq-caption-latest')
    latestLine.append(svg('fish'))
    const latest = run.lines.at(-1)
    latestLine.append(el('code', '', latest === undefined ? 'Latest: nothing in the feeding log yet' : `Latest: ${latest}`))
    caption.append(latestLine)

    const next = run.steps.find(s => !s.done)
    const status = el('p', 'aq-caption-status')
    if (run.errors.length > 0) {
      status.classList.add('is-error')
      status.append(svg('alert'), el('span', '', `Your code threw: ${run.errors.join(' / ')}`))
    } else if (next) {
      status.classList.add('is-waiting')
      status.append(svg('wait'), el('strong', '', `Waiting for step ${next.n}.`), ` ${next.hint}`)
    } else {
      status.append(svg('check'), 'All steps done: in/out variance, strict function property, narrowing via a const.')
    }
    caption.append(status)
  }

  // ---------- animation ----------

  const idle = (swimmer: Swimmer, time: number, motion: boolean, out: THREE.Vector3) => {
    const t = motion ? time * 0.45 + swimmer.phase : swimmer.phase
    out.copy(swimmer.home)
    out.x += 0.42 * Math.sin(t)
    out.y += 0.12 * Math.sin(t * 1.7)
    out.z += 0.18 * Math.cos(t * 0.8)
    return out
  }

  const idlePoint = new THREE.Vector3()
  const goal = new THREE.Vector3()

  function animateFish(time: number, motion: boolean) {
    const feedTime = now()
    swimmers.forEach((swimmer, i) => {
      idle(swimmer, time, motion, idlePoint)
      let pull = 0
      const firstFlake = swimmer.flakes[1] ?? swimmer.flakes[0]
      if (feeding && swimmer.eatAt !== undefined && firstFlake) {
        if (!motion) pull = 0
        else {
          const rise = clamp01((feedTime - swimmer.eatAt) / 1.1)
          const back = clamp01((feedTime - swimmer.eatAt - 1.45) / 1.3)
          pull = easeInOut(rise) * (1 - easeInOut(back))
        }
        goal.copy(firstFlake.position).add(new THREE.Vector3(-0.35 * Math.cos(swimmer.facing), -0.08, 0))
        // the flakes vanish once the fish reaches them
        if (!motion || feedTime > swimmer.eatAt + 1.1) for (const flake of swimmer.flakes) flake.visible = false
      }
      const position = swimmer.group.position
      position.lerpVectors(idlePoint, goal, pull)
      const dx = position.x - swimmer.last.x
      if (Math.abs(dx) > 0.0015) swimmer.facing = dx > 0 ? 0 : Math.PI
      swimmer.group.rotation.y += (swimmer.facing - swimmer.group.rotation.y) * (motion ? 0.08 : 1)
      swimmer.group.rotation.z = motion ? THREE.MathUtils.clamp((position.y - swimmer.last.y) * 6, -0.35, 0.35) * Math.cos(swimmer.group.rotation.y) : 0
      swimmer.tail.rotation.y = motion ? Math.sin(time * (7 + pull * 6) + i) * 0.45 : 0
      swimmer.last.copy(position)
    })
  }

  function animateFlakes(motion: boolean) {
    const feedTime = now()
    for (const flake of flakes) {
      const swimmer = swimmers[flake.owner]
      if (!swimmer) continue
      const fly = motion ? clamp01((feedTime - flake.launch) / 0.7) : 1
      const sink = motion ? Math.max(0, feedTime - flake.launch - 0.7) : 0
      const p = flake.mesh.position
      p.lerpVectors(flake.from, flake.to, fly)
      p.y += Math.sin(fly * Math.PI) * 0.5
      if (fly >= 1) {
        // nobody eats: the flakes sink slowly to the sand and stay there
        const eaten = swimmer.eatAt !== undefined
        p.y = Math.max(SAND + 0.12, flake.to.y - sink * (eaten ? 0.12 : 0.45))
        p.x = flake.to.x + Math.sin(sink * 1.3 + flake.launch * 9) * 0.08
      }
      flake.mesh.rotation.set(feedTime * 1.3 + flake.launch * 5, feedTime + flake.launch, 0.4)
      if (!motion && swimmer.eatAt === undefined) p.y = SAND + 0.12
    }
  }

  const surfacePositions = surfaceGeometry.attributes.position
  const surfaceRest = surfacePositions ? Float32Array.from(surfacePositions.array) : new Float32Array()

  function animateWater(time: number, motion: boolean) {
    if (surfacePositions && motion) {
      for (let i = 0; i < surfacePositions.count; i++) {
        const x = surfaceRest[i * 3] ?? 0
        const z = surfaceRest[i * 3 + 2] ?? 0
        surfacePositions.setY(i, 0.04 * Math.sin(x * 1.6 + time * 1.4) + 0.03 * Math.sin(z * 2.3 - time * 1.1))
      }
      surfacePositions.needsUpdate = true
    }
    caustics.offset.set(motion ? time * 0.012 : 0, motion ? Math.sin(time * 0.2) * 0.04 : 0)
    beams.forEach((beam, i) => {
      beam.opacity = motion ? 0.08 + 0.04 * Math.sin(time * 0.5 + i * 2) : 0.1
    })
    for (const { mesh: bubble, offset, drift } of bubbles) {
      const k = motion ? (time * 0.18 + offset) % 1 : offset
      bubble.position.set(3.0 + Math.sin(k * 12 + drift) * 0.12, SAND + 0.1 + k * (SURFACE - SAND - 0.15), 0.7 + Math.cos(k * 9 + drift) * 0.06)
      bubble.visible = k < 0.98
    }
    for (const { object, base, phase, amount } of swaying) {
      const s = motion ? Math.sin(time * 1.1 + phase) * amount : 0
      object.rotation.set(base.x + s * 0.6, 0, base.z + s)
    }
    feeder.position.y = FEEDER.y + (motion && now() < 0.9 ? Math.sin(now() * 40) * 0.025 : 0)
  }

  // ---------- camera, resize and the render loop ----------

  function placeCamera(width: number) {
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2)
    const horizontal = Math.atan(Math.tan(halfFov) * camera.aspect)
    const fitWidth = (width / 2) / Math.tan(horizontal) * 1.04
    const fitHeight = 4.15 / Math.tan(halfFov)
    const distance = Math.max(fitWidth, fitHeight, 12)
    camera.position.copy(target).addScaledVector(new THREE.Vector3(0, 0.2, 1).normalize(), distance)
    camera.lookAt(target)
  }

  function resize() {
    const width = stage.clientWidth
    const height = stage.clientHeight
    if (width === 0 || height === 0) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    placeCamera(W + 1.8)
  }

  const projected = new THREE.Vector3()
  const toScreenX = (x: number, width: number) => {
    projected.set(x, 2.5, 0.3)
    projected.project(camera)
    return (projected.x * 0.5 + 0.5) * width
  }

  function placeLabels() {
    const width = stage.clientWidth
    const height = stage.clientHeight
    // each label stays as wide as the space between two fish, so neighbours never overlap
    const room = Math.round(Math.min(184, Math.max(96, toScreenX(2.45, width) - toScreenX(0, width) - 12)))
    labelLayer.style.setProperty('--aq-room', `${room}px`)
    for (const { node, anchor } of labels) {
      projected.copy(anchor)
      projected.project(camera)
      const x = (projected.x * 0.5 + 0.5) * width
      const y = (-projected.y * 0.5 + 0.5) * height
      node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`
    }
  }

  const start = performance.now()
  function frame() {
    const time = (performance.now() - start) / 1000
    const motion = !reducedMotion.matches
    animateWater(time, motion)
    animateFlakes(motion)
    animateFish(time, motion)
    renderer.render(scene, camera)
    updateFocus()
    placeLabels()
    requestAnimationFrame(frame)
  }

  new ResizeObserver(resize).observe(stage)

  feedButton.addEventListener('click', () => {
    current = analyse(api)
    build(current)
  })

  build(current)
  resize()
  requestAnimationFrame(frame)
}
