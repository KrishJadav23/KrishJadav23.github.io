import { useEffect, useRef } from 'react'
import './NightScene.css'

/*
  A night landscape painted on a canvas that sits fixed behind the whole page:
  a giant tree whose dome is tens of thousands of glowing leaf-dots, lit from the
  horizon; a figure under it, birds, drifting clouds, stars, fireflies and the odd
  shooting star over a field of grass.

  The heavy parts (sky, clouds, grass, tree) are painted once into offscreen layers
  when the size changes. Each frame only composites those layers and animates the
  light things on top. Frames are only drawn while an element marked
  [data-scene-window] (the hero, the footer) is on screen.
*/

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const easeOut = (t) => 1 - (1 - t) ** 3
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const mulberry = (seed) => {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Smooth value noise and a few octaves of it, for leaf clumps.
const hash = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const noise = (x, y) => {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
const fbm = (x, y) => 0.55 * noise(x, y) + 0.3 * noise(x * 2.1, y * 2.1) + 0.15 * noise(x * 4.3, y * 4.3)

const makeLayer = (w, h, dpr) => {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w * dpr))
  c.height = Math.max(1, Math.ceil(h * dpr))
  const g = c.getContext('2d')
  g.scale(dpr, dpr)
  return [c, g]
}

// A cheap glow: draw the layer small, then add it back on top, scaled up.
function bloom(c, W, H, passes) {
  const g = c.getContext('2d')
  for (const [div, alpha] of passes) {
    const [copy, cg] = makeLayer(W / div, H / div, 1)
    cg.imageSmoothingQuality = 'high'
    cg.drawImage(c, 0, 0, W / div, H / div)
    g.save()
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    g.globalCompositeOperation = 'lighter'
    g.globalAlpha = alpha
    g.drawImage(copy, 0, 0, c.width, c.height)
    g.restore()
  }
}

function buildSky(W, H, G, dpr, treeX) {
  const [c, g] = makeLayer(W, H, dpr)
  const sky = g.createLinearGradient(0, 0, 0, G)
  sky.addColorStop(0, '#030817')
  sky.addColorStop(0.28, '#06123f')
  sky.addColorStop(0.62, '#0a2a8c')
  sky.addColorStop(1, '#2263ee')
  g.fillStyle = sky
  g.fillRect(0, 0, W, G + 2)

  // Bright horizon glow behind the tree
  const glow = g.createRadialGradient(treeX, G, 0, treeX, G, W * 0.6)
  glow.addColorStop(0, 'rgba(200,240,255,0.9)')
  glow.addColorStop(0.22, 'rgba(100,180,255,0.5)')
  glow.addColorStop(1, 'rgba(30,90,255,0)')
  g.fillStyle = glow
  g.fillRect(0, 0, W, G + 2)

  // A wide, faint second glow so the whole horizon breathes
  const band = g.createLinearGradient(0, G - H * 0.25, 0, G)
  band.addColorStop(0, 'rgba(60,140,255,0)')
  band.addColorStop(1, 'rgba(90,170,255,0.28)')
  g.fillStyle = band
  g.fillRect(0, G - H * 0.25, W, H * 0.25)

  // Wispy cloud streaks
  const rand = mulberry(11)
  for (let i = 0; i < 5; i += 1) {
    const x = W * (0.5 + rand() * 0.45)
    const y = G * (0.8 + rand() * 0.14)
    const rx = W * (0.04 + rand() * 0.08)
    const ry = H * (0.003 + rand() * 0.005)
    g.save()
    g.translate(x, y)
    g.scale(1, ry / rx)
    const streak = g.createRadialGradient(0, 0, 0, 0, 0, rx)
    streak.addColorStop(0, 'rgba(170,215,255,0.5)')
    streak.addColorStop(1, 'rgba(60,120,255,0)')
    g.fillStyle = streak
    g.beginPath()
    g.arc(0, 0, rx, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  return c
}

// h: 0 at the top of the cloud (moonlit), 1 at its base (in shadow).
function puff(g, x, y, r, h) {
  // Soft discs: overlapping, they make one cumulus mass with a lumpy edge.
  const c = [lerp(232, 70, h) | 0, lerp(244, 118, h) | 0, lerp(255, 228, h) | 0]
  const gr = g.createRadialGradient(x, y, 0, x, y, r)
  gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0.42)`)
  gr.addColorStop(0.55, `rgba(${c[0]},${c[1]},${c[2]},0.36)`)
  gr.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`)
  g.fillStyle = gr
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
}

