import { useEffect, useRef } from 'react'
import './AsciiBackground.css'

/*
  A procedural nature scene (sun, clouds, two mountain ridges, pines, a lake)
  rendered to a coarse grid, then:
    1. dithered with a 4x4 Bayer matrix, which decides between two neighbouring
       brightness levels per cell, and
    2. drawn as ASCII, each level being a character from RAMP.
*/

const RAMP = ' .:-=+*#%@'
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const MONO = "ui-monospace, 'Cascadia Mono', Consolas, 'SF Mono', monospace"
// Tints: 0 = stone grey (mountains, stars), 1 = warm orange (sun, glow), 2 = green (pines, shore)
const TINTS = [
  [176, 182, 198],
  [255, 138, 61],
  [92, 190, 122],
]

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
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
const ridge = (u, seed) =>
  0.55 * (1 - Math.abs(Math.sin(u * 5 + seed))) +
  0.3 * (1 - Math.abs(Math.sin(u * 11 + seed * 2.3))) +
  0.15 * (1 - Math.abs(Math.sin(u * 23 + seed * 4.1)))

// Deterministic pine trees down both sides of the scene.
const TREES = (() => {
  let seed = 7
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  return Array.from({ length: 20 }, (_, i) => ({
    x: i % 2 === 0 ? rand() * 0.24 : 0.76 + rand() * 0.24,
    h: 0.18 + rand() * 0.2,
    w: 0.03 + rand() * 0.02,
    base: 0.93 + rand() * 0.05,
    phase: rand() * 6,
  }))
})()

const BIRDS = [0, 1, 2, 3].map((i) => ({ y: 0.14 + i * 0.065, speed: 0.01 + i * 0.004, offset: i * 0.29 }))

let tintOut = 0

// Brightness (0-1) of the scene at a point; sets tintOut as a side effect.
function scene(u, v, col, row, t, aspect, par) {
  const sx = 0.84 + par * 0.01
  const sy = 0.27 + 0.012 * Math.sin(t * 0.3)

  // Pines (nearest layer)
  if (v > 0.45 && (u < 0.3 || u > 0.7)) {
    const ut = u - par * 0.03
    for (const tree of TREES) {
      const dy = (v - (tree.base - tree.h)) / tree.h
      if (dy < 0 || dy > 1) continue
      const tier = (dy * 5) % 1
      const sway = Math.sin(t * 0.9 + tree.phase) * 0.004 * (1 - dy)
      const halfWidth = (dy > 0.92 ? tree.w * 0.12 : tree.w * dy * (0.65 + 0.35 * tier)) / aspect
      if (Math.abs(ut - tree.x - sway) <= halfWidth) {
        tintOut = 2
        return 0.42 + 0.4 * tier
      }
    }
  }

  if (v > 0.86) {
    const m = (v - 0.86) / 0.14
    const shore = 0.3 * Math.sqrt(clamp01(m))
    if (u < shore || u > 1 - shore) {
      tintOut = 2
      return 0.2 + 0.08 * Math.sin(u * 120 + v * 40)
    }
    // Lake with ripples and the sun's reflection
    const ripple = Math.sin(v * 150 + t * 1.4 + u * 10 + noise(u * 20, v * 30 + t * 0.5) * 3)
    const base = 0.1 + 0.05 * ripple + 0.06 * (1 - m)
    const half = 0.02 + m * 0.06
    const dx = Math.abs(u - sx)
    if (dx < half) {
      tintOut = 1
      return clamp01(base + (1 - dx / half) * 0.75 * (0.55 + 0.45 * ripple))
    }
    tintOut = 0
    return base
  }

  // Mid ridge, then far ridge (lighter: atmospheric haze)
  const ym = 0.7 - 0.16 * ridge(u + par * 0.015, 3.7)
  if (v >= ym) {
    tintOut = 0
    const depth = clamp01((v - ym) / 0.3)
    return 0.36 - 0.22 * depth + 0.06 * Math.sin(u * 160 + v * 50) + (v - ym < 0.012 ? 0.25 : 0)
  }
  const yf = 0.58 - 0.2 * ridge(u + par * 0.006, 1)
  if (v >= yf) {
    tintOut = 0
    const depth = clamp01((v - yf) / 0.3)
    return 0.5 - 0.28 * depth + 0.05 * Math.sin(u * 120 + v * 70) + (v - yf < 0.012 ? 0.3 : 0)
  }

  // Sky: gradient, sun with halo, drifting clouds, twinkling stars
  tintOut = 0
  let lum = 0.03 + 0.2 * v * v
  const d = Math.hypot((u - sx) * aspect, v - sy)
  if (d < 0.07) {
    tintOut = 1
    return 1
  }
  const halo = 0.6 * Math.exp(-(d - 0.07) * 8)
  lum += halo
  if (halo > 0.12) tintOut = 1
  if (v < 0.5) {
    lum += smooth(0.58, 0.85, noise(u * aspect * 3 + t * 0.03, v * 12)) * 0.28
  }
  if (v < 0.42) {
    const h = hash(col * 1.7, row * 2.3)
    if (h > 0.985) lum += 0.45 + 0.35 * Math.sin(t * 2 + h * 200)
  }
  return lum
}

