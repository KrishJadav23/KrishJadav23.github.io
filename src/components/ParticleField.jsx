import { useEffect, useRef } from 'react'
import { FRAG, VERT } from '../gl/shaders'
import { SHAPE, buildShapes } from '../gl/shapes'
import './ParticleField.css'

/*
  The particle world behind the page (WebGL2).

  Sections choose what the particles become with data attributes:
    data-shape="brain"            scatter | name | brain | analytics | globe
    data-pos="x y scale dim"      where it sits (world units), its size, its brightness
    data-pos-m="x y scale dim"    the same on narrow screens
  The section under the middle of the screen wins. Shapes pour into each other,
  one morph at a time; position, scale and brightness glide continuously.

  While `intro` is true the particles gather into the name, centred.
*/

const COLD = [0.93, 0.91, 0.87] // warm white
const WARM = [1.0, 0.42, 0.17] // ember
const HOT = [1.0, 0.86, 0.68] // white heat
const MORPH_SECONDS = 2.1

// Per shape: base rotation (x, y), sway and spin speeds.
const POSE = {
  [SHAPE.scatter]: { rx: 0, ry: 0, sway: 0.05, spin: 0.015, look: 1 },
  [SHAPE.name]: { rx: 0, ry: 0, sway: 0.04, spin: 0, look: 0.12 },
  [SHAPE.brain]: { rx: 0.12, ry: -0.55, sway: 0.5, spin: 0, look: 1 },
  [SHAPE.analytics]: { rx: 0.42, ry: -0.62, sway: 0.18, spin: 0, look: 0.6 },
  [SHAPE.globe]: { rx: 0.32, ry: 0, sway: 0, spin: 0.12, look: 0.6 },
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

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh))
  return sh
}

