import { useEffect, useRef } from 'react'
import './MorphText.css'

const MORPH = 1.1 // seconds spent melting from one word to the next
const HOLD = 2.4 // seconds each word rests

/*
  Liquid word morph. Two copies of the text blur into each other while an SVG
  threshold filter re-sharpens the result, so letters melt and re-form like
  liquid instead of cross-fading. Screen readers get the list once.
*/
export default function MorphText({ words, start = true }) {
  const aRef = useRef(null)
  const bRef = useRef(null)
  const sizerRef = useRef(null)

  useEffect(() => {
    const a = aRef.current
    const b = bRef.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    a.textContent = words[0]
    b.textContent = words[1 % words.length]
    b.style.opacity = '0'
    if (!start || reduced || words.length < 2) return undefined

    let index = 0
    let morph = 0
    let hold = HOLD
    let last = performance.now()
    let raf = 0

    const set = (fraction) => {
      b.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`
      b.style.opacity = `${fraction ** 0.4 * 100}%`
      const inv = 1 - fraction
      a.style.filter = `blur(${Math.min(8 / inv - 8, 100)}px)`
      a.style.opacity = `${inv ** 0.4 * 100}%`
    }

    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (hold > 0) {
        hold -= dt
        if (hold <= 0) morph = 0
        return
      }
      morph += dt
      const f = Math.min(1, morph / MORPH)
      set(f)
      if (f >= 1) {
        index = (index + 1) % words.length
        a.textContent = words[index]
        b.textContent = words[(index + 1) % words.length]
        a.style.filter = ''
        a.style.opacity = '100%'
        b.style.filter = ''
        b.style.opacity = '0%'
        hold = HOLD
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [words, start])

  const longest = words.reduce((x, y) => (y.length > x.length ? y : x), '')

  return (
    <span className="morph">
      <span className="sr-only">{words.join(', ')}</span>
      <span className="morph__stage" aria-hidden="true">
        <span className="morph__sizer" ref={sizerRef}>
          {longest}
        </span>
        <span className="morph__word" ref={aRef} />
        <span className="morph__word" ref={bRef} />
      </span>
      <svg className="morph__defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id="morph-threshold">
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140" />
          </filter>
        </defs>
      </svg>
    </span>
  )
}
