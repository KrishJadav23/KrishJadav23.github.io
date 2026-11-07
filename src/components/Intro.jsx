import { useCallback, useEffect, useRef, useState } from 'react'
import './Intro.css'

/*
  The opening. The particle field (behind) gathers from dust into the name while a
  loader counts to 100; then the name dissolves into the brain and the page opens.
  This overlay only holds the readout, so the particles are the show.
  - onReveal: the moment the page should start entering
  - onDone: the overlay can be removed
  Click, Escape or Enter skips it.
*/
const STEPS = ['Spawning particles', 'Sampling the name', 'Training the brain', 'Ready']

export default function Intro({ onReveal, onDone }) {
  const [count, setCount] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const leavingRef = useRef(false)

  const leave = useCallback(() => {
    if (leavingRef.current) return
    leavingRef.current = true
    setLeaving(true)
    onReveal()
  }, [onReveal])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // 0 -> 100, eased, then hold on the name for a beat.
  useEffect(() => {
    const delay = 300
    const duration = 2600
    const start = performance.now()
    let raf = 0
    let timer = 0
    const tick = (now) => {
      const p = Math.min(1, Math.max(0, (now - start - delay) / duration))
      setCount(Math.round((1 - (1 - p) ** 2.4) * 100))
      if (p < 1) raf = requestAnimationFrame(tick)
      else timer = setTimeout(leave, 650)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [leave])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') leave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [leave])

  useEffect(() => {
    if (!leaving) return undefined
    const id = setTimeout(onDone, 900)
    return () => clearTimeout(id)
  }, [leaving, onDone])

  const step = STEPS[Math.min(STEPS.length - 1, Math.floor(count / 34))]

  return (
    <div className={`intro${leaving ? ' intro--out' : ''}`} onClick={leave} role="presentation">
      <p className="sr-only">Loading Krish Jadav&apos;s portfolio</p>
      <div className="intro__corner intro__corner--tl" aria-hidden="true">
        <span className="intro__dot" />
        KJ / Portfolio
      </div>
      <div className="intro__corner intro__corner--tr" aria-hidden="true">
        AI Product Engineer
      </div>

      <div className="intro__readout" aria-hidden="true">
        <p className="intro__step" key={step}>
          {step}
          <span className="intro__ellipsis" />
        </p>
        <p className="intro__count">
          {String(count).padStart(3, '0')}
          <span>%</span>
        </p>
      </div>
      <p className="intro__hint" aria-hidden="true">
        Click to skip
      </p>
      <div className="intro__bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${count / 100})` }} />
      </div>
    </div>
  )
}
