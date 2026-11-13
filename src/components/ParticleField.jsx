import { useEffect, useRef } from 'react'
import { AMB_FRAG, AMB_VERT, FRAG, SPACE_FRAG, SPACE_VERT, VERT } from '../gl/shaders'
import { createCube } from '../gl/cube'
import { FINE, SHAPE, SHAPE_COUNT, brain, buildExtra, cubeModel, dust, eye, mulberry, self as head } from '../gl/shapes'
import './ParticleField.css'

/*
  The particle world behind the page (WebGL2).

  Sections choose what the particles become with data attributes:
    data-shape="brain"            dust | brain | self | eye | cube | cycle
    data-cycle="brain self eye"   for "cycle": the shapes to show in turn
    data-pos="x y scale dim"      where it sits (world units), its size, its brightness
    data-pos-m="x y scale dim"    the same on narrow screens
    data-amb="0.6"                how strongly the ambient layer shows
  The section under the middle of the screen wins. Shapes pour into each other,
  one morph at a time; position, scale and brightness glide continuously.

  Under it, an ambient layer never stops: wave ribbons flowing across the page and
  signals travelling along axon paths.
*/

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
const POWDER = hex('#b4d2e7')
const INK = hex('#edf2f6')
const POPPY = hex('#ec4a32')
const MORPH_SECONDS = 2.2
// How long each shape holds in a cycle; the cube stays long enough to solve itself twice.
const HOLD_MS = { cube: 15000 }
const CYCLE_MS = 9000

// Per shape: base rotation (x, y), sway, spin and how much it follows the pointer.
const POSE = {
  [SHAPE.dust]: { rx: 0, ry: 0, sway: 0.05, spin: 0.012, look: 1, s: 1 },
  [SHAPE.brain]: { rx: 0.2, ry: -0.42, sway: 0.4, spin: 0, look: 1.4, s: 0.82 },
  [SHAPE.self]: { rx: 0.02, ry: 0, sway: 0.34, spin: 0, look: 1.4, s: 0.9 },
  [SHAPE.eye]: { rx: 0, ry: 0, sway: 0.12, spin: 0, look: 0.9, s: 0.9 },
  [SHAPE.cube]: { rx: 0.55, ry: -0.72, sway: 0.3, spin: 0, look: 1, s: 0.95 },
}

const parsePos = (s, fallback) => {
  if (!s) return fallback
  const v = s.trim().split(/\s+/).map(Number)
  return { x: v[0] ?? 0, y: v[1] ?? 0, s: v[2] ?? 1, dim: v[3] ?? 1 }
}

function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2)
  const nf = 1 / (near - far)
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0])
}

// Column-major model matrix: translate * rotateY * rotateX * scale
function model(tx, ty, rx, ry, s) {
  const cx = Math.cos(rx)
  const sx = Math.sin(rx)
  const cy = Math.cos(ry)
  const sy = Math.sin(ry)
  return new Float32Array([
    cy * s, 0, -sy * s, 0,
    sy * sx * s, cx * s, cy * sx * s, 0,
    sy * cx * s, -sx * s, cy * cx * s, 0,
    tx, ty, 0, 1,
  ])
}

function program(gl, vs, fs) {
  const compile = (type, src) => {
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh))
    return sh
  }
  const p = gl.createProgram()
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs))
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p))
  return p
}

