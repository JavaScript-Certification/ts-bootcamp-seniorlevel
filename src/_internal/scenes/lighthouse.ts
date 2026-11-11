// Exercise 5 scene: a lighthouse in a night harbour. You do not need to modify this file.
// The lamp asks your shine for each signal of the night and flashes the pattern it gets back.
// Fog rolls in once the fog signal works, and a boat comes home once your type tests are written.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { print } from '../print'
import './lighthouse.css'

// Step 2 merges an interface and step 3 writes type tests: the scene reads your files to see them
const sources = import.meta.glob<string>('../../5-*.ts', { query: '?raw', import: 'default', eager: true })
const typeTests = import.meta.glob<string>('../../../tests/5-*.test-d.ts', { query: '?raw', import: 'default', eager: true })

function side(): 'begin' | 'end' | undefined {
  if (typeof location === 'undefined') return undefined
  return location.pathname.includes('5-end') ? 'end' : 'begin'
}

const withoutComments = (raw: string) => raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

function mergesFog(): boolean {
  const current = side()
  const raw = current ? sources[`../../5-${current}.ts`] : undefined
  if (raw === undefined) return true
  const code = withoutComments(raw)
  const declarations = code.match(/interface\s+Signals\b/g)?.length ?? 0
  return declarations >= 2 && /interface\s+Signals\s*\{[^}]*\bfog\s*:/.test(code)
}

