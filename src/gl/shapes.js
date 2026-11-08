/*
  Target shapes for the particle field. Each is a Float32Array of N * 4:
  x, y, z and w = brightness (0..1) + 2 * colour code
    colour code 0: the particle's own tone · 1: poppy · 2: white · 3: powder
                4: height gradient (scan) · 5: depth gradient (near white, middle powder, far poppy)

  0 dust    sparse field filling the view (the page starts here)
  1 brain   three-quarter view: lobes, cerebellum, stem, winding folds, lit from above
  2 self    a "digital human": a dense, lit point-cloud head and shoulders
  3 eye     lids, lashes, iris fibres, pupil, glint and orbit rings
  4 cube    a Rubik's cube (its positions are animated live: see cube.js)

  The solid shapes are signed-distance functions; particles are projected onto the
  surface and shaded by a fixed light, so they keep their depth when they turn.
*/

export const SHAPE = { dust: 0, brain: 1, self: 2, eye: 3, cube: 4 }
export const SHAPE_COUNT = 5
export const COLOUR = { own: 0, poppy: 1, white: 2, powder: 3, gradient: 4, depth: 5 }

// Per shape: 0 draws mostly outlined triangles, 1 draws only fine points.
export const FINE = [0.8, 1, 1, 1, 1]

export const mulberry = (seed) => {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---- Noise ------------------------------------------------------------------ */
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
const fbm3 = (x, y, z) => 0.6 * vnoise(x, y, z) + 0.28 * vnoise(x * 2.1, y * 2.1, z * 2.1) + 0.12 * vnoise(x * 4.2, y * 4.2, z * 4.2)

/* ---- Signed distances ---------------------------------------------------------- */
function sdEllipsoid(x, y, z, cx, cy, cz, rx, ry, rz) {
  const px = x - cx
  const py = y - cy
  const pz = z - cz
  const k0 = Math.hypot(px / rx, py / ry, pz / rz)
  const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz))
  return k1 > 0 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz)
}
function sdCapsule(x, y, z, ax, ay, az, bx, by, bz, r) {
  const pax = x - ax
  const pay = y - ay
  const paz = z - az
  const bax = bx - ax
  const bay = by - ay
  const baz = bz - az
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)))
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r
}
const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}
const smax = (a, b, k) => -smin(-a, -b, k)

// A random point projected onto the surface sdf = 0, with its normal. Null if it doesn't settle.
function onSurface(sdf, box, rand) {
  let x = box[0] + rand() * (box[1] - box[0])
  let y = box[2] + rand() * (box[3] - box[2])
  let z = box[4] + rand() * (box[5] - box[4])
  const e = 0.003
  let nx = 0
  let ny = 0
  let nz = 1
  for (let i = 0; i < 5; i += 1) {
    const d = sdf(x, y, z)
    nx = sdf(x + e, y, z) - sdf(x - e, y, z)
    ny = sdf(x, y + e, z) - sdf(x, y - e, z)
    nz = sdf(x, y, z + e) - sdf(x, y, z - e)
    const g = Math.hypot(nx, ny, nz) || 1
    nx /= g
    ny /= g
    nz /= g
    x -= nx * d
    y -= ny * d
    z -= nz * d
  }
  if (Math.abs(sdf(x, y, z)) > 0.012) return null
  return [x, y, z, nx, ny, nz]
}

// Soft key light from above and in front, plus a little fill.
const light = (nx, ny, nz, lx, ly, lz) => {
  const l = Math.hypot(lx, ly, lz)
  const d = (nx * lx + ny * ly + nz * lz) / l
  return 0.16 + 0.84 * Math.max(0, d) ** 1.2
}

const dir = (rand) => {
  const u = rand() * 2 - 1
  const th = rand() * Math.PI * 2
  const s = Math.sqrt(1 - u * u)
  return [s * Math.cos(th), s * Math.sin(th), u]
}

function writer(N) {
  const out = new Float32Array(N * 4)
  let i = 0
  const put = (x, y, z, b, colour = 0) => {
    if (i >= N) return
    out[i * 4] = x
    out[i * 4 + 1] = y
    out[i * 4 + 2] = z
    out[i * 4 + 3] = Math.min(1, Math.max(0, b)) + 2 * (colour === true ? 1 : colour || 0)
    i += 1
  }
  return { out, put, count: () => i }
}

