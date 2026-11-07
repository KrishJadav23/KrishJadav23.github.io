import { useCallback, useEffect, useRef, useState } from 'react'
import { TOOLS } from '../data/content'
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

  useEffect(() => {
    const stage = stageRef.current
    const ring = ringRef.current
    const reduced = prefersReduced()
    let theta = 0
    let vel = 0
    let target = null
    let drag = null
    let hover = false
    let inView = false
    let raf = 0
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
        const facing = Math.max(0, Math.cos((a * Math.PI) / 180))
        card.style.setProperty('--facing', facing.toFixed(3))
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

    const frame = () => {
      raf = 0
      if (!drag) {
        if (target !== null) {
          theta += (target - theta) * 0.11
          if (Math.abs(target - theta) < 0.05) {
            theta = target
            target = null
          }
        } else if (Math.abs(vel) > 0.01) {
          theta += vel
          vel *= 0.94
          // Settle on the nearest card once it slows down.
          if (Math.abs(vel) < 0.15) {
            vel = 0
            target = Math.round(theta / STEP) * STEP
          }
        } else if (!hover && !reduced) {
          theta -= 0.045
        }
      }
      render()
      if (inView) raf = requestAnimationFrame(frame)
    }

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }

    // Arrows and keys: step to the next / previous card.
    api.current.go = (dir) => {
      const base = target ?? Math.round(theta / STEP) * STEP
      vel = 0
      target = base - dir * STEP
      if (reduced) {
        theta = target
        target = null
        render()
      } else kick()
    }
    api.current.to = (i) => {
      const a = wrap(i * STEP + theta)
      vel = 0
      target = theta - a
      if (reduced) {
        theta = target
        target = null
        render()
      } else kick()
    }

    const onDown = (e) => {
      if (e.button !== 0) return
      drag = { x: e.clientX, theta, t: performance.now(), lastX: e.clientX, moved: 0 }
      target = null
      vel = 0
      stage.classList.add('is-dragging')
    }
    const onMove = (e) => {
      if (!drag) return
      const dx = e.clientX - drag.x
      drag.moved = Math.max(drag.moved, Math.abs(dx))
      if (drag.moved > 4 && !stage.hasPointerCapture(e.pointerId)) stage.setPointerCapture(e.pointerId)
      const now = performance.now()
      const sens = 180 / Math.max(500, stage.offsetWidth)
      theta = drag.theta + dx * sens
      const dt = Math.max(1, now - drag.t)
      vel = ((e.clientX - drag.lastX) * sens * 16) / dt
      drag.lastX = e.clientX
      drag.t = now
      if (reduced) render()
      else kick()
    }
    const onUp = () => {
      if (!drag) return
      const wasDrag = drag.moved > 4
      drag = null
      stage.classList.remove('is-dragging')
      if (wasDrag) {
        // Swallow the click that follows a drag.
        stage.addEventListener('click', (ev) => ev.stopPropagation(), { capture: true, once: true })
      }
      if (reduced) {
        theta = Math.round(theta / STEP) * STEP
        render()
      } else {
        vel = Math.max(-6, Math.min(6, vel))
        kick()
      }
    }

    const onScroll = () => {
      const y = window.scrollY
      const dy = y - lastY
      lastY = y
      if (!inView || reduced || drag) return
      theta -= dy * 0.06
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

    const enter = () => {
      hover = true
    }
    const leave = () => {
      hover = false
    }

    measure()
    render()
    stage.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    stage.addEventListener('pointerenter', enter)
    stage.addEventListener('pointerleave', leave)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      stage.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      stage.removeEventListener('pointerenter', enter)
      stage.removeEventListener('pointerleave', leave)
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
              style={{ '--i': i, '--angle': `${i * STEP}deg`, '--brand': t.colour }}
              onClick={() => api.current.to(i)}
            >
              <div className="tool__face tool__face--front">
                <span className="tool__index">{String(i + 1).padStart(2, '0')}</span>
                <span className="tool__icon" style={{ '--icon': `url(/icons/${t.icon}.svg)` }} aria-hidden="true" />
                <div className="tool__words">
                  <h3>{t.name}</h3>
                  <p>{t.use}</p>
                </div>
              </div>
              <div className="tool__face tool__face--back" aria-hidden="true">
                <span className="tool__icon tool__icon--ghost" style={{ '--icon': `url(/icons/${t.icon}.svg)` }} />
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