// Wider than the screen so it can drift sideways without showing an edge.
function buildClouds(W, H, G, dpr, portrait) {
  const cw = W * 1.25
  const ox = W * 0.125
  const [c, g] = makeLayer(cw, H, dpr)
  const rand = mulberry(23)
  const cluster = (cx, baseY, span, height, n) => {
    const top = baseY - height * 1.15
    for (let i = 0; i < n; i += 1) {
      const t = 0.06 + rand() * 0.88
      const bump = Math.sin(t * Math.PI)
      const x = cx + (t - 0.5) * span
      const r = height * (0.13 + 0.3 * bump * rand() + 0.04)
      const y = baseY - r * 0.45 - rand() * height * 0.65 * bump
      const h = clamp01((y - r * 0.6 - top) / (baseY - top))
      puff(g, ox + x, y, r, h ** 0.8)
    }
  }
  g.save()
  g.beginPath()
  g.rect(0, 0, cw, G - 0.01 * H)
  g.clip()
  if (portrait) {
    cluster(W * 0.85, G - 0.02 * H, W * 0.7, H * 0.09, 50)
  } else {
    cluster(W * 0.9, G - 0.015 * H, W * 0.42, H * 0.17, 150)
    cluster(W * 0.68, G - 0.015 * H, W * 0.2, H * 0.06, 60)
    cluster(W * 1.02, G * 0.66, W * 0.14, H * 0.06, 45)
  }
  g.restore()
  bloom(c, cw, H, [[8, 0.22]])
  return { c, cw, ox }
}

function buildGrass(W, H, G, dpr, treeX) {
  const [c, g] = makeLayer(W, H, dpr)
  const rand = mulberry(5)
  const field = g.createLinearGradient(0, G, 0, H)
  field.addColorStop(0, '#1d62f0')
  field.addColorStop(0.16, '#0f3fc0')
  field.addColorStop(0.55, '#071f78')
  field.addColorStop(1, '#030b36')
  g.fillStyle = field
  g.fillRect(0, G, W, H - G)

  // Light pooling on the grass under the tree
  g.save()
  g.beginPath()
  g.rect(0, G, W, H - G)
  g.clip()
  g.translate(treeX, G)
  g.scale(1, 0.28)
  const pool = g.createRadialGradient(0, 0, 0, 0, 0, W * 0.4)
  pool.addColorStop(0, 'rgba(170,230,255,0.55)')
  pool.addColorStop(1, 'rgba(60,140,255,0)')
  g.fillStyle = pool
  g.fillRect(-W, -W, W * 2, W * 2)
  g.restore()

  // Grass blades: denser and shorter near the horizon
  const n = Math.min(11000, Math.floor((W * (H - G)) / 18))
  for (let i = 0; i < n; i += 1) {
    const d = rand() ** 1.6
    const y = G + d * (H - G)
    const x = rand() * W
    const len = 2 + d * 16
    const a = (0.38 - 0.2 * d) * (0.5 + rand() * 0.5)
    g.strokeStyle = `rgba(${Math.floor(110 + rand() * 70)},${Math.floor(190 + rand() * 55)},255,${a})`
    g.lineWidth = 0.6 + d * 0.9
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (rand() - 0.5) * 3, y - len)
    g.stroke()
  }
  // Tiny flowers catching the light
  for (let i = 0; i < n / 30; i += 1) {
    const d = rand() ** 1.3
    g.fillStyle = `rgba(210,240,255,${0.25 + rand() * 0.45})`
    g.fillRect(rand() * W, G + d * (H - G), 1 + d, 1 + d)
  }

  // Bright horizon line
  const line = g.createLinearGradient(0, 0, W, 0)
  line.addColorStop(0, 'rgba(220,248,255,0.95)')
  line.addColorStop(0.45, 'rgba(130,200,255,0.6)')
  line.addColorStop(1, 'rgba(90,150,255,0.25)')
  g.fillStyle = line
  g.fillRect(0, G - 1, W, 2)
  return c
}