// Wave ribbons and axon paths, in screen space.
function buildAmbient(narrow) {
  const rand = mulberry(77)
  const pos = []
  const data = []
  const ribbons = narrow ? [-0.62, -0.78] : [-0.58, -0.7, -0.82]
  const perRibbon = narrow ? 260 : 420
  ribbons.forEach((cy, r) => {
    for (let i = 0; i < perRibbon; i += 1) {
      const g = (rand() + rand() + rand() - 1.5) / 1.5
      pos.push(rand(), cy)
      data.push(0, g, r * 0.37 + 0.1, 1.4 + rand() * 1.2)
    }
  })
  const paths = narrow ? 4 : 7
  const per = narrow ? 90 : 140
  for (let k = 0; k < paths; k += 1) {
    const side = rand() < 0.5 ? -1 : 1
    const p0 = [side * (1.05 + rand() * 0.1), rand() * 1.8 - 0.9]
    const p3 = [-side * (0.2 + rand() * 0.9), rand() * 1.8 - 0.9]
    const p1 = [p0[0] * 0.5 + (rand() - 0.5) * 0.6, p0[1] + (rand() - 0.5) * 1.2]
    const p2 = [p3[0] * 0.5 + (rand() - 0.5) * 0.6, p3[1] + (rand() - 0.5) * 1.2]
    const phase = rand()
    for (let i = 0; i < per; i += 1) {
      const t = i / (per - 1)
      const u = 1 - t
      const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0]
      const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
      pos.push(x, y)
      data.push(1, t, phase, 1.6)
    }
  }
  return { pos: new Float32Array(pos), data: new Float32Array(data), count: pos.length / 2 }
}