/* ---- Shapes -------------------------------------------------------------------- */
export function dust(N, spanX) {
  const rand = mulberry(1)
  const { out, put } = writer(N)
  for (let k = 0; k < N; k += 1) {
    put((rand() * 2 - 1) * spanX, (rand() * 2 - 1) * 4.8, (rand() * 2 - 1) * 6 - 2, 0.1 + rand() * 0.45)
  }
  return out
}

// x runs back (-) to front (+), y up, z across the hemispheres.
function brainSdf(x, y, z) {
  let d = sdEllipsoid(x, y, z, -0.05, 0.2, 0, 1.32, 1.1, 1.06) // cerebrum
  d = smin(d, sdEllipsoid(x, y, z, 0.68, 0.16, 0, 0.72, 0.9, 1.0), 0.32) // frontal lobe
  d = smin(d, sdEllipsoid(x, y, z, -0.82, 0.06, 0, 0.62, 0.78, 0.92), 0.3) // occipital lobe
  d = smin(d, sdEllipsoid(x, y, z, 0.24, -0.42, 0.6, 0.8, 0.42, 0.44), 0.22) // temporal lobes
  d = smin(d, sdEllipsoid(x, y, z, 0.24, -0.42, -0.6, 0.8, 0.42, 0.44), 0.22)
  d = smax(d, -(y + 0.72), 0.14) // the underside is flat
  d = smax(d, 0.055 - Math.abs(z), 0.07) // the fissure between the hemispheres
  d = smin(d, sdEllipsoid(x, y, z, -0.92, -0.6, 0, 0.52, 0.36, 0.88), 0.04) // cerebellum
  d = smin(d, sdCapsule(x, y, z, -0.42, -0.5, 0, -0.56, -1.45, 0, 0.18), 0.1) // brain stem
  return d
}

// Ridged noise: 1 along winding crests (gyri), 0 in the grooves (sulci).
const gyri = (x, y, z) => 1 - Math.abs(fbm3(x * 3.6 + 3, y * 3.6, z * 3.6) * 2 - 1)
const isCerebrum = (x, y) => !(x < -0.5 && y < -0.32) && y > -0.8

// The same brain with the folds sculpted into its surface.
function foldedBrainSdf(x, y, z) {
  const d = brainSdf(x, y, z)
  if (d > 0.25 || !isCerebrum(x, y)) return d
  return d - 0.1 * (gyri(x, y, z) - 0.55)
}

export function brain(N) {
  const rand = mulberry(2)
  const { out, put, count } = writer(N)
  const box = [-1.6, 1.6, -1.55, 1.4, -1.2, 1.2]
  const S = 1.5
  let guard = 0
  while (count() < N && guard < N * 40) {
    guard += 1
    const p = onSurface(foldedBrainSdf, box, rand)
    if (!p) continue
    const [x, y, z, nx, ny, nz] = p
    const inCerebellum = x < -0.5 && y < -0.32
    const inStem = y < -0.8
    let crest
    if (inStem) crest = 0.6
    else if (inCerebellum) crest = 0.45 + 0.55 * Math.abs(Math.sin(y * 42 + x * 5))
    else crest = gyri(x, y, z)
    if (y < -0.6 && !inCerebellum && !inStem && rand() < 0.55) continue
    // Points gather along the crests, so the folds read as winding bands
    if (!inStem && rand() > 0.2 + 0.8 * crest ** 2.5) continue
    // The light catches the crests and the side facing it; the grooves fall into shadow.
    const lit = light(nx, ny, nz, 0.4, 0.75, 0.55)
    put(x * S, (y + 0.05) * S, z * S, (0.3 + 0.7 * lit) * (0.45 + 0.55 * crest), !inStem && rand() < 0.01 ? COLOUR.poppy : COLOUR.gradient)
  }
  return out
}