/* ---- The tree ---------------------------------------------------------- */

// Lumpy outline, like the crown of a broccoli: radius in units of the base ellipse.
const crown = (a) =>
  1 +
  0.045 * Math.sin(7 * a + 1.3) +
  0.03 * Math.sin(13 * a + 2.1) +
  0.018 * Math.sin(23 * a + 0.4) +
  0.01 * Math.sin(41 * a + 2.7)

const FLAT = 0.72 // the underside is flatter than the top
const TILT = 0.07 // and the dome leans: its right side hangs a little lower

// Canopy-space (u, v) to the shape's own round space.
const toShape = (u, v) => {
  let ve = v - TILT * u
  if (ve > 0) ve /= FLAT
  return [u, ve]
}

// Tapered, gently bent limb as a filled shape.
function limb(g, x0, y0, x1, y1, w0, w1, bend) {
  const dx = x1 - x0
  const dy = y1 - y0
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const mx = (x0 + x1) / 2 + nx * bend
  const my = (y0 + y1) / 2 + ny * bend
  g.beginPath()
  g.moveTo(x0 + nx * w0, y0 + ny * w0)
  g.quadraticCurveTo(mx + nx * (w0 + w1) * 0.5, my + ny * (w0 + w1) * 0.5, x1 + nx * w1, y1 + ny * w1)
  g.lineTo(x1 - nx * w1, y1 - ny * w1)
  g.quadraticCurveTo(mx - nx * (w0 + w1) * 0.5, my - ny * (w0 + w1) * 0.5, x0 - nx * w0, y0 - ny * w0)
  g.closePath()
  g.fill()
}

// Leaf colour: deep navy, through royal blue, to ice white.
const leafColour = (l, alpha) => {
  let r
  let gg
  let b
  if (l < 0.35) {
    const t = l / 0.35
    r = lerp(5, 18, t)
    gg = lerp(18, 58, t)
    b = lerp(70, 190, t)
  } else if (l < 0.72) {
    const t = (l - 0.35) / 0.37
    r = lerp(18, 60, t)
    gg = lerp(58, 140, t)
    b = lerp(190, 255, t)
  } else {
    const t = (l - 0.72) / 0.28
    r = lerp(60, 215, t)
    gg = lerp(140, 244, t)
    b = 255
  }
  return `rgba(${r | 0},${gg | 0},${b | 0},${alpha.toFixed(3)})`
}

function treeLayout(W, H, G) {
  const portrait = W < H * 0.8
  if (portrait) {
    const rx = W * 0.6
    const ry = Math.min(rx * 0.72, H * 0.22)
    const cx = W * 0.4
    const cy = G - H * 0.13 - ry * FLAT * 0.92
    return { portrait, cx, cy, rx, ry }
  }
  const rx = Math.min(W * 0.25, H * 0.58)
  const ry = Math.min(H * 0.37, rx * 0.86)
  const cx = W * 0.2
  const cy = Math.min(H * 0.34, G - H * 0.24 - ry * FLAT)
  return { portrait, cx, cy, rx, ry }
}

