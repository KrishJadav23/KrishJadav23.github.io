import { useEffect, useRef } from 'react'
import { ABOUT, FACTS } from '../data/content'
import './About.css'

// "*word*" marks a word for the serif.
const WORDS = ABOUT.split(' ').map((raw) => {
  const serif = raw.startsWith('*')
  return { text: raw.replace(/\*/g, ''), serif }
})

/*
  The statement stays pinned while its section scrolls past, and lights up word by
  word as you read down. Only one CSS variable (--p) changes on scroll.
*/
export default function About() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.setProperty('--p', '1')
      return undefined
    }
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const p = Math.min(1, Math.max(0, (vh * 0.55 - r.top) / (r.height - vh * 0.6)))
      el.style.setProperty('--p', p.toFixed(4))
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
      id="about"
      className="about"
      ref={ref}
      aria-labelledby="about-title"
      data-shape="brain"
      data-pos="3.2 0 1.15 0.3"
      data-pos-m="0 1.8 0.6 0.25"
    >
      <div className="about__sticky">
        <div className="wrap about__inner">
          <span className="eyebrow">About</span>
          <h2 id="about-title" className="sr-only">
            About me
          </h2>
          <p className="about__text">
            {WORDS.map((w, i) => (
              <span
                key={i}
                className={`about__w${w.serif ? ' serif' : ''}`}
                style={{ '--w': (i / WORDS.length).toFixed(4) }}
              >
                {w.text}{' '}
              </span>
            ))}
          </p>

          <dl className="about__facts">
            {FACTS.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