export default function ParticleField() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' })
    if (!gl) {
      document.documentElement.classList.add('no-webgl')
      return undefined
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const narrow = () => window.innerWidth < 760
    const N = narrow() ? 9000 : window.innerWidth < 1200 ? 15000 : 24000

    let prog
    let amb
    let space
    try {
      prog = program(gl, VERT, FRAG)
      amb = program(gl, AMB_VERT, AMB_FRAG)
      space = program(gl, SPACE_VERT, SPACE_FRAG)
    } catch (err) {
      console.warn('Particle field disabled:', err)
      document.documentElement.classList.add('no-webgl')
      return undefined
    }

    const uniforms = (p, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]))
    const u = uniforms(prog, ['uFrom', 'uTo', 'uMix', 'uTime', 'uMotion', 'uProj', 'uView', 'uModel', 'uAspect', 'uSize', 'uPR', 'uScrollVel', 'uPowder', 'uInk', 'uPoppy', 'uDim', 'uFine'])
    const ua = uniforms(amb, ['uTime', 'uAmb', 'uPR', 'uAspect', 'uPowder', 'uPoppy'])
    const us = uniforms(space, ['uProj', 'uTravel', 'uTime', 'uPR', 'uAlpha', 'uMotion', 'uPowder', 'uInk', 'uPoppy'])
    gl.useProgram(space)
    gl.uniform3fv(us.uPowder, POWDER)
    gl.uniform3fv(us.uInk, INK)
    gl.uniform3fv(us.uPoppy, POPPY)
    gl.uniform1f(us.uMotion, reduced ? 0 : 1)
    gl.useProgram(prog)
    gl.uniform3fv(u.uPowder, POWDER)
    gl.uniform3fv(u.uInk, INK)
    gl.uniform3fv(u.uPoppy, POPPY)
    gl.uniform1f(u.uMotion, reduced ? 0 : 1)
    gl.uniform1fv(u.uFine, FINE)
    // A closer camera with a wider lens: stronger perspective, so shapes have real depth.
    gl.uniformMatrix4fv(u.uView, false, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -9, 1]))
    gl.useProgram(amb)
    gl.uniform3fv(ua.uPowder, POWDER)
    gl.uniform3fv(ua.uPoppy, POPPY)
    gl.enable(gl.BLEND)
    // Premultiplied 'over': overlapping triangles layer instead of burning to white.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.disable(gl.DEPTH_TEST)

    const buffers = []
    const attach = (p, vao, name, data, size, usage = gl.STATIC_DRAW) => {
      const loc = gl.getAttribLocation(p, name)
      const buf = gl.createBuffer()
      buffers.push(buf)
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, data, usage)
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
      }
      return buf
    }

    // Shapes, the ambient layer and deep space
    const vao = gl.createVertexArray()
    const ambVao = gl.createVertexArray()
    const spaceVao = gl.createVertexArray()
    const STARS = narrow() ? 1000 : 2200
    {
      const r = mulberry(31)
      const stars = new Float32Array(STARS * 4)
      for (let i = 0; i < STARS; i += 1) {
        // Spread wide, thinning toward the centre line so the tunnel reads
        const ang = r() * Math.PI * 2
        const rad = 1.5 + Math.sqrt(r()) * 13
        stars[i * 4] = Math.cos(ang) * rad * 1.3
        stars[i * 4 + 1] = Math.sin(ang) * rad * 0.75
        stars[i * 4 + 2] = r() * 44
        stars[i * 4 + 3] = r()
      }
      attach(space, spaceVao, 'aStar', stars, 4)
    }
    const ambient = buildAmbient(narrow())
    attach(amb, ambVao, 'aPos', ambient.pos, 2)
    attach(amb, ambVao, 'aData', ambient.data, 4)
    const extra = buildExtra(N)
    attach(prog, vao, 'aX', extra, 4)
    const shapeReady = new Array(SHAPE_COUNT).fill(false)
    const shapeData = new Array(SHAPE_COUNT).fill(null) // CPU copies, for the sand physics
    const take = (i, data) => {
      attach(prog, vao, `aP${i}`, data, 4)
      shapeData[i] = data
      shapeReady[i] = true
    }

    /*
      Sand physics. Every particle carries an on-screen offset and a velocity. The
      cursor shoves the particles it passes through along its stroke and spills them
      sideways; each one then rides its own slightly bouncy spring back home, so a
      disturbance jiggles and settles like sand, not like a cut-out circle.
    */
    const off = new Float32Array(N * 2)
    const vel = new Float32Array(N * 2)
    const stiff = new Float32Array(N)
    for (let i = 0; i < N; i += 1) stiff[i] = 7 + extra[i * 4 + 2] * 11
    const offBuf = attach(prog, vao, 'aOff', off, 2, gl.DYNAMIC_DRAW)
    let sandActive = false

    // Dust and the cube are quick; the surface shapes are built in a worker.
    take(SHAPE.dust, dust(N, 4.8 * Math.max(window.innerWidth / window.innerHeight, 0.6) * 1.3))
    canvas.dataset.ready = 'true'
    const cubeShape = cubeModel(N)
    const cube = createCube(cubeShape, N)
    const cubeData = new Float32Array(N * 4)
    cube.write(cubeData)
    const cubeBuf = attach(prog, vao, `aP${SHAPE.cube}`, cubeData, 4, gl.DYNAMIC_DRAW)
    shapeData[SHAPE.cube] = cubeData
    shapeReady[SHAPE.cube] = true

    let worker = null
    let buildTimer = 0
    try {
      worker = new Worker(new URL('../gl/shapes.worker.js', import.meta.url), { type: 'module' })
      worker.onmessage = (e) => take(e.data.i, e.data.data)
      worker.onerror = (e) => console.error('shape worker failed', e.message)
      worker.postMessage({ N })
    } catch {
      // No workers: build on the main thread, one shape per task.
      const jobs = [
        [SHAPE.brain, brain],
        [SHAPE.self, head],
        [SHAPE.eye, eye],
      ]
      const next = () => {
        const job = jobs.shift()
        if (!job) return
        take(job[0], job[1](N))
        buildTimer = setTimeout(next, 0)
      }
      buildTimer = setTimeout(next, 0)
    }

    // State
    let from = SHAPE.dust
    let to = SHAPE.dust
    let mix = 1
    let target = SHAPE.dust
    const cur = { x: 0, y: 0, s: 1, dim: 0, rx: 0, ry: 0, amb: 0 }
    let goal = { x: 0, y: 0, s: 1, dim: 1 }
    let goalAmb = 0.6
    let spinAcc = 0
    // The hero's cycle runs on its own clock, which simply stops while a shape is held.
    let cycleClock = 0
    let cycling = false
    let cycleEl = null // a different cycling section (another page's hero) starts again from the first shape
    let raf = 0
    let last = performance.now()
    const t0 = last
    let W = 1
    let H = 1
    const mouse = { x: 0, y: 0, nx: 0, ny: 0, px: 0, py: 0, moved: false }
    let lastScroll = window.scrollY
    let scrollVel = 0
    // How far we've flown: each screen scrolled moves us 6 units forward, plus a slow drift.
    let travel = 0

    // Click and drag a shape to orbit it; it drifts on, then eases back to its pose.
    const orbit = { on: false, x: 0, y: 0, rx: 0, ry: 0, vx: 0, vy: 0 }
    const root = document.documentElement
    const inOrbitZone = (e) => {
      if (e.pointerType === 'touch' || narrow()) return false
      const el = e.target instanceof Element ? e.target : null
      if (!el || el.closest('a, button, input, textarea, select, label, [role="button"], .island-wrap, .app-frame, .case-fig')) return false
      return !!el.closest('[data-drag]') && e.clientX > window.innerWidth * 0.45
    }

    const resize = () => {
      const pr = Math.min(window.devicePixelRatio || 1, narrow() ? 1.5 : 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.round(W * pr)
      canvas.height = Math.round(H * pr)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.useProgram(prog)
      gl.uniformMatrix4fv(u.uProj, false, perspective((45 * Math.PI) / 180, W / H, 0.1, 100))
      gl.uniform1f(u.uAspect, W / H)
      gl.uniform1f(u.uPR, pr)
      gl.uniform1f(u.uSize, narrow() ? 8 : 9.5)
      gl.useProgram(amb)
      gl.uniform1f(ua.uPR, pr)
      gl.uniform1f(ua.uAspect, W / H)
      gl.useProgram(space)
      gl.uniformMatrix4fv(us.uProj, false, perspective((45 * Math.PI) / 180, W / H, 0.1, 100))
      gl.uniform1f(us.uPR, pr)
    }

    // Which section is under the middle of the screen?
    const readSection = () => {
      const mid = window.innerHeight * 0.5
      const els = document.querySelectorAll('[data-shape]')
      let pick = null
      for (const el of els) {
        const r = el.getBoundingClientRect()
        if (r.top <= mid && r.bottom > mid) {
          pick = el
          break
        }
      }
      if (!pick) pick = els[0]
      if (!pick) return
      cycling = pick.dataset.shape === 'cycle'
      if (cycling) {
        if (pick !== cycleEl) {
          cycleEl = pick
          cycleClock = 0
        }
        const list = (pick.dataset.cycle || 'self cube eye brain').split(' ')
        const lens = list.map((n) => HOLD_MS[n] || CYCLE_MS)
        let at = cycleClock % lens.reduce((a, b) => a + b, 0)
        let idx = 0
        while (at >= lens[idx]) {
          at -= lens[idx]
          idx += 1
        }
        target = SHAPE[list[idx]] ?? SHAPE.brain
      } else {
        target = SHAPE[pick.dataset.shape] ?? SHAPE.dust
      }
      const base = parsePos(pick.dataset.pos, { x: 0, y: 0, s: 1, dim: 1 })
      goal = narrow() ? parsePos(pick.dataset.posM, base) : base
      goalAmb = pick.dataset.amb ? Number(pick.dataset.amb) : 0.55
    }

    const focal = 1 / Math.tan((22.5 * Math.PI) / 180)
    const stepSand = (dt, M) => {
      const pushing = mouse.moved
      const mvx = mouse.x - mouse.px
      const mvy = mouse.y - mouse.py
      mouse.px = mouse.x
      mouse.py = mouse.y
      mouse.moved = false
      if (!pushing && !sandActive) return
      const aspect = W / H
      const A = shapeData[from]
      const B = shapeData[to]
      const canPush = pushing && A && B
      const R2 = 0.07 * 0.07
      const reach = R2 * 9
      const speed = Math.hypot(mvx * aspect, mvy)
      const damp = 2.3
      let active = false
      for (let i = 0; i < N; i += 1) {
        const o = i * 2
        let ox = off[o]
        let oy = off[o + 1]
        let vx = vel[o]
        let vy = vel[o + 1]
        if (canPush) {
          // Where is this particle on screen right now? (the shader's morph, without the drift)
          const d0 = extra[i * 4] * 0.45
          let t = (mix - d0) / 0.55
          t = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t)
          const j = i * 4
          const x = A[j] + (B[j] - A[j]) * t
          const y = A[j + 1] + (B[j + 1] - A[j + 1]) * t
          const z = A[j + 2] + (B[j + 2] - A[j + 2]) * t
          const w = 9 - (M[2] * x + M[6] * y + M[10] * z + M[14])
          const sx = ((focal / aspect) * (M[0] * x + M[4] * y + M[8] * z + M[12])) / w + ox
          const sy = (focal * (M[1] * x + M[5] * y + M[9] * z + M[13])) / w + oy
          const dx = (sx - mouse.x) * aspect
          const dy = sy - mouse.y
          const d2 = dx * dx + dy * dy
          if (d2 < reach) {
            const fall = Math.exp(-d2 / R2)
            const len = Math.sqrt(d2) || 1e-4
            // Shove along the stroke, and spill sideways like sand
            vx += (mvx * 16 + (dx / len / aspect) * speed * 7) * fall
            vy += (mvy * 16 + (dy / len) * speed * 7) * fall
          }
        }
        const k = stiff[i]
        vx += (-k * ox - damp * vx) * dt
        vy += (-k * oy - damp * vy) * dt
        ox += vx * dt
        oy += vy * dt
        ox = ox > 0.35 ? 0.35 : ox < -0.35 ? -0.35 : ox
        oy = oy > 0.35 ? 0.35 : oy < -0.35 ? -0.35 : oy
        off[o] = ox
        off[o + 1] = oy
        vel[o] = vx
        vel[o + 1] = vy
        if (!active && (Math.abs(ox) + Math.abs(oy) > 0.0006 || Math.abs(vx) + Math.abs(vy) > 0.004)) active = true
      }
      sandActive = active
      gl.bindBuffer(gl.ARRAY_BUFFER, offBuf)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, off)
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!shapeReady[0]) return

      readSection()
      if (cycling && !orbit.on && !reduced) cycleClock += dt * 1000

      // One morph at a time; the next starts when this one lands and its shape exists.
      if (mix >= 1 && target !== to && shapeReady[target]) {
        from = to
        to = target
        mix = reduced ? 1 : 0
        if (to === SHAPE.cube) cube.start(reduced)
      }
      // The cube is live: turn its layers and upload where every particle is now.
      if (from === SHAPE.cube || to === SHAPE.cube) {
        if (!reduced) cube.update(dt)
        cube.write(cubeData)
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuf)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, cubeData)
      }
      if (mix < 1) mix = Math.min(1, mix + dt / MORPH_SECONDS)

      const k = 1 - Math.exp(-dt * 2.6)
      cur.x += (goal.x - cur.x) * k
      cur.y += (goal.y - cur.y) * k
      const shapeScale = mix > 0.5 ? POSE[to].s : POSE[from].s
      cur.s += (goal.s * shapeScale - cur.s) * k
      cur.dim += (goal.dim - cur.dim) * (1 - Math.exp(-dt * 1.8))
      cur.amb += (goalAmb - cur.amb) * (1 - Math.exp(-dt * 1.5))

      const time = (now - t0) / 1000
      const pose = POSE[mix > 0.5 ? to : from]
      spinAcc += dt * pose.spin * (reduced ? 0 : 1)
      mouse.nx += (mouse.x - mouse.nx) * (1 - Math.exp(-dt * 3))
      mouse.ny += (mouse.y - mouse.ny) * (1 - Math.exp(-dt * 3))
      const sway = reduced ? 0 : Math.sin(time * 0.18) * pose.sway
      if (!orbit.on) {
        orbit.ry += orbit.vy
        orbit.rx += orbit.vx
        orbit.vy *= Math.exp(-dt * 3)
        orbit.vx *= Math.exp(-dt * 3)
        const back = 1 - Math.exp(-dt * 0.7)
        orbit.ry -= orbit.ry * back
        orbit.rx -= orbit.rx * back
      }
      const tRx = pose.rx + orbit.rx - mouse.ny * 0.18 * pose.look
      const tRy = pose.ry + orbit.ry + sway + spinAcc + mouse.nx * 0.3 * pose.look
      const kr = 1 - Math.exp(-dt * (orbit.on ? 14 : 2))
      cur.rx += (tRx - cur.rx) * kr
      cur.ry += (tRy - cur.ry) * kr

      const M = model(cur.x, cur.y, cur.rx, cur.ry, cur.s)
      if (!reduced) stepSand(dt, M)

      const sy = window.scrollY
      const v = (sy - lastScroll) / Math.max(1, H)
      lastScroll = sy
      scrollVel += (Math.max(-0.15, Math.min(0.15, v)) * 8 - scrollVel) * 0.15

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      // Deep space, furthest back
      const goalTravel = (window.scrollY / Math.max(1, H)) * 6 + (reduced ? 0 : time * 0.35)
      travel += (goalTravel - travel) * (1 - Math.exp(-dt * 4))
      gl.useProgram(space)
      gl.uniform1f(us.uTravel, travel)
      gl.uniform1f(us.uTime, time)
      gl.uniform1f(us.uAlpha, 0.9)
      gl.bindVertexArray(spaceVao)
      gl.drawArrays(gl.POINTS, 0, STARS)

      // Ambient layer next, behind the shape
      gl.useProgram(amb)
      gl.uniform1f(ua.uTime, reduced ? 6 : time)
      gl.uniform1f(ua.uAmb, cur.amb)
      gl.bindVertexArray(ambVao)
      gl.drawArrays(gl.POINTS, 0, ambient.count)

      gl.useProgram(prog)
      gl.uniform1f(u.uFrom, from)
      gl.uniform1f(u.uTo, to)
      gl.uniform1f(u.uMix, mix)
      gl.uniform1f(u.uTime, reduced ? 4 : time)
      gl.uniform1f(u.uDim, cur.dim)
      gl.uniform1f(u.uScrollVel, reduced ? 0 : scrollVel)
      gl.uniformMatrix4fv(u.uModel, false, M)
      gl.bindVertexArray(vao)
      gl.drawArrays(gl.POINTS, 0, N)
    }

    const onDown = (e) => {
      if (e.button !== 0 || !inOrbitZone(e)) return
      orbit.on = true
      orbit.x = e.clientX
      orbit.y = e.clientY
      orbit.vx = 0
      orbit.vy = 0
      root.classList.add('is-orbiting')
      e.preventDefault()
    }
    const onUp = () => {
      if (!orbit.on) return
      orbit.on = false
      root.classList.remove('is-orbiting')
    }
    const onPointer = (e) => {
      if (orbit.on && e.buttons === 0) onUp() // the release happened somewhere we didn't hear it
      if (orbit.on) {
        const dx = (e.clientX - orbit.x) * 0.009
        const dy = (e.clientY - orbit.y) * 0.007
        orbit.x = e.clientX
        orbit.y = e.clientY
        orbit.ry += dx
        orbit.rx = Math.max(-1.2, Math.min(1.2, orbit.rx + dy))
        orbit.vy = dx * 0.5
        orbit.vx = dy * 0.5
      } else {
        root.classList.toggle('can-orbit', inOrbitZone(e))
      }
      if (e.pointerType === 'touch') return
      const x = (e.clientX / W) * 2 - 1
      const y = -((e.clientY / H) * 2 - 1)
      mouse.x = x
      mouse.y = y
      mouse.moved = true
    }

    resize()
    raf = requestAnimationFrame(frame)
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('blur', onUp)
    return () => {
      window.removeEventListener('blur', onUp)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      root.classList.remove('can-orbit', 'is-orbiting')
      cancelAnimationFrame(raf)
      clearTimeout(buildTimer)
      worker?.terminate()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      buffers.forEach((b) => gl.deleteBuffer(b))
      gl.deleteVertexArray(vao)
      gl.deleteVertexArray(ambVao)
      gl.deleteVertexArray(spaceVao)
      gl.deleteProgram(space)
      gl.deleteProgram(prog)
      gl.deleteProgram(amb)
    }
  }, [])

  return (
    <div className="field" aria-hidden="true">
      <canvas ref={canvasRef} className="field__canvas" />
      <div className="field__vignette" />
    </div>
  )
}