// A head and shoulders. The face looks along +z.
function selfSdf(x, y, z) {
  let d = sdEllipsoid(x, y, z, 0, 0.48, -0.12, 0.74, 0.86, 0.92) // cranium
  d = smin(d, sdEllipsoid(x, y, z, 0, 0.42, 0.26, 0.62, 0.56, 0.56), 0.3) // forehead
  d = smin(d, sdEllipsoid(x, y, z, 0, -0.12, 0.22, 0.57, 0.62, 0.62), 0.3) // mid face
  d = smin(d, sdEllipsoid(x, y, z, 0, -0.55, 0.14, 0.5, 0.32, 0.55), 0.22) // jaw
  d = smin(d, sdEllipsoid(x, y, z, 0, -0.82, 0.42, 0.24, 0.17, 0.24), 0.18) // chin
  d = smin(d, sdEllipsoid(x, y, z, 0.4, -0.02, 0.55, 0.22, 0.14, 0.18), 0.15) // cheekbones
  d = smin(d, sdEllipsoid(x, y, z, -0.4, -0.02, 0.55, 0.22, 0.14, 0.18), 0.15)
  d = smin(d, sdEllipsoid(x, y, z, 0, 0.3, 0.68, 0.52, 0.09, 0.13), 0.12) // brow ridge
  d = smax(d, -sdEllipsoid(x, y, z, 0.26, 0.14, 0.8, 0.15, 0.1, 0.14), 0.09) // eye sockets
  d = smax(d, -sdEllipsoid(x, y, z, -0.26, 0.14, 0.8, 0.15, 0.1, 0.14), 0.09)
  d = smin(d, sdEllipsoid(x, y, z, 0.26, 0.13, 0.69, 0.12, 0.075, 0.09), 0.025) // eyes and lids
  d = smin(d, sdEllipsoid(x, y, z, -0.26, 0.13, 0.69, 0.12, 0.075, 0.09), 0.025)
  d = smin(d, sdCapsule(x, y, z, 0, 0.22, 0.78, 0, -0.16, 0.99, 0.075), 0.09) // nose bridge
  d = smin(d, sdEllipsoid(x, y, z, 0, -0.2, 1.0, 0.12, 0.1, 0.1), 0.06) // nose tip
  d = smin(d, sdEllipsoid(x, y, z, 0.1, -0.24, 0.9, 0.08, 0.07, 0.07), 0.05) // nostril wings
  d = smin(d, sdEllipsoid(x, y, z, -0.1, -0.24, 0.9, 0.08, 0.07, 0.07), 0.05)
  d = smin(d, sdEllipsoid(x, y, z, 0, -0.43, 0.79, 0.21, 0.055, 0.08), 0.05) // upper lip
  d = smin(d, sdEllipsoid(x, y, z, 0, -0.54, 0.77, 0.19, 0.06, 0.08), 0.05) // lower lip
  d = smax(d, -sdEllipsoid(x, y, z, 0, -0.487, 0.84, 0.2, 0.012, 0.06), 0.02) // mouth line
  d = smin(d, sdEllipsoid(x, y, z, 0.76, 0.05, -0.05, 0.09, 0.24, 0.16), 0.08) // ears
  d = smin(d, sdEllipsoid(x, y, z, -0.76, 0.05, -0.05, 0.09, 0.24, 0.16), 0.08)
  d = smin(d, sdCapsule(x, y, z, 0, -0.6, -0.1, 0, -1.55, -0.12, 0.36), 0.22) // neck
  d = smin(d, sdCapsule(x, y, z, -0.9, -1.58, -0.15, 0.9, -1.58, -0.15, 0.3), 0.3) // trapezius
  d = smin(d, sdEllipsoid(x, y, z, 0, -2.02, -0.12, 1.65, 0.5, 0.62), 0.35) // shoulders
  d = smin(d, sdCapsule(x, y, z, 0.15, -1.76, 0.36, 0.85, -1.68, 0.24, 0.06), 0.08) // collarbones
  d = smin(d, sdCapsule(x, y, z, -0.15, -1.76, 0.36, -0.85, -1.68, 0.24, 0.06), 0.08)
  d = smin(d, sdEllipsoid(x, y, z, 0, -2.25, 0.08, 1.3, 0.4, 0.55), 0.3) // chest
  d = smax(d, -(y + 2.45), 0.05)
  return d
}