export default function AsciiBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const host = canvas.parentElement
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0
    let h = 0
    let cols = 0
    let rows = 0
    let cw = 0
    let ch = 0
    let fs = 12
    let grid = new Uint8Array(0)
    let tint = new Uint8Array(0)
    let par = 0
    let parTarget = 0
    let raf = 0
    let last = 0
    let visible = true

    const draw = (t) => {
      const aspect = w / h
      for (let row = 0; row < rows; row += 1) {
        const v = (row + 0.5) / rows
        for (let col = 0; col < cols; col += 1) {
          const u = (col + 0.5) / cols
          const lum = scene(u, v, col, row, t, aspect, par)
          const threshold = BAYER[(row & 3) * 4 + (col & 3)] / 16
          const i = row * cols + col
          grid[i] = Math.min(9, Math.max(0, Math.floor(clamp01(lum) * 9 + threshold)))
          tint[i] = tintOut
        }
      }

      ctx.clearRect(0, 0, w, h)
      ctx.font = `${fs}px ${MONO}`
      ctx.textBaseline = 'top'
      for (let tn = 0; tn < 3; tn += 1) {
        const [r, g, b] = TINTS[tn]
        for (let level = 1; level < 10; level += 1) {
          ctx.fillStyle = `rgba(${r},${g},${b},${0.12 + 0.065 * level})`
          for (let i = 0; i < grid.length; i += 1) {
            if (grid[i] === level && tint[i] === tn) {
              ctx.fillText(RAMP[level], (i % cols) * cw, Math.floor(i / cols) * ch)
            }
          }
        }
      }

      // Birds
      ctx.fillStyle = 'rgba(255, 236, 214, 0.8)'
      BIRDS.forEach((bird, i) => {
        const x = ((((t * bird.speed + bird.offset) % 1.2) + 1.2) % 1.2) - 0.1
        const y = bird.y + 0.012 * Math.sin(t * 2 + i)
        const glyph = Math.sin(t * 6 + i * 2) > 0 ? 'v' : '^'
        ctx.fillText(glyph, x * w, y * h)
      })
    }

    const resize = () => {
      const rect = host.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = Math.max(1, rect.width)
      h = Math.max(1, rect.height)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      fs = w < 600 ? 11 : 13
      cw = fs * 0.6
      ch = fs * 1.15
      cols = Math.ceil(w / cw)
      rows = Math.ceil(h / ch)
      grid = new Uint8Array(cols * rows)
      tint = new Uint8Array(cols * rows)
      draw(reduced ? 1.5 : performance.now() / 1000)
    }

    const loop = (ts) => {
      raf = requestAnimationFrame(loop)
      if (!visible || ts - last < 80) return
      last = ts
      par += (parTarget - par) * 0.12
      draw(ts / 1000)
    }

    const onPointer = (e) => {
      parTarget = (e.clientX / window.innerWidth - 0.5) * 2
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    resize()

    let intersectionObserver
    if (!reduced) {
      intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting
      })
      intersectionObserver.observe(host)
      window.addEventListener('pointermove', onPointer)
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      if (intersectionObserver) intersectionObserver.disconnect()
      window.removeEventListener('pointermove', onPointer)
    }
  }, [])

  return <canvas ref={canvasRef} className="ascii-bg" aria-hidden="true" />
}