function writesTypeTests(): boolean {
  const current = side()
  const raw = current ? typeTests[`../../../tests/5-${current}.test-d.ts`] : undefined
  if (raw === undefined) return true
  const body = raw.replace(/^\s*\/\/(?!\s*@ts-expect-error).*$/gm, '')
  const checks = body.match(/expectTypeOf\s*[(<]/g)?.length ?? 0
  return checks >= 2 && /^\s*\/\/\s*@ts-expect-error/m.test(body)
}

// ---------- what the scene receives from your exercise file ----------

/** The function exported by src/5-begin.ts (or src/5-end.ts). The scene calls it with every signal of the night. */
export type LighthouseApi = {
  shine: (signal: never) => unknown
}

// ---------- running your function without letting it break the page ----------

const NIGHT = ['harbour', 'ship', 'storm', 'fog'] as const
type NightSignal = (typeof NIGHT)[number]

type Shown = { signal: NightSignal; character: string; pattern: string }
type StepCheck = { n: number; done: boolean; hint: string }

type Analysis = {
  lights: Shown[]
  fog: boolean
  boat: boolean
  steps: StepCheck[]
  errors: string[]
  thrown: unknown[]
  lines: string[]
  /** shine returned nothing useful for the harbour signal */
  dark: boolean
}

function field(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined
  const read: unknown = Reflect.get(value, key)
  return read
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function asLight(value: unknown, signal: NightSignal): Shown | undefined {
  const character = field(value, 'character')
  const pattern = field(value, 'pattern')
  if (field(value, 'signal') !== signal || typeof character !== 'string') return undefined
  if (typeof pattern !== 'string' || !/^[#.]{8}$/.test(pattern)) return undefined
  return { signal, character, pattern }
}

function analyse(api: LighthouseApi): Analysis {
  const errors: string[] = []
  const thrown: unknown[] = []
  const lights: Shown[] = []
  let fogMissing = true
  let firstValue: unknown

  for (const signal of NIGHT) {
    try {
      // the types of shine change with your steps: the scene calls it with a plain string
      const value: unknown = Reflect.apply(api.shine, undefined, [signal])
      if (signal === 'harbour') firstValue = value
      const light = asLight(value, signal)
      if (light) lights.push(light)
      if (signal === 'fog') fogMissing = !light
    } catch (error) {
      // before step 2 the lamp does not know fog: that error is expected
      const expected = signal === 'fog' && /does not know the signal/.test(messageOf(error))
      if (!expected && !errors.includes(messageOf(error))) {
        errors.push(messageOf(error))
        thrown.push(error)
      }
    }
  }

  const known = (['harbour', 'ship', 'storm'] as const).every(signal => lights.some(light => light.signal === signal))
  const merged = mergesFog()
  const fog = !fogMissing
  const tested = writesTypeTests()

  let fogHint = 'Call Beacon.register(\'fog\', \'Iso\'), then merge fog into Signals with a second interface.'
  if (fog && !merged) fogHint = 'The lamp shows fog, but Signals has no fog: merge it in by reopening the interface.'
  if (!fog && merged) fogHint = 'Signals knows fog, but types never reach the lamp: call Beacon.register(\'fog\', \'Iso\').'

  const steps: StepCheck[] = [
    {
      n: 1,
      done: known,
      hint: firstValue === null || firstValue === undefined
        ? 'Declare the Beacon global, then make shine return Beacon.flash(signal).'
        : 'Make shine return the light Beacon.flash gives for harbour, ship and storm.',
    },
    { n: 2, done: fog && merged, hint: fogHint },
    { n: 3, done: tested, hint: 'Bring the boat home: write two expectTypeOf checks and one @ts-expect-error in tests/5-begin.test-d.ts.' },
  ]

  const lines = lights.map(light => `${light.signal} shows ${light.character} ${light.pattern}`)
  return { lights, fog, boat: tested && known, steps, errors, thrown, lines, dark: lights.length === 0 }
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
  beam: '<path d="M9 21h6" /><path d="M10 21l.8-11h2.4l.8 11" /><path d="M9.5 10h5" /><path d="M10.5 6.5h3V10h-3z" /><path d="M16.5 6l4-2" /><path d="M16.5 9l4 1" /><path d="M7.5 6l-4-2" /><path d="M7.5 9l-4 1" />',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5" />',
  wait: '<circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" />',
  alert: '<path d="M12 4 2.8 20h18.4z" /><path d="M12 10v4.5" /><path d="M12 17.5v.01" />',
}

function svg(name: keyof typeof svgPaths, className = 'lh-icon'): SVGSVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  node.setAttribute('viewBox', '0 0 24 24')
  node.setAttribute('aria-hidden', 'true')
  node.setAttribute('class', className)
  node.innerHTML = svgPaths[name]
  return node
}

// ---------- colours of the harbour ----------

const palette = {
  night: '#101c26',
  lamp: '#ffe066',
  tower: '#e6eaee',
  band: '#c0564a',
  roof: '#22303b',
  rock: '#2e3d48',
  water: '#183445',
  text: '#f4f2ec',
  muted: '#9fb2c0',
}

// ---------- textures ----------

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function radialTexture(stops: [number, string][]): THREE.CanvasTexture {
  return canvasTexture(128, (ctx) => {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    for (const [at, color] of stops) gradient.addColorStop(at, color)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
  })
}

// ---------- the beam: a cone of light that fades with distance and at its edges ----------

const BEAM_LENGTH = 8.5

function beamMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(palette.lamp) },
      uOpacity: { value: 0 },
      uLength: { value: BEAM_LENGTH },
    },
    vertexShader: /* glsl */ `
      varying float vDistance;
      varying vec3 vNormal;
      varying vec3 vView;
      uniform float uLength;
      void main() {
        vDistance = length(position) / uLength;
        vec4 world = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-world.xyz);
        gl_Position = projectionMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vDistance;
      varying vec3 vNormal;
      varying vec3 vView;
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        float along = pow(clamp(1.0 - vDistance, 0.0, 1.0), 1.7);
        float edge = pow(abs(dot(vNormal, vView)), 1.4);
        gl_FragColor = vec4(uColor, uOpacity * along * edge);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  })
}

function beamGeometry(direction: 1 | -1): THREE.ConeGeometry {
  const geometry = new THREE.ConeGeometry(1.25, BEAM_LENGTH, 40, 1, true)
  geometry.translate(0, -BEAM_LENGTH / 2, 0) // apex on the lamp
  geometry.rotateZ(direction * Math.PI / 2)
  return geometry
}

// ---------- easing ----------

const easeInOut = (k: number) => k * k * (3 - 2 * k)

// ---------- the scene ----------

const SLOT = 3.2 // seconds per signal: two turns of its pattern
const TICK = 0.2 // seconds per character of a pattern, so a pattern lasts 1.6 seconds
const LAMP_Y = 4.12

/** Shows your signals as the beam of a lighthouse, one after the other through the night */
export function mountScene(api: LighthouseApi): void {
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
  const root = el('div', 'lh-root')
  host.replaceChildren(root)

  const stage = el('div', 'lh-stage')
  const labelLayer = el('div', 'lh-labels')
  const toolbar = el('div', 'lh-toolbar')
  const replay = el('button', 'lh-replay')
  replay.type = 'button'
  replay.append(svg('replay'), 'Play the night')
  toolbar.append(replay)
  const waiting = el('div', 'lh-waiting')
  waiting.setAttribute('role', 'status')
  stage.append(labelLayer, waiting, toolbar)

  const caption = el('div', 'lh-caption')
  caption.setAttribute('aria-live', 'polite')
  root.append(stage, caption)

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  } catch {
    stage.classList.add('lh-no-webgl')
    waiting.hidden = false
    waiting.replaceChildren(el('strong', '', 'This browser cannot draw the 3D harbour.'), el('span', '', 'The signals are still printed in the console.'))
    renderCaption(first)
    return
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.className = 'lh-canvas'
  renderer.domElement.setAttribute('role', 'img')
  stage.prepend(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 120)
  const target = new THREE.Vector3(0.7, 2.7, 0)

  // a cool moon from the left, a dim sky above
  scene.add(new THREE.HemisphereLight('#9fb8d6', '#0d1820', 0.9))
  const moon = new THREE.DirectionalLight('#c9d8ee', 1.1)
  moon.position.set(-8, 10, 6)
  moon.castShadow = true
  moon.shadow.mapSize.set(1024, 1024)
  moon.shadow.camera.left = -6
  moon.shadow.camera.right = 6
  moon.shadow.camera.top = 7
  moon.shadow.camera.bottom = -3
  moon.shadow.radius = 4
  moon.shadow.bias = -0.0008
  scene.add(moon, moon.target)

  const glow = radialTexture([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']])
  const puff = radialTexture([[0, 'rgba(255,255,255,0.9)'], [0.5, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']])
  const waterFade = radialTexture([[0, '#ffffff'], [0.55, '#bbbbbb'], [1, '#000000']])
  waterFade.colorSpace = THREE.NoColorSpace

  const mat = (color: string, options: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...options })

  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
    const m = new THREE.Mesh(geometry, material)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    return m
  }

  // ---------- the harbour: water, islet, lighthouse ----------

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(15, 72),
    mat(palette.water, { roughness: 0.3, metalness: 0.25, transparent: true, alphaMap: waterFade, depthWrite: false }),
  )
  water.rotation.x = -Math.PI / 2
  water.receiveShadow = true
  scene.add(water)

  const islet = new THREE.Group()
  scene.add(islet)
  const rockMaterial = mat(palette.rock, { flatShading: true, roughness: 0.95 })
  const rockDark = mat('#26333d', { flatShading: true, roughness: 0.95 })
  islet.add(mesh(new THREE.CylinderGeometry(1.35, 1.75, 0.5, 9), rockMaterial, 0, 0.12, 0))
  const rocks: [number, number, number, number, number][] = [
    [1.6, 0.05, 0.5, 0.75, 0.5],
    [-1.5, 0.02, 0.7, 0.62, 0.45],
    [0.7, 0.0, 1.55, 0.55, 0.4],
    [-0.9, 0.0, -1.4, 0.7, 0.55],
    [1.25, 0.0, -1.1, 0.5, 0.42],
    [2.25, -0.05, 1.25, 0.32, 0.3],
  ]
  rocks.forEach(([x, y, z, r, squash], i) => {
    const rock = mesh(new THREE.IcosahedronGeometry(r, 0), i % 2 ? rockDark : rockMaterial, x, y + r * squash * 0.5, z)
    rock.scale.y = squash
    rock.rotation.set(i * 0.7, i * 1.3, i * 0.4)
    islet.add(rock)
  })

  const lighthouse = new THREE.Group()
  lighthouse.position.y = 0.37
  scene.add(lighthouse)

  const TOWER_H = 3.35
  const radiusAt = (h: number) => 0.74 - 0.26 * (h / TOWER_H)
  lighthouse.add(mesh(new THREE.CylinderGeometry(radiusAt(TOWER_H), radiusAt(0), TOWER_H, 48), mat(palette.tower, { roughness: 0.6 }), 0, TOWER_H / 2, 0))
  const bandMaterial = mat(palette.band, { roughness: 0.6 })
  for (const [from, to] of [[0.85, 1.35], [2.05, 2.55]] as const) {
    lighthouse.add(mesh(new THREE.CylinderGeometry(radiusAt(to) + 0.006, radiusAt(from) + 0.006, to - from, 48), bandMaterial, 0, (from + to) / 2, 0))
  }
  // door and two small windows, one of them lit by the keeper
  lighthouse.add(mesh(new RoundedBoxGeometry(0.34, 0.56, 0.12, 2, 0.04), mat('#1b2630'), 0, 0.28, radiusAt(0.28) - 0.03))
  lighthouse.add(mesh(new RoundedBoxGeometry(0.16, 0.24, 0.08, 2, 0.03), mat('#1b2630'), 0, 1.7, radiusAt(1.7) - 0.02))
  lighthouse.add(mesh(new RoundedBoxGeometry(0.16, 0.24, 0.08, 2, 0.03), mat('#ffcf7a', { emissive: '#ffb347', emissiveIntensity: 0.9 }), 0, 2.85, radiusAt(2.85) - 0.02))

  // gallery, railing, lantern room and roof
  const top = TOWER_H
  lighthouse.add(mesh(new THREE.CylinderGeometry(0.72, 0.62, 0.12, 40), mat(palette.roof, { roughness: 0.5, metalness: 0.3 }), 0, top + 0.06, 0))
  const railing = mesh(new THREE.TorusGeometry(0.68, 0.018, 6, 64), mat('#c8d0d6', { metalness: 0.4, roughness: 0.4 }), 0, top + 0.36, 0)
  railing.rotation.x = Math.PI / 2
  lighthouse.add(railing)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    lighthouse.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), mat('#c8d0d6'), Math.cos(a) * 0.68, top + 0.22, Math.sin(a) * 0.68))
  }
  const glassMaterial = mat(palette.lamp, { transparent: true, opacity: 0.22, emissive: palette.lamp, emissiveIntensity: 0, roughness: 0.1, metalness: 0 })
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.62, 32, 1, true), glassMaterial)
  glass.position.y = top + 0.43
  lighthouse.add(glass)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    lighthouse.add(mesh(new THREE.BoxGeometry(0.035, 0.62, 0.035), mat(palette.roof), Math.cos(a) * 0.4, top + 0.43, Math.sin(a) * 0.4))
  }
  lighthouse.add(mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.06, 32), mat(palette.roof), 0, top + 0.76, 0))
  lighthouse.add(mesh(new THREE.ConeGeometry(0.5, 0.48, 32), mat(palette.band, { roughness: 0.5 }), 0, top + 1.03, 0))
  lighthouse.add(mesh(new THREE.SphereGeometry(0.06, 16, 12), mat(palette.roof, { metalness: 0.5 }), 0, top + 1.3, 0))

  // the lamp, its halo, its light and its two beams
  const lampMaterial = new THREE.MeshBasicMaterial({ color: '#4a4430' })
  const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), lampMaterial)
  lampBulb.position.y = LAMP_Y - lighthouse.position.y
  lighthouse.add(lampBulb)
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: palette.lamp, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }))
  halo.position.copy(lampBulb.position)
  halo.scale.setScalar(2.2)
  lighthouse.add(halo)
  const lampLight = new THREE.PointLight(palette.lamp, 0, 11, 1.4)
  lampLight.position.copy(lampBulb.position)
  lighthouse.add(lampLight)

  const beams = new THREE.Group()
  beams.position.copy(lampBulb.position)
  lighthouse.add(beams)
  const beamMaterials = [beamMaterial(), beamMaterial()]
  beams.add(new THREE.Mesh(beamGeometry(1), beamMaterials[0]), new THREE.Mesh(beamGeometry(-1), beamMaterials[1]))

  // fog banks for the fog signal
  const fogBank = new THREE.Group()
  scene.add(fogBank)
  const fogPuffs: { sprite: THREE.Sprite; x: number; speed: number }[] = []
  const fogSpots: [number, number, number, number][] = [
    [-5.5, 0.7, 1.5, 6], [-2.5, 1.2, -1.5, 7.5], [1.5, 0.6, 2.5, 6.5], [4.5, 1.1, -0.5, 7],
    [7.5, 0.8, 1.2, 6], [-8, 1.0, -2.5, 7], [3, 1.9, -3.5, 8], [-4, 2.1, -4.5, 8],
  ]
  fogSpots.forEach(([x, y, z, size], i) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, color: '#c9d5df', transparent: true, opacity: 0, depthWrite: false }))
    sprite.position.set(x, y, z)
    sprite.scale.set(size, size * 0.45, 1)
    fogBank.add(sprite)
    fogPuffs.push({ sprite, x, speed: 0.12 + (i % 3) * 0.05 })
  })

  // the boat that comes home once your type tests are written
  const boat = new THREE.Group()
  boat.visible = false
  scene.add(boat)
  const hullShape = new THREE.Shape()
  hullShape.moveTo(-0.62, 0.22)
  hullShape.lineTo(0.72, 0.22)
  hullShape.quadraticCurveTo(0.56, -0.02, 0.36, -0.1)
  hullShape.lineTo(-0.5, -0.1)
  hullShape.quadraticCurveTo(-0.62, 0.02, -0.62, 0.22)
  const hullGeometry = new THREE.ExtrudeGeometry(hullShape, { depth: 0.42, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 })
  hullGeometry.translate(0, 0, -0.21)
  boat.add(mesh(hullGeometry, mat('#2f6f8f', { roughness: 0.5 }), 0, 0.08, 0))
  boat.add(mesh(new RoundedBoxGeometry(0.42, 0.24, 0.32, 2, 0.04), mat('#eef0ea'), -0.18, 0.42, 0))
  boat.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.2, 6), mat('#d8d2c4'), 0.12, 0.9, 0))
  const sailShape = new THREE.Shape()
  sailShape.moveTo(0, 0)
  sailShape.lineTo(0.5, 0)
  sailShape.lineTo(0, 0.95)
  sailShape.closePath()
  const sail = mesh(new THREE.ShapeGeometry(sailShape), mat('#f1ece0', { side: THREE.DoubleSide, roughness: 0.9 }), 0.15, 0.4, 0)
  boat.add(sail)
  const boatLamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: palette.lamp, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }))
  boatLamp.position.set(0.12, 1.52, 0)
  boatLamp.scale.setScalar(0.42)
  boat.add(boatLamp)
  const BOAT_FROM = new THREE.Vector3(10, 0, 3.4)
  const BOAT_TO = new THREE.Vector3(3.1, 0, 0.7)

  // ---------- the label above the lantern: the signal and its pattern ----------

  const signalLabel = el('div', 'lh-label lh-signal')
  const signalName = el('strong', 'lh-signal-name')
  const signalCharacter = el('code', 'lh-signal-character')
  const dots = el('span', 'lh-dots')
  dots.setAttribute('aria-hidden', 'true')
  const dotNodes = Array.from({ length: 8 }, () => el('span', 'lh-dot'))
  dots.append(...dotNodes)
  signalLabel.append(signalName, signalCharacter, dots)
  labelLayer.append(signalLabel)
  const labelAnchor = new THREE.Vector3(0, LAMP_Y + 1.25, 0)

  // ---------- one run of the night ----------

  let current = first
  let clockStart = performance.now()
  let shownIndex = -1
  let shownTick = -1
  let brightness = 0
  let fogLevel = 0
  let lastFrame = performance.now()

  function play(run: Analysis) {
    current = run
    clockStart = performance.now()
    shownIndex = -1
    shownTick = -1
    fogLevel = 0
    boat.visible = run.boat
    boat.position.copy(reducedMotion.matches ? BOAT_TO : BOAT_FROM)
    signalLabel.hidden = run.dark
    renderer.domElement.setAttribute('aria-label', run.dark
      ? 'A dark lighthouse on a rock in a night harbour'
      : `A lighthouse in a night harbour, flashing ${run.lights.map(l => l.signal).join(', then ')}${run.boat ? ', with a boat coming home' : ''}`)

    const step1 = run.steps.find(s => s.n === 1)
    waiting.hidden = !run.dark
    if (run.dark) waiting.replaceChildren(svg('wait', 'lh-icon lh-waiting-icon'), el('strong', '', 'Waiting for step 1'), el('span', '', step1?.hint ?? ''))
    renderCaption(run)
  }

  function showSignal(light: Shown) {
    signalName.textContent = light.signal
    signalCharacter.textContent = light.character
    signalLabel.dataset.signal = light.signal
    dotNodes.forEach((dot, i) => dot.classList.toggle('is-light', light.pattern[i] === '#'))
  }

  // ---------- caption under the stage ----------

  function renderCaption(run: Analysis) {
    caption.replaceChildren()
    const latestLine = el('p', 'lh-caption-latest')
    latestLine.append(svg('beam'))
    const last = run.lights.at(-1)
    latestLine.append(el('code', '', last ? `Latest: ${last.signal} shows ${last.character} ${last.pattern}` : 'Latest: the lamp is dark'))
    caption.append(latestLine)

    const next = run.steps.find(s => !s.done)
    const status = el('p', 'lh-caption-status')
    if (run.errors.length > 0) {
      status.classList.add('is-error')
      status.append(svg('alert'), el('span', '', `Your code threw: ${run.errors.join(' / ')}`))
    } else if (next) {
      status.classList.add('is-waiting')
      status.append(svg('wait'), el('strong', '', `Waiting for step ${next.n}.`), ` ${next.hint}`)
    } else {
      status.append(svg('check'), 'All steps done: every signal is typed, merged and tested.')
    }
    caption.append(status)
  }

  // ---------- camera, resize and the render loop ----------

  function fitCamera() {
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2)
    const horizontal = Math.atan(Math.tan(halfFov) * camera.aspect)
    const forHeight = (7.4 / 2) / Math.tan(halfFov)
    const forWidth = (9.5 / 2) / Math.tan(horizontal)
    const distance = Math.max(forHeight, forWidth) * 1.05
    camera.position.copy(target).addScaledVector(new THREE.Vector3(0.18, 0.2, 1).normalize(), distance)
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
  function placeLabel() {
    projected.copy(labelAnchor).project(camera)
    const x = (projected.x * 0.5 + 0.5) * stage.clientWidth
    const y = (-projected.y * 0.5 + 0.5) * stage.clientHeight
    signalLabel.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`
  }

  function frame() {
    const nowMs = performance.now()
    const dt = Math.min(0.1, (nowMs - lastFrame) / 1000)
    lastFrame = nowMs
    const time = (nowMs - clockStart) / 1000
    const motion = !reducedMotion.matches
    const lights = current.lights

    let on = false
    let light: Shown | undefined
    if (lights.length > 0) {
      const index = motion ? Math.min(lights.length - 1, Math.floor(time / SLOT)) : lights.length - 1
      light = lights[index]
      if (light && index !== shownIndex) {
        shownIndex = index
        showSignal(light)
      }
      const tick = Math.floor(time / TICK) % 8
      if (light && motion) {
        on = light.pattern[tick] === '#'
        if (tick !== shownTick) {
          shownTick = tick
          dotNodes.forEach((dot, i) => dot.classList.toggle('is-now', i === tick))
        }
      } else on = true
    }

    // the lamp follows the pattern, softened so a flash never strobes
    const goal = lights.length === 0 ? 0 : on ? 1 : 0.06
    brightness += (goal - brightness) * (motion ? 1 - Math.exp(-dt * 18) : 1)
    lampMaterial.color.set('#4a4430').lerp(new THREE.Color('#fff6cf'), brightness)
    halo.material.opacity = 0.95 * brightness
    halo.scale.setScalar(1.6 + 1.2 * brightness)
    lampLight.intensity = 9 * brightness
    glassMaterial.emissiveIntensity = 0.9 * brightness

    // fog rolls in while the fog signal shows
    const foggy = light?.signal === 'fog' && current.fog
    fogLevel += ((foggy ? 1 : 0) - fogLevel) * (motion ? 1 - Math.exp(-dt * 0.9) : 1)
    for (const { sprite, x, speed } of fogPuffs) {
      sprite.material.opacity = 0.16 * fogLevel
      sprite.position.x = motion ? x + Math.sin(time * speed) * 1.4 : x
    }

    const beamOpacity = (0.3 + 0.25 * fogLevel) * brightness
    for (const material of beamMaterials) {
      const uniform = material.uniforms.uOpacity
      if (uniform) uniform.value = beamOpacity
    }
    if (motion) beams.rotation.y = -time * ((Math.PI * 2) / 9)
    else beams.rotation.y = -0.5

    // the boat glides home, then rocks gently by the islet
    if (boat.visible) {
      const k = motion ? easeInOut(Math.min(1, Math.max(0, (time - 0.8) / 8))) : 1
      boat.position.lerpVectors(BOAT_FROM, BOAT_TO, k)
      boat.position.y = motion ? Math.sin(time * 1.3) * 0.03 : 0
      boat.rotation.y = 0.2 + (motion ? Math.sin(time * 0.9) * 0.03 : 0)
      boat.rotation.z = motion ? Math.sin(time * 1.1) * 0.025 : 0
    }

    renderer.render(scene, camera)
    placeLabel()
    requestAnimationFrame(frame)
  }

  new ResizeObserver(resize).observe(stage)

  replay.addEventListener('click', () => {
    play(analyse(api))
  })

  play(current)
  resize()
  requestAnimationFrame(frame)
}