/*
  Scanned like a depth camera: a regular grid of rays from the front, one point where
  each ray meets the surface. The lattice is what makes it read as a real scan.
*/
export function self(N) {
  const rand = mulberry(3)
  const x0 = -1.75
  const x1 = 1.75
  const y0 = -2.45
  const y1 = 1.42
  const step = Math.sqrt(((x1 - x0) * (y1 - y0) * 0.55) / (N * 1.15))
  const e = 0.003
  const hits = []
  for (let y = y1; y >= y0; y -= step) {
    for (let x = x0; x <= x1; x += step) {
      if (y < -1.7 && rand() < 0.35) continue // a lighter touch on the shoulders
      let z = 1.35
      let hit = false
      for (let i = 0; i < 90 && z > -1.2; i += 1) {
        const d = selfSdf(x, y, z)
        if (d < 0.002) {
          hit = true
          break
        }
        z -= Math.max(d, 0.004)
      }
      if (!hit) continue
      let nx = selfSdf(x + e, y, z) - selfSdf(x - e, y, z)
      let ny = selfSdf(x, y + e, z) - selfSdf(x, y - e, z)
      let nz = selfSdf(x, y, z + e) - selfSdf(x, y, z - e)
      const g = Math.hypot(nx, ny, nz) || 1
      nx /= g
      ny /= g
      nz /= g
      const lit = light(nx, ny, nz, -0.35, 0.55, 0.8)
      const rim = Math.min(1, (1 - Math.abs(nz)) * 1.3)
      const fade = Math.min(1, (y + 2.45) / 0.6)
      hits.push([x, y, z, (0.38 + 0.42 * lit + 0.3 * rim) * fade])
    }
  }
  // Exactly N points: an even subset of the hits, or a few repeats if short.
  const { out, put } = writer(N)
  for (let i = 0; i < N; i += 1) {
    const h = hits[Math.floor((i * hits.length) / N)] || hits[Math.floor(rand() * hits.length)]
    put(h[0] * 1.2, (h[1] + 0.5) * 1.2, h[2] * 1.2, h[3], COLOUR.gradient)
  }
  return out
}

export function eye(N) {
  const rand = mulberry(4)
  const { out, put, count } = writer(N)
  const W = 2.0
  const upper = (x) => 0.92 * (1 - (x / W) ** 2) ** 0.85
  const lower = (x) => -0.7 * (1 - (x / W) ** 2) ** 0.95
  const bulge = (x, y) => 1.0 * Math.sqrt(Math.max(0, 1 - (x * x + y * y) / 5.5))
  const D = COLOUR.depth
  while (count() < N) {
    const r = rand()
    if (r < 0.24) {
      const x = (rand() * 2 - 1) * W
      const top = rand() < 0.55
      const y = (top ? upper(x) : lower(x)) + (rand() - 0.5) * 0.05 + (rand() < 0.3 ? (top ? 0.12 : -0.1) : 0)
      put(x, y, bulge(x, y), 0.85 + rand() * 0.15, D)
    } else if (r < 0.3) {
      const k = Math.floor(rand() * 15)
      const x0 = -W * 0.8 + (k / 14) * W * 1.6
      const y0 = upper(x0)
      const t = rand()
      const reach = 0.12 + 0.18 * (1 - Math.abs(x0) / W)
      put(x0 + t * reach * (x0 / W) * 0.8, y0 + t * reach, bulge(x0, y0) + t * 0.1, 0.7, D)
    } else if (r < 0.62) {
      const a = (Math.floor(rand() * 90) / 90) * Math.PI * 2 + (rand() - 0.5) * 0.03
      const rr = 0.26 + rand() * 0.5
      const x = Math.cos(a) * rr
      const y = Math.sin(a) * rr
      put(x, y, bulge(x, y) + 0.06, 0.4 + 0.6 * rr, D)
    } else if (r < 0.7) {
      const a = rand() * Math.PI * 2
      const rr = 0.77 + (rand() - 0.5) * 0.04
      put(Math.cos(a) * rr, Math.sin(a) * rr, bulge(0, 0), 1, COLOUR.poppy)
    } else if (r < 0.75) {
      const a = rand() * Math.PI * 2
      put(Math.cos(a) * 0.26, Math.sin(a) * 0.26, bulge(0, 0) + 0.06, 0.95, D)
    } else if (r < 0.77) {
      const [dx, dy] = dir(rand)
      put(0.3 + dx * 0.07, 0.32 + dy * 0.07, bulge(0, 0) + 0.12, 1, COLOUR.white)
    } else if (r < 0.88) {
      const x = (rand() * 2 - 1) * W * 0.95
      const y = lower(x) + rand() * (upper(x) - lower(x))
      if (Math.hypot(x, y) < 0.8) continue
      put(x, y, bulge(x, y), 0.22 + rand() * 0.14, D)
    } else {
      const ring = rand() < 0.5 ? 2.55 : 2.9
      const a = rand() * Math.PI * 2
      if (Math.floor((a / (Math.PI * 2)) * 60) % 3 === 0) continue
      // tilted, so the rings sweep from behind the eye to in front of it
      put(Math.cos(a) * ring, Math.sin(a) * ring * 0.5, Math.sin(a) * 0.9 - 0.2, 0.32, D)
    }
  }
  return out
}