export default function ParticleField({ intro }) {
  const canvasRef = useRef(null)
  const introRef = useRef(intro)

  useEffect(() => {
    introRef.current = intro
  }, [intro])

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' })
    if (!gl) {
      document.documentElement.classList.add('no-webgl')
      return undefined
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const narrow = () => window.innerWidth < 760
    const N = narrow() ? 14000 : window.innerWidth < 1200 ? 22000 : 30000

    let prog
    try {
      prog = gl.createProgram()
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog))
    } catch (err) {
      console.warn('Particle field disabled:', err)
      document.documentElement.classList.add('no-webgl')
      return undefined
    }
    gl.useProgram(prog)
    const U = (n) => gl.getUniformLocation(prog, n)
    const u = {
      from: U('uFrom'), to: U('uTo'), mix: U('uMix'), time: U('uTime'), motion: U('uMotion'),
      proj: U('uProj'), view: U('uView'), model: U('uModel'), aspect: U('uAspect'), size: U('uSize'),
      pr: U('uPR'), scrollVel: U('uScrollVel'), trail: U('uTrail'), cold: U('uCold'), warm: U('uWarm'),
      hot: U('uHot'), dim: U('uDim'),
    }
    gl.uniform3fv(u.cold, COLD)
    gl.uniform3fv(u.warm, WARM)
    gl.uniform3fv(u.hot, HOT)
    gl.uniform1f(u.motion, reduced ? 0 : 1)
    gl.uniformMatrix4fv(u.view, false, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -12, 1]))
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)
    gl.disable(gl.DEPTH_TEST)

    const vao = gl.createVertexArray()
    const buffers = []
    let ready = false

    // State
    let from = SHAPE.scatter
    let to = SHAPE.scatter
    let mix = 1
    let target = SHAPE.scatter
    const cur = { x: 0, y: 0, s: 1, dim: 0, rx: 0, ry: 0 }
    let goal = { x: 0, y: 0, s: 1, dim: 1 }
    let spinAcc = 0
    let raf = 0
    let last = performance.now()
    let t0 = last
    let W = 1
    let H = 1
    const mouse = { x: 0, y: 0, nx: 0, ny: 0, moved: false, speed: 0 }
    const trail = new Float32Array(24)
    let trailHead = 0
    let lastScroll = window.scrollY
    let scrollVel = 0
    let frames = 0
    let fpsAt = last

    const resize = () => {
      const pr = Math.min(window.devicePixelRatio || 1, narrow() ? 1.5 : 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.round(W * pr)
      canvas.height = Math.round(H * pr)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniformMatrix4fv(u.proj, false, perspective((35 * Math.PI) / 180, W / H, 0.1, 100))
      gl.uniform1f(u.aspect, W / H)
      gl.uniform1f(u.pr, pr)
      gl.uniform1f(u.size, narrow() ? 2.1 : 2.4)
    }

    const build = async () => {
      try {
        await document.fonts.load('700 200px "Instrument Sans"')
      } catch {
        /* the fallback face still draws the name */
      }
      const { shapes, extra } = buildShapes(N, window.innerWidth / window.innerHeight, '"Instrument Sans", system-ui, sans-serif')
      gl.bindVertexArray(vao)
      ;[...shapes, extra].forEach((data, i) => {
        const name = i < 5 ? `aP${i}` : 'aX'
        const loc = gl.getAttribLocation(prog, name)
        const buf = gl.createBuffer()
        buffers.push(buf)
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
        if (loc >= 0) {
          gl.enableVertexAttribArray(loc)
          gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 0, 0)
        }
      })
      ready = true
      canvas.dataset.ready = 'true'
      document.querySelectorAll('[data-gl-stat="count"]').forEach((el) => {
        el.textContent = N.toLocaleString('en')
      })
    }

    // Which section is under the middle of the screen?
    const readSection = () => {
      if (introRef.current) {
        target = SHAPE.name
        goal = { x: 0, y: narrow() ? 0.4 : 0.2, s: 1, dim: 1 }
        return
      }
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
      target = SHAPE[pick.dataset.shape] ?? SHAPE.scatter
      const base = parsePos(pick.dataset.pos, { x: 0, y: 0, s: 1, dim: 1 })
      goal = narrow() ? parsePos(pick.dataset.posM, base) : base
    }

    const pushTrail = (x, y, s) => {
      trail[trailHead * 3] = x
      trail[trailHead * 3 + 1] = y
      trail[trailHead * 3 + 2] = s
      trailHead = (trailHead + 1) % 8
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      frames += 1
      if (now - fpsAt > 600) {
        const fps = Math.round((frames * 1000) / (now - fpsAt))
        frames = 0
        fpsAt = now
        document.querySelectorAll('[data-gl-stat="fps"]').forEach((el) => {
          el.textContent = String(Math.min(fps, 120))
        })
      }
      if (!ready) return

      readSection()

      // One morph at a time; the next starts when this one lands.
      if (mix >= 1 && target !== to) {
        from = to
        to = target
        mix = reduced ? 1 : 0
      }
      if (mix < 1) mix = Math.min(1, mix + dt / MORPH_SECONDS)

      // Glide toward the section's placement.
      const k = 1 - Math.exp(-dt * 2.6)
      cur.x += (goal.x - cur.x) * k
      cur.y += (goal.y - cur.y) * k
      cur.s += (goal.s - cur.s) * k
      cur.dim += (goal.dim - cur.dim) * (1 - Math.exp(-dt * 1.8))

      const time = (now - t0) / 1000
      const pose = POSE[mix > 0.5 ? to : from]
      spinAcc += dt * pose.spin * (reduced ? 0 : 1)
      mouse.nx += (mouse.x - mouse.nx) * (1 - Math.exp(-dt * 3))
      mouse.ny += (mouse.y - mouse.ny) * (1 - Math.exp(-dt * 3))
      const sway = reduced ? 0 : Math.sin(time * 0.18) * pose.sway
      const tRx = pose.rx - mouse.ny * 0.18 * pose.look
      const tRy = pose.ry + sway + spinAcc + mouse.nx * 0.3 * pose.look
      const kr = 1 - Math.exp(-dt * 2)
      cur.rx += (tRx - cur.rx) * kr
      cur.ry += (tRy - cur.ry) * kr

      // Cursor wake
      for (let i = 0; i < 8; i += 1) trail[i * 3 + 2] *= Math.exp(-dt * 3.2)
      if (mouse.moved && !reduced) {
        pushTrail(mouse.x, mouse.y, Math.min(1, 0.35 + mouse.speed * 12))
        mouse.moved = false
        mouse.speed = 0
      }

      // Scroll velocity, smoothed
      const sy = window.scrollY
      const v = (sy - lastScroll) / Math.max(1, H)
      lastScroll = sy
      scrollVel += (Math.max(-0.15, Math.min(0.15, v)) * 8 - scrollVel) * 0.15

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform1f(u.from, from)
      gl.uniform1f(u.to, to)
      gl.uniform1f(u.mix, mix)
      gl.uniform1f(u.time, reduced ? 4 : time)
      gl.uniform1f(u.dim, cur.dim)
      gl.uniform1f(u.scrollVel, reduced ? 0 : scrollVel)
      gl.uniform3fv(u.trail, trail)
      gl.uniformMatrix4fv(u.model, false, model(cur.x, cur.y, cur.rx, cur.ry, cur.s))
      gl.bindVertexArray(vao)
      gl.drawArrays(gl.POINTS, 0, N)
    }

    const onPointer = (e) => {
      if (e.pointerType === 'touch') return
      const x = (e.clientX / W) * 2 - 1
      const y = -((e.clientY / H) * 2 - 1)
      mouse.speed = Math.max(mouse.speed, Math.hypot(x - mouse.x, y - mouse.y))
      mouse.x = x
      mouse.y = y
      mouse.moved = true
    }

    resize()
    build()
    raf = requestAnimationFrame(frame)
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      buffers.forEach((b) => gl.deleteBuffer(b))
      gl.deleteVertexArray(vao)
      gl.deleteProgram(prog)
    }
  }, [])

  return (
    <div className="field" aria-hidden="true">
      <canvas ref={canvasRef} className="field__canvas" />
      <div className="field__vignette" />
    </div>
  )
}