function buildTree(W, H, G, dpr) {
  const [c, g] = makeLayer(W, H, dpr)
  const rand = mulberry(99)
  const { portrait, cx, cy, rx, ry } = treeLayout(W, H, G)

  // Point on the outline at angle a (in shape space), scaled by k.
  const edge = (a, k = 1) => {
    const r = crown(a) * k
    const u = r * Math.cos(a)
    let ve = r * Math.sin(a)
    if (ve > 0) ve *= FLAT
    const v = ve + TILT * u
    return [cx + u * rx, cy + v * ry]
  }
  // The lowest point of the canopy at horizontal position x.
  const underside = (x) => {
    let best = -Infinity
    for (let a = 0.05; a < Math.PI - 0.05; a += 0.02) {
      const [px, py] = edge(a)
      if (Math.abs(px - x) < rx * 0.04) best = Math.max(best, py)
    }
    return best === -Infinity ? cy + ry * 0.6 : best
  }

  /* Trunk and limbs (drawn first: the canopy covers their tops) */
  const tx = cx - rx * (portrait ? 0.12 : 0.2)
  const base = G + H * 0.006
  const crownBottom = underside(tx)
  // The trunk's top (where it widens into limbs) is tucked up inside the crown.
  const top = crownBottom - ry * 0.12
  const trunkH = base - top
  const wB = rx * (portrait ? 0.075 : 0.12)

  const bark = g.createLinearGradient(tx - wB * 2, 0, tx + wB * 2, 0)
  bark.addColorStop(0, '#01030f')
  bark.addColorStop(0.5, '#020825')
  bark.addColorStop(0.78, '#061650')
  bark.addColorStop(0.93, '#1440b0')
  bark.addColorStop(1, '#3a7dff')
  g.fillStyle = bark

  // A waisted trunk: roots flare out at the ground, and it widens again into the crown.
  const trunkPath = () => {
    g.beginPath()
    g.moveTo(tx - wB * 2.9, base)
    g.bezierCurveTo(tx - wB * 1.5, base - trunkH * 0.01, tx - wB * 0.95, base - trunkH * 0.1, tx - wB * 0.78, base - trunkH * 0.32)
    g.bezierCurveTo(tx - wB * 0.66, base - trunkH * 0.55, tx - wB * 0.7, top + trunkH * 0.3, tx - wB * 1.5, top)
    g.lineTo(tx + wB * 1.6, top)
    g.bezierCurveTo(tx + wB * 0.8, top + trunkH * 0.3, tx + wB * 0.66, base - trunkH * 0.55, tx + wB * 0.82, base - trunkH * 0.3)
    g.bezierCurveTo(tx + wB * 1.0, base - trunkH * 0.1, tx + wB * 1.7, base - trunkH * 0.01, tx + wB * 3.1, base)
    g.closePath()
  }

  // Main trunk with flaring roots
  trunkPath()
  g.fill()

  // Limbs fanning up into the crown: dark silhouettes against the lit underside
  g.fillStyle = '#020722'
  const limbs = [
    [-0.5, 0.18, 0.42, -12],
    [-0.12, -0.15, 0.5, -4],
    [0.3, 0.05, 0.44, 8],
    [0.62, 0.25, 0.34, 14],
  ]
  for (const [u1, v1, w, bend] of limbs) {
    limb(g, tx, top + wB * 0.4, cx + u1 * rx, cy + v1 * ry, wB * w, wB * 0.1, bend * (rx / 400))
  }

  // Trunk again over the limb roots, so the lit edge reads cleanly
  g.fillStyle = bark
  trunkPath()
  g.fill()

  // Bark grain, catching a little light
  g.strokeStyle = 'rgba(110,170,255,0.08)'
  g.lineWidth = 1
  for (let i = 0; i < 14; i += 1) {
    const x = tx + (rand() - 0.35) * wB * 1.4
    g.beginPath()
    g.moveTo(x, base - trunkH * 0.04)
    g.bezierCurveTo(
      x + wB * 0.12,
      base - trunkH * 0.4,
      x - wB * 0.12,
      base - trunkH * 0.7,
      x + (rand() - 0.5) * wB * 0.4,
      top + trunkH * 0.05,
    )
    g.stroke()
  }

  /* Canopy body: a dark dome so the sky never shows through between leaves */
  const halo = g.createRadialGradient(cx, cy, rx * 0.4, cx, cy, rx * 1.5)
  halo.addColorStop(0, 'rgba(40,110,255,0.22)')
  halo.addColorStop(1, 'rgba(40,110,255,0)')
  g.fillStyle = halo
  g.fillRect(0, 0, W, H)

  g.beginPath()
  for (let i = 0; i <= 360; i += 1) {
    const [px, py] = edge((i / 360) * Math.PI * 2, 0.97)
    if (i === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.closePath()
  const body = g.createRadialGradient(cx - rx * 0.15, cy - ry * 0.2, 0, cx, cy, rx * 1.1)
  body.addColorStop(0, '#020720')
  body.addColorStop(0.65, '#040f3a')
  body.addColorStop(1, '#08205f')
  g.fillStyle = body
  g.fill()

  /* Leaves */
  const area = Math.PI * rx * ry
  const count = Math.min(70000, Math.floor(area / (portrait ? 4.5 : 5.5)))
  const freq = 1 / (rx * 0.07)
  const emb = rx * 0.025
  const L = [0.52, 0.85] // light from the bright horizon, low and to the right
  const sparkles = []
  for (let i = 0; i < count; i += 1) {
    const u = rand() * 2.3 - 1.15
    const v = rand() * 2.3 - 1.15
    const [ue, ve] = toShape(u, v)
    const ang = Math.atan2(ve, ue)
    const d = Math.hypot(ue, ve) / crown(ang)
    // A fuzzy, glittering edge: a few leaves stray past the outline.
    if (d > 1 + 0.07 * rand() ** 2) continue
    const px = cx + u * rx
    const py = cy + v * ry
    const nl = Math.hypot(ue, ve) || 1
    const lit = Math.max(0, (ue / nl) * L[0] + (ve / nl) * L[1])
    const topLight = Math.max(0, -ve / nl)
    const rim = smooth(0.55, 1.02, d)
    // Each clump is lit on the side facing the light and shadowed on the other,
    // like the florets of a broccoli: the noise, embossed along the light direction.
    const n0 = fbm(px * freq, py * freq)
    const n1 = fbm((px - L[0] * emb) * freq, (py - L[1] * emb) * freq)
    const floret = clamp01(0.5 + (n0 - n1) * 7)
    const under = smooth(0.35, 0.95, ve) * smooth(0.5, 1, d)
    let l =
      (0.04 + 0.42 * lit * (0.3 + 0.7 * d) + 0.28 * rim * (0.35 + lit) + 0.22 * topLight * rim + under * 0.12) *
      (0.3 + 1.15 * floret)
    l = clamp01(l + (rand() - 0.5) * 0.1)
    const size = 0.6 + l * 1.5 + rand() * 0.5
    g.fillStyle = leafColour(l, 0.35 + 0.65 * l)
    g.fillRect(px, py, size, size * (0.7 + rand() * 0.6))
    if (l > 0.7 && rand() < 0.2) {
      // a little sprig: two more leaves beside the first
      g.fillRect(px + size * 1.3, py - size * 0.4, size * 0.8, size * 0.8)
      g.fillRect(px - size * 0.9, py + size * 0.6, size * 0.7, size * 0.7)
    }
    if (l > 0.7 && rand() < 0.012) sparkles.push({ x: px, y: py, ph: rand() * 6.28, sz: size + 0.9 })
  }

  bloom(c, W, H, [
    [3, 0.3],
    [10, 0.32],
  ])

  /* A small figure standing by the tree, looking out */
  const hh = H * (portrait ? 0.04 : 0.05)
  const hx = portrait ? tx + wB * 3.6 : tx + wB * 4.2
  const feet = G + H * 0.012
  g.fillStyle = '#01040f'
  g.fillRect(hx - hh * 0.09, feet - hh * 0.45, hh * 0.08, hh * 0.45)
  g.fillRect(hx + hh * 0.01, feet - hh * 0.45, hh * 0.08, hh * 0.45)
  g.beginPath()
  g.roundRect(hx - hh * 0.14, feet - hh * 0.82, hh * 0.28, hh * 0.4, hh * 0.05)
  g.fill()
  g.beginPath()
  g.arc(hx, feet - hh * 0.91, hh * 0.09, 0, Math.PI * 2)
  g.fill()

  return { c, tx, base, sparkles, cx, cy, rx, ry }
}

function drawBird(g, x, y, size, flap) {
  const lift = flap * size * 0.55
  g.beginPath()
  g.moveTo(x - size, y - lift)
  g.quadraticCurveTo(x - size * 0.45, y - lift * 0.2 - size * 0.35, x, y)
  g.quadraticCurveTo(x + size * 0.45, y - lift * 0.2 - size * 0.35, x + size, y - lift)
  g.stroke()
}

const FORMATION = [
  [0, 0],
  [34, 14],
  [70, 6],
  [104, 20],
  [140, 10],
  [176, 24],
]

export default function NightScene({ revealed, contained = false }) {
  const canvasRef = useRef(null)
  const revealAt = useRef(null)

  useEffect(() => {
    if (revealed && revealAt.current === null) revealAt.current = performance.now()
  }, [revealed])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const host = canvas.parentElement
    const reduced = prefersReduced()

    let W = 0
    let H = 0
    let layers = null
    let raf = 0
    let par = 0
    let parTarget = 0
    let resizeTimer = 0
    let dots = { stars: [], flies: [], glow: null }
    let buildId = 0
    const onScreen = new Set()

    // Built in small steps (one task each) so the intro animation keeps running meanwhile,
    // then swapped in all at once so a resize never shows a half-built scene.
    const build = async () => {
      const rect = host.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return
      buildId += 1
      const id = buildId
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const bw = rect.width
      const bh = rect.height
      const bg = Math.round(bh * 0.86)
      const portrait = bw < bh * 0.8
      const treeX = treeLayout(bw, bh, bg).cx - bw * 0.03

      const rand = mulberry(3)
      const stars = Array.from({ length: Math.floor(bw / 7) }, () => ({
        x: rand() * bw,
        y: rand() * bg * 0.6,
        z: 0.7 + rand() * rand() * 1.8,
        sp: 0.6 + rand() * 2,
        ph: rand() * 6.28,
        b: 0.45 + rand() * 0.55,
      }))
      const flies = Array.from({ length: portrait ? 18 : 36 }, () => ({
        x: rand() * bw,
        y: bg + rand() * (bh - bg) * 0.8,
        sp: 0.04 + rand() * 0.06,
        ph: rand(),
        sw: 8 + rand() * 22,
      }))
      const [sprite, sg] = makeLayer(32, 32, 1)
      const grad = sg.createRadialGradient(16, 16, 0, 16, 16, 16)
      grad.addColorStop(0, 'rgba(215,245,255,1)')
      grad.addColorStop(0.3, 'rgba(120,200,255,0.5)')
      grad.addColorStop(1, 'rgba(60,140,255,0)')
      sg.fillStyle = grad
      sg.fillRect(0, 0, 32, 32)

      const next = {}
      const step = (fn) =>
        new Promise((resolve) => {
          setTimeout(() => {
            if (id === buildId) fn()
            resolve()
          }, 0)
        })
      await step(() => {
        next.sky = buildSky(bw, bh, bg, dpr, treeX)
      })
      await step(() => {
        next.clouds = buildClouds(bw, bh, bg, dpr, portrait)
      })
      await step(() => {
        next.grass = buildGrass(bw, bh, bg, dpr, treeX)
      })
      await step(() => {
        next.tree = buildTree(bw, bh, bg, dpr)
      })
      if (id !== buildId) return

      W = bw
      H = bh
      canvas.width = Math.ceil(W * dpr)
      canvas.height = Math.ceil(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      dots = { stars, flies, glow: sprite }
      layers = next
      host.dataset.ready = 'true'
      if (reduced) draw(performance.now())
    }

    function draw(now) {
      if (!layers) return
      const t = now / 1000
      const since = revealAt.current === null ? null : now - revealAt.current
      const g = reduced ? 1 : since === null ? 0 : easeOut(clamp01(since / 2600))
      const tt = reduced ? 6 : since === null ? 0 : since / 1000
      par += (parTarget - par) * 0.06

      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(layers.sky, 0, 0, W, H)

      // Stars
      for (const s of dots.stars) {
        const a = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) * s.b
        ctx.fillStyle = `rgba(220,235,255,${a.toFixed(3)})`
        ctx.fillRect(s.x + par * 3, s.y, s.z, s.z)
      }

      // Shooting star every 11s
      const local = (t + 6) % 11
      if (!reduced && g > 0.9 && local < 0.9) {
        const p = local / 0.9
        const k = W / 1440
        const x = W * 0.9 - p * W * 0.34
        const y = H * 0.06 + p * H * 0.14
        const len = 150 * Math.max(0.6, k)
        const trail = ctx.createLinearGradient(x, y, x + len * 0.85, y - len * 0.5)
        trail.addColorStop(0, `rgba(235,248,255,${Math.sin(p * Math.PI)})`)
        trail.addColorStop(1, 'rgba(120,190,255,0)')
        ctx.strokeStyle = trail
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + len * 0.85, y - len * 0.5)
        ctx.stroke()
      }

      // Clouds drift slowly and shift a little with the pointer
      const drift = reduced ? 0 : Math.sin(t * 0.06) * W * 0.02
      ctx.drawImage(layers.clouds.c, -layers.clouds.ox + drift - par * 8, 0, layers.clouds.cw, H)

      ctx.drawImage(layers.grass, 0, 0, W, H)

      // Tree: grows in on reveal, then its leaves shimmer
      const tree = layers.tree
      ctx.save()
      ctx.globalAlpha = g
      const sc = lerp(0.94, 1, g)
      ctx.translate(tree.tx - par * 6, tree.base)
      ctx.scale(sc, sc)
      ctx.translate(-tree.tx, -tree.base)
      ctx.drawImage(tree.c, 0, 0, W, H)
      // A slow wave of light rolls across the crown
      for (const sp of tree.sparkles) {
        const wave = Math.sin(t * 0.8 - (sp.x - tree.cx) / (tree.rx * 0.35))
        const a = reduced ? 0.5 : Math.max(0, Math.sin(t * 1.3 + sp.ph)) * (0.55 + 0.45 * wave)
        if (a < 0.05) continue
        ctx.fillStyle = `rgba(210,248,255,${(0.15 + 0.85 * a).toFixed(3)})`
        ctx.fillRect(sp.x, sp.y, sp.sz, sp.sz)
      }
      ctx.restore()

      // Fireflies rising over the field
      if (!reduced) {
        for (const f of dots.flies) {
          const p = (t * f.sp + f.ph) % 1
          const a = Math.sin(p * Math.PI) * (0.5 + 0.5 * Math.sin(t * 2 + f.ph * 20)) * g
          const x = f.x + Math.sin(t * 0.6 + f.ph * 12) * f.sw
          const y = f.y - p * H * 0.22
          ctx.globalAlpha = Math.max(0, a)
          ctx.drawImage(dots.glow, x - 8, y - 8, 16, 16)
        }
        ctx.globalAlpha = 1
      }

      // Birds, crossing in front of the crown from right to left, wings out of step.
      if (g > 0) {
        const k = Math.max(0.6, W / 1440)
        // The flock (about 176px long) never strays right of the crown, into the words.
        const startX = tree.cx + tree.rx * 0.95 - 176 * k
        const span = tree.rx * 2.4
        const q = ((tt * 38 * k) % span) / span
        const lead = startX - q * span
        const fade = Math.min(1, q * 8, (1 - q) * 8)
        ctx.strokeStyle = `rgba(255,255,255,${(0.92 * g * fade).toFixed(3)})`
        ctx.lineWidth = 2.2 * k
        ctx.lineCap = 'round'
        ctx.shadowColor = 'rgba(150,210,255,0.9)'
        ctx.shadowBlur = 8
        FORMATION.forEach(([ox, oy], i) => {
          const flap = Math.sin(tt * 7 + i * 0.7)
          const bob = Math.sin(tt * 0.9 + i) * 3
          drawBird(ctx, lead + ox * k, tree.cy + tree.ry * 0.42 + oy * k + bob, 9 * k, flap)
        })
        ctx.shadowBlur = 0
      }
    }

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      if (onScreen.size > 0) draw(now)
    }

    const onPointer = (e) => {
      parTarget = (e.clientX / window.innerWidth - 0.5) * 2
    }

    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(build, layers ? 150 : 40)
    })
    // The observer's first callback does the initial build, after the first paint.
    resizeObserver.observe(host)

    // Only animate while a window onto the scene (hero, footer) is on screen.
    let intersection
    if (!reduced) {
      intersection = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.add(entry.target)
          else onScreen.delete(entry.target)
        }
      })
      if (contained) intersection.observe(host)
      else document.querySelectorAll('[data-scene-window]').forEach((el) => intersection.observe(el))
      window.addEventListener('pointermove', onPointer, { passive: true })
      raf = requestAnimationFrame(loop)
    }

    return () => {
      buildId += 1
      cancelAnimationFrame(raf)
      clearTimeout(resizeTimer)
      resizeObserver.disconnect()
      if (intersection) intersection.disconnect()
      window.removeEventListener('pointermove', onPointer)
    }
  }, [contained])

  return (
    <div className={`scene${contained ? ' scene--contained' : ''}`} aria-hidden="true">
      <canvas ref={canvasRef} className="scene__canvas" />
      <div className="scene__shade" />
    </div>
  )
}
