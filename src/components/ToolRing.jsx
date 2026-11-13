import { useCallback, useEffect, useRef, useState } from 'react'
import { RING as TOOLS } from '../data/content'
import { ArrowLeft, ArrowRight } from './Icons'
import './ToolRing.css'

const N = TOOLS.length
const STEP = 360 / N
const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
// Angle into -180..180
const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180

/*
  The tools on a 3D ring. Drag it (with inertia), use the arrows or the keyboard;
  it drifts on its own and turns a little as the page scrolls past.
  Everything per-frame is written straight to the DOM; React only hears about
  which card is at the front.
*/
export default function ToolRing() {
  const stageRef = useRef(null)
  const ringRef = useRef(null)
  const cardRefs = useRef([])
  const api = useRef({ go: () => {} })
  const [front, setFront] = useState(0)

  // True only when the last press turned into a drag, so the click after it is ignored.
  const dragged = useRef(false)

  useEffect(() => {
    const stage = stageRef.current
    const ring = ringRef.current
    const reduced = prefersReduced()
    const AUTO = -11 // degrees per second when idle: a new card comes round every ~2.3 s
    let theta = 0
    let vel = 0 // degrees per second
    let target = null
    let drag = null
    let inView = false
    let raf = 0
    let last = 0
    let lastFront = -1
    let lastY = window.scrollY
    let radius = 0

    const measure = () => {
      const card = cardRefs.current[0]
      if (!card) return
      const w = card.offsetWidth
      const gap = w * 0.1
      radius = Math.round((w / 2 + gap) / Math.tan(Math.PI / N))
      ring.style.setProperty('--radius', `${radius}px`)
    }

    const render = () => {
      ring.style.transform = `translateZ(${-radius}px) rotateX(-7deg) rotateY(${theta}deg)`
      let best = 0
      let bestA = 999
      cardRefs.current.forEach((card, i) => {
        if (!card) return
        const a = wrap(i * STEP + theta)
        // Only touch the style when the value really changes, to keep each frame cheap.
        const facing = Math.max(0, Math.cos((a * Math.PI) / 180)).toFixed(2)
        if (card.dataset.facing !== facing) {
          card.dataset.facing = facing
          card.style.setProperty('--facing', facing)
        }
        if (Math.abs(a) < bestA) {
          bestA = Math.abs(a)
          best = i
        }
      })
      if (best !== lastFront) {
        lastFront = best
        setFront(best)
      }
    }

    const snap = () => {
      vel = 0
      target = Math.round(theta / STEP) * STEP
    }

    // Everything runs on real time, so it moves the same at 60 or 144 frames a second.
    const frame = (now) => {
      raf = 0
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
      last = now
      if (!drag) {
        if (target !== null) {
          theta += (target - theta) * (1 - Math.exp(-dt * 9))
          if (Math.abs(target - theta) < 0.03) {
            theta = target
            target = null
          }
        } else if (Math.abs(vel) > 2) {
          theta += vel * dt
          vel *= Math.exp(-dt * 3.2)
          if (Math.abs(vel) <= 2) snap() // settle on the nearest card
        } else if (!reduced) {
          theta += AUTO * dt // the same speed wherever the cursor is
        }
      }
      render()
      if (inView) raf = requestAnimationFrame(frame)
      else last = 0
    }

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }

    const jump = (to) => {
      vel = 0
      target = to
      if (reduced) {
        theta = target
        target = null
        render()
      } else kick()
    }

    // Arrows and keys: step to the next / previous card. Clicking a card brings it round.
    api.current.go = (dir) => jump((target ?? Math.round(theta / STEP) * STEP) - dir * STEP)
    api.current.to = (i) => jump(theta - wrap(i * STEP + theta))

    const sens = () => 180 / Math.max(500, stage.offsetWidth)

    const onDown = (e) => {
      if (e.button !== 0) return
      dragged.current = false
      drag = { x: e.clientX, theta, samples: [{ x: e.clientX, t: performance.now() }] }
      target = null
      vel = 0
      // No pointer capture: window listeners follow the drag anywhere, and a plain click
      // still reaches the card under the pointer.
      stage.classList.add('is-dragging')
      kick()
    }
    const onMove = (e) => {
      if (!drag) return
      const dx = e.clientX - drag.x
      if (Math.abs(dx) > 5) dragged.current = true
      theta = drag.theta + dx * sens()
      const now = performance.now()
      drag.samples.push({ x: e.clientX, t: now })
      while (drag.samples.length > 2 && now - drag.samples[0].t > 100) drag.samples.shift()
      if (reduced) render()
      else kick()
    }
    const onUp = () => {
      if (!drag) return
      // Fling speed from the last 100 ms of movement; a pause before letting go means no fling.
      const now = performance.now()
      const recent = drag.samples.filter((p) => now - p.t < 100)
      vel = 0
      if (recent.length >= 2) {
        const a = recent[0]
        const b = recent[recent.length - 1]
        if (b.t > a.t) vel = (((b.x - a.x) / (b.t - a.t)) * 1000 * sens())
      }
      vel = Math.max(-720, Math.min(720, vel))
      drag = null
      stage.classList.remove('is-dragging')
      if (reduced || Math.abs(vel) < 20) {
        if (reduced) {
          theta = Math.round(theta / STEP) * STEP
          render()
        } else snap()
      }
      kick()
    }

    // Scrolling past gives the ring a gentle push, which then settles like any other spin.
    const onScroll = () => {
      const y = window.scrollY
      const dy = y - lastY
      lastY = y
      if (!inView || reduced || drag) return
      target = null
      vel = Math.max(-320, Math.min(320, vel - dy * 0.8))
      kick()
    }

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      if (inView) kick()
    })
    io.observe(stage)

    const ro = new ResizeObserver(() => {
      measure()
      render()
    })
    ro.observe(stage)

    measure()
    render()
    stage.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('blur', onUp)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      stage.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', onUp)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const onKey = useCallback((e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      api.current.go(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      api.current.go(-1)
    }
  }, [])

  const tool = TOOLS[front]

  return (
    <div className="toolring">
      <div
        className="toolring__stage"
        ref={stageRef}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Tools I use. Drag, or use the left and right arrow keys."
        onKeyDown={onKey}
      >
        <ul className="toolring__ring" ref={ringRef}>
          {TOOLS.map((t, i) => (
            <li
              key={t.name}
              className={`tool${i === front ? ' is-front' : ''}`}
              ref={(el) => {
                cardRefs.current[i] = el
              }}
              style={{ '--i': i, '--angle': `${i * STEP}deg`, '--brand': t.colour || '#b4d2e7' }}
              onClick={() => {
                if (!dragged.current) api.current.to(i)
              }}
            >
              <div className="tool__face tool__face--front">
                <span className="tool__index">{String(i + 1).padStart(2, '0')}</span>
                {t.aws ? (
                  <svg className="tool__aws" viewBox="0 0 64 64" aria-hidden="true">
                    <use href={`#${t.aws}`} />
                  </svg>
                ) : (
                  <span className="tool__icon" style={{ '--icon': `url(/icons/${t.icon}.svg)` }} aria-hidden="true" />
                )}
                <div className="tool__words">
                  <h3>{t.name}</h3>
                  <p>{t.use}</p>
                </div>
              </div>
              <div className="tool__face tool__face--back" aria-hidden="true">
                <span className="tool__ghost">{t.name}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="toolring__floor" aria-hidden="true" />
      </div>

      <div className="toolring__bar">
        <button type="button" className="toolring__btn" onClick={() => api.current.go(-1)} aria-label="Previous tool">
          <ArrowLeft />
        </button>
        <p className="toolring__now">
          <span className="toolring__count">
            {String(front + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
          </span>
          <span key={tool.name} className="toolring__name">
            {tool.name} <span className="toolring__use">{tool.use}</span>
          </span>
        </p>
        <button type="button" className="toolring__btn" onClick={() => api.current.go(1)} aria-label="Next tool">
          <ArrowRight />
        </button>
      </div>
    </div>
  )
}
