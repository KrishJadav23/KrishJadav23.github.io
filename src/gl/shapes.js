/*
  Target shapes for the particle field. Each shape is a Float32Array of N * 4:
  x, y, z and a brightness (0..1) the shader uses for shading.

  0 scatter    dust filling the view (the intro starts here)
  1 name       "KRISH JADAV", sampled from text drawn on a 2D canvas
  2 brain      two folded hemispheres, cerebellum and brain stem
  3 analytics  a 3D bar chart with a trend line
  4 globe      a sphere of data with latitude and longitude rings
*/

export const SHAPE = { scatter: 0, name: 1, brain: 2, analytics: 3, globe: 4 }

export const mulberry = (seed) => {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hash3 = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return s - Math.floor(s)
}
const sm = (t) => t * t * (3 - 2 * t)
function vnoise(x, y, z) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const u = sm(x - xi)
  const v = sm(y - yi)
  const w = sm(z - zi)
  const l = (a, b, t) => a + (b - a) * t
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz)
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  )
}
const fbm3 = (x, y, z) => 0.6 * vnoise(x, y, z) + 0.3 * vnoise(x * 2.1, y * 2.1, z * 2.1) + 0.1 * vnoise(x * 4.3, y * 4.3, z * 4.3)

// Uniform random direction on the unit sphere.
const dir = (rand) => {
  const u = rand() * 2 - 1
  const th = rand() * Math.PI * 2
  const s = Math.sqrt(1 - u * u)
  return [s * Math.cos(th), s * Math.sin(th), u]
}

function scatter(N, rand, spanX) {
  const out = new Float32Array(N * 4)
  for (let i = 0; i < N; i += 1) {
    out[i * 4] = (rand() * 2 - 1) * spanX
    out[i * 4 + 1] = (rand() * 2 - 1) * 4.6
    out[i * 4 + 2] = (rand() * 2 - 1) * 5 - 1
    out[i * 4 + 3] = 0.25 + rand() * 0.75
  }
  return out
}

function brain(N, rand) {
  const out = new Float32Array(N * 4)
  const S = 1.75
  for (let i = 0; i < N; i += 1) {
    const r = rand()
    let x
    let y
    let z
    let b
    if (r < 0.8) {
      // Cortex: one hemisphere (an egg-shaped half), its surface folded into gyri.
      const side = rand() < 0.5 ? -1 : 1
      const [dx, dy, dz] = dir(rand)
      let ry = dy > 0 ? 1.04 : 0.74
      if (dx > 0.25) ry *= 1 - 0.14 * (dx - 0.25) // the frontal lobe tapers
      const rx = dx > 0 ? 1.42 : 1.36
      x = dx * rx
      y = dy * ry
      z = dz * 0.62
      // Temporal lobe: a bulge low on the outer side
      if (dy < -0.1 && dz * side > 0) y -= 0.12 * Math.max(0, 1 - Math.abs(dx - 0.15) * 1.8)
      const n = fbm3(x * 2.4, y * 2.4, z * 2.4 + side * 7)
      const ridge = 1 - Math.abs(n * 2 - 1)
      const k = (1 + 0.075 * (ridge - 0.55)) * (1 - rand() * 0.035)
      x *= k
      y *= k
      z = z * k + side * 0.6
      b = 0.14 + 0.86 * ridge ** 2.2
    } else if (r < 0.88) {
      // Cerebellum, finely striped
      const [dx, dy, dz] = dir(rand)
      x = -1.02 + dx * 0.5
      y = -0.62 + dy * 0.32
      z = dz * 0.9
      const stripe = 0.5 + 0.5 * Math.sin(y * 42 + dx * 3)
      y *= 1 + 0.03 * stripe
      b = 0.3 + 0.6 * stripe
    } else if (r < 0.91) {
      // Brain stem
      const t = rand()
      const a = rand() * Math.PI * 2
      const rr = 0.17 * (1 - t * 0.25)
      x = -0.5 - t * 0.2 + Math.cos(a) * rr
      y = -0.5 - t * 0.95
      z = Math.sin(a) * rr
      b = 0.35 + rand() * 0.3
    } else {
      // A faint inner glow gives the brain volume
      const [dx, dy, dz] = dir(rand)
      const rr = Math.cbrt(rand()) * 0.85
      const side = dz > 0 ? 1 : -1
      x = dx * 1.3 * rr
      y = dy * 0.8 * rr
      z = dz * 0.55 * rr + side * 0.55
      b = 0.08 + rand() * 0.12
    }
    out[i * 4] = x * S
    out[i * 4 + 1] = (y + 0.08) * S
    out[i * 4 + 2] = z * S
    out[i * 4 + 3] = b
  }
  return out
}