/*
  The Rubik's cube model: which cubie each particle belongs to, and where it sits on
  that cubie in the solved state. cube.js turns the layers and writes the positions.
  Stickers: up poppy, down poppy (dim), front white, back white (dim), right powder,
  left powder (dim), so a scrambled cube is a patchwork that resolves into clean faces.
*/
export const CUBE_SIZE = 0.8 // world units per cubie
export function cubeModel(N) {
  const rand = mulberry(6)
  const local = new Float32Array(N * 3)
  const cubie = new Uint8Array(N)
  const w = new Float32Array(N)
  const cubies = []
  for (let x = -1; x <= 1; x += 1) for (let y = -1; y <= 1; y += 1) for (let z = -1; z <= 1; z += 1) cubies.push([x, y, z])
  const faces = [
    [1, 0, COLOUR.powder, 1],
    [-1, 0, COLOUR.powder, 0.45],
    [1, 1, COLOUR.poppy, 1],
    [-1, 1, COLOUR.poppy, 0.5],
    [1, 2, COLOUR.white, 1],
    [-1, 2, COLOUR.white, 0.45],
  ]
  const stickers = []
  cubies.forEach((c, ci) => {
    faces.forEach(([sign, axis, colour, b]) => {
      if (c[axis] === sign) stickers.push([ci, axis, sign, colour, b])
    })
  })
  const H = 0.47 // half a cubie, leaving a gap
  for (let i = 0; i < N; i += 1) {
    const r = rand()
    let ci
    let p
    let wi
    if (r < 0.66) {
      // A sticker: a crisp square outline with a lighter fill
      const [c, axis, sign, colour, b] = stickers[Math.floor(rand() * stickers.length)]
      const S = 0.4
      let u = (rand() * 2 - 1) * S
      let v = (rand() * 2 - 1) * S
      const outline = rand() < 0.62
      if (outline) {
        const k = rand() * 4
        const along = (rand() * 2 - 1) * S
        const off = S + (rand() - 0.5) * 0.02
        if (k < 1) [u, v] = [along, off]
        else if (k < 2) [u, v] = [along, -off]
        else if (k < 3) [u, v] = [off, along]
        else [u, v] = [-off, along]
      }
      const q = [0, 0, 0]
      q[axis] = sign * (H + 0.005)
      q[(axis + 1) % 3] = u
      q[(axis + 2) % 3] = v
      ci = c
      p = q
      wi = (outline ? b : b * 0.5) + 2 * colour
    } else {
      // The black plastic: the edges of every cubie, faint
      const outer = cubies.map((c, k) => (c[0] || c[1] || c[2] ? k : -1)).filter((k) => k >= 0)
      ci = outer[Math.floor(rand() * outer.length)]
      const t = rand() * 2 - 1
      const e = Math.floor(rand() * 12)
      const axis = Math.floor(e / 4)
      const s1 = e & 1 ? 1 : -1
      const s2 = e & 2 ? 1 : -1
      const q = [0, 0, 0]
      q[axis] = t * H
      q[(axis + 1) % 3] = s1 * H
      q[(axis + 2) % 3] = s2 * H
      p = q
      wi = 0.32
    }
    cubie[i] = ci
    local[i * 3] = p[0] * CUBE_SIZE
    local[i * 3 + 1] = p[1] * CUBE_SIZE
    local[i * 3 + 2] = p[2] * CUBE_SIZE
    w[i] = wi
  }
  return { local, cubie, w, cubies }
}

export function buildExtra(N) {
  const rand = mulberry(11)
  // Per particle: morph delay, size, spin/phase, kind and colour
  const extra = new Float32Array(N * 4)
  for (let i = 0; i < N; i += 1) {
    extra[i * 4] = rand()
    extra[i * 4 + 1] = 0.6 + rand() ** 3 * 1.4
    extra[i * 4 + 2] = rand()
    extra[i * 4 + 3] = rand()
  }
  return extra
}
