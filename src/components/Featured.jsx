import { useEffect, useRef, useState } from 'react'
import { AGENT_ID, AGENT_TEASER } from '../data/content'
import { routeLink } from '../router'
import { ArrowRight } from './Icons'
import './Featured.css'

/*
  The analytics agent, told as a pinned story. As the section scrolls past, the product window
  morphs through three states: Ask -> Reason -> Answer. The question is one element
  that travels between them; everything else reshapes around it.
*/

function useTyped(text, active) {
  const [n, setN] = useState(0)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(() => {
    if (!active || reduced) return undefined
    let i = -1
    const id = setInterval(() => {
      i += 1
      setN(i)
      if (i >= text.length) clearInterval(id)
    }, 30)
    return () => clearInterval(id)
  }, [text, active, reduced])
  return reduced ? text : text.slice(0, n)
}

function AppFrame({ step, live }) {
  const d = AGENT_TEASER.demo
  const typed = useTyped(d.question, live && step === 0)
  const max = Math.max(...d.bars.map((b) => b.value))

  return (
    <div className="app-frame" data-step={step}>
      <div className="app-frame__bar">
        <span className="app-frame__lights" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="app-frame__title">{d.window}</span>
        <span className="app-frame__state">{['Listening', 'Reasoning', 'Answered'][step]}</span>
      </div>

      <div className="app-frame__body">
        <div className="af-question">
          <p>
            {step === 0 ? typed : d.question}
            {step === 0 && <span className="af-caret" />}
          </p>
        </div>

        <div className="af-pane af-pane--ask">
          <p className="af-hello">
            What do you want
            <br />
            to know?
          </p>
          <div className="af-chips">
            {d.suggestions.map((s) => (
              <span key={s} className="af-chip">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="af-pane af-pane--reason">
          <ol className="af-plan">
            {d.plan.map((p, i) => (
              <li key={p.node} style={{ '--i': i }}>
                <span className="af-tick" aria-hidden="true" />
                <code>{p.node}</code>
                <span>{p.note}</span>
              </li>
            ))}
          </ol>
          <div className="af-code">
            <span className="af-code__head">Semantic query · no SQL from the model</span>
            <pre>
              {d.query.map((line, i) => (
                <code key={i} style={{ '--i': i }}>
                  {line}
                </code>
              ))}
            </pre>
          </div>
        </div>

        <div className="af-pane af-pane--answer">
          <div className="af-chart">
            {d.bars.map((b, i) => (
              <div key={b.label} className="af-bar" style={{ '--h': b.value / max, '--i': i }} data-hot={b.hot || undefined}>
                <span className="af-bar__value">{b.display}</span>
                <span className="af-bar__fill" />
                <span className="af-bar__label">{b.label}</span>
              </div>
            ))}
          </div>
          <div className="af-insight">
            <p>{d.insight}</p>
            <div className="af-insight__meta">
              <span>Every figure checked against the result</span>
              <span>Query attached</span>
              <span>Illustrative data</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Featured() {
  const ref = useRef(null)
  const [step, setStep] = useState(0)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.2 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const el = ref.current
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const span = r.height - window.innerHeight
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, span)))
      el.style.setProperty('--fp', p.toFixed(4))
      setStep(p < 0.34 ? 0 : p < 0.67 ? 1 : 2)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <section
      id="featured"
      ref={ref}
      className="featured"
      aria-labelledby="featured-title"
      data-shape="dust"
      data-pos="0 0 1 0.22"
      data-pos-m="0 0 1 0.3"
    >
      <div className="featured__sticky">
        <div className="wrap featured__grid">
          <div className="featured__text">
            <span className="label">Selected work · 01</span>
            <h2 id="featured-title" className="featured__title">
              {AGENT_TEASER.title}
            </h2>
            <p className="featured__tagline">{AGENT_TEASER.tagline}</p>

            <ol className="featured__steps">
              {AGENT_TEASER.steps.map((s, i) => (
                <li key={s.label} className={i === step ? 'is-active' : i < step ? 'is-done' : ''}>
                  <span className="featured__step-num">0{i + 1}</span>
                  <div>
                    <h3>
                      {s.label} <span>— {s.title}</span>
                    </h3>
                    <p>{s.body}</p>
                  </div>
                  <span className="featured__step-bar" aria-hidden="true" />
                </li>
              ))}
            </ol>

            <a className="btn btn--quiet featured__cta" href={`#/work/${AGENT_ID}`} onClick={routeLink} data-cursor="Read">
              Read the case study
              <ArrowRight />
            </a>
          </div>

          <div className="featured__visual">
            <AppFrame step={step} live={live} />
          </div>
        </div>
      </div>
    </section>
  )
}