function analytics(N, rand) {
  const out = new Float32Array(N * 4)
  const cols = 10
  const rows = 6
  const gap = 0.6
  const bw = 0.38
  const heights = []
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      const trend = 0.25 + 0.75 * (i / (cols - 1)) ** 1.25
      const wave = 0.16 * Math.sin(j * 1.4 + i * 0.9)
      heights.push(Math.max(0.2, 2.7 * (trend * 0.82 + wave + 0.08 * hash3(i, j, 3))))
    }
  }
  const ox = ((cols - 1) * gap) / 2
  const oz = ((rows - 1) * gap) / 2
  const base = -1.5
  for (let i = 0; i < N; i += 1) {
    const r = rand()
    let x
    let y
    let z
    let b
    if (r < 0.9) {
      const k = Math.floor(rand() * cols * rows)
      const ci = Math.floor(k / rows)
      const cj = k % rows
      const h = heights[k]
      const cx = ci * gap - ox
      const cz = cj * gap - oz
      const q = rand()
      if (q < 0.5) {
        // top face
        x = cx + (rand() - 0.5) * bw
        z = cz + (rand() - 0.5) * bw
        y = base + h
        b = 0.75 + 0.25 * rand()
      } else if (q < 0.85) {
        // the four vertical edges
        const e = Math.floor(rand() * 4)
        x = cx + (e & 1 ? 0.5 : -0.5) * bw
        z = cz + (e & 2 ? 0.5 : -0.5) * bw
        y = base + rand() * h
        b = 0.4 + 0.3 * (y - base) / h
      } else {
        // faces, sparse
        const face = rand() < 0.5
        x = cx + (face ? (rand() - 0.5) * bw : (rand() < 0.5 ? -0.5 : 0.5) * bw)
        z = cz + (face ? (rand() < 0.5 ? -0.5 : 0.5) * bw : (rand() - 0.5) * bw)
        y = base + rand() * h
        b = 0.18
      }
    } else if (r < 0.96) {
      // Trend line floating over the bars
      const t = rand()
      x = (t - 0.5) * cols * gap
      y = base + 0.6 + 2.6 * (0.25 + 0.75 * t ** 1.25) + 0.18 * Math.sin(t * 9)
      z = -oz - 0.5
      x += (rand() - 0.5) * 0.03
      y += (rand() - 0.5) * 0.03
      b = 1
    } else {
      // Floor grid
      const gx = Math.round((rand() * 2 - 1) * 8) / 8
      const along = rand() * 2 - 1
      const onX = rand() < 0.5
      x = (onX ? along : gx) * (ox + 0.6)
      z = (onX ? gx : along) * (oz + 0.6)
      y = base
      b = 0.15
    }
    out[i * 4] = x
    out[i * 4 + 1] = y
    out[i * 4 + 2] = z
    out[i * 4 + 3] = b
  }
  return out
}

function globe(N, rand) {
  const out = new Float32Array(N * 4)
  const R = 2.3
  for (let i = 0; i < N; i += 1) {
    const r = rand()
    let x
    let y
    let z
    let b
    if (r < 0.42) {
      const ring = Math.floor(rand() * 13) + 1
      const lat = (ring / 14) * Math.PI - Math.PI / 2
      const lon = rand() * Math.PI * 2
      x = Math.cos(lat) * Math.cos(lon)
      y = Math.sin(lat)
      z = Math.cos(lat) * Math.sin(lon)
      b = 0.6 + 0.3 * rand()
    } else if (r < 0.66) {
      const lon = (Math.floor(rand() * 18) / 18) * Math.PI * 2
      const lat = rand() * Math.PI - Math.PI / 2
      x = Math.cos(lat) * Math.cos(lon)
      y = Math.sin(lat)
      z = Math.cos(lat) * Math.sin(lon)
      b = 0.5 + 0.3 * rand()
    } else if (r < 0.92) {
      ;[x, y, z] = dir(rand)
      b = 0.2 + 0.3 * rand()
    } else {
      // An orbiting ring around the equator
      const a = rand() * Math.PI * 2
      const rr = 1.45 + (rand() - 0.5) * 0.06
      x = Math.cos(a) * rr
      z = Math.sin(a) * rr
      y = (rand() - 0.5) * 0.02
      b = 0.9
    }
    out[i * 4] = x * R
    out[i * 4 + 1] = y * R
    out[i * 4 + 2] = z * R
    out[i * 4 + 3] = b
  }
  return out
}

// Points that spell the name, sampled from text drawn on a canvas.
function name(N, rand, aspect, font) {
  const lines = aspect < 0.9 ? ['KRISH', 'JADAV'] : ['KRISH JADAV']
  const c = document.createElement('canvas')
  const W = 1400
  const lineH = 220
  c.width = W
  c.height = lineH * lines.length + 40
  const g = c.getContext('2d')
  g.fillStyle = '#fff'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  let size = 220
  g.font = `700 ${size}px ${font}`
  const widest = Math.max(...lines.map((l) => g.measureText(l).width))
  size = Math.floor(size * Math.min(1, (W - 60) / widest))
  g.font = `700 ${size}px ${font}`
  lines.forEach((l, i) => g.fillText(l, W / 2, 20 + lineH * (i + 0.5)))
  const { data } = g.getImageData(0, 0, c.width, c.height)
  const pts = []
  for (let y = 0; y < c.height; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (data[(y * W + x) * 4 + 3] > 128) pts.push(x, y)
    }
  }
  const out = new Float32Array(N * 4)
  // World width of the text: fits the view on any screen.
  const worldW = aspect < 0.9 ? 4.6 : Math.min(10, 7.2 * Math.min(aspect, 1.8) * 0.7)
  const k = worldW / W
  const count = pts.length / 2
  for (let i = 0; i < N; i += 1) {
    const p = Math.floor(rand() * count) * 2
    out[i * 4] = (pts[p] - W / 2 + (rand() - 0.5) * 2) * k
    out[i * 4 + 1] = -(pts[p + 1] - c.height / 2 + (rand() - 0.5) * 2) * k
    out[i * 4 + 2] = (rand() - 0.5) * 0.18
    out[i * 4 + 3] = 0.55 + rand() * 0.45
  }
  return out
}

export function buildShapes(N, aspect, font) {
  const rand = mulberry(42)
  const spanX = 4.6 * Math.max(aspect, 0.6) * 1.25
  const shapes = [scatter(N, rand, spanX), name(N, rand, aspect, font), brain(N, rand), analytics(N, rand), globe(N, rand)]
  // Per particle: morph delay, size, phase, spare
  const extra = new Float32Array(N * 4)
  for (let i = 0; i < N; i += 1) {
    extra[i * 4] = rand()
    extra[i * 4 + 1] = 0.55 + rand() ** 4 * 1.9
    extra[i * 4 + 2] = rand()
    extra[i * 4 + 3] = rand()
  }
  return { shapes, extra }
}
