import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SITE } from '../data/content'
import { ArrowUpRight, GitHub } from './Icons'
import './Island.css'

const LINKS = [
  { id: 'featured', label: 'Featured' },
  { id: 'work', label: 'Projects' },
  { id: 'toolbox', label: 'Toolbox' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
]

/*
  A "dynamic island": a small pill that names the section you're in, and morphs
  open into the full menu. Its size springs between the two panels' measured sizes.
*/
export default function Island() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('Index')
  const [size, setSize] = useState(null)
  const shellRef = useRef(null)
  const smallRef = useRef(null)
  const bigRef = useRef(null)
  const buttonRef = useRef(null)

  // Which section is in the middle of the screen.
  useEffect(() => {
    const all = [{ id: 'top', label: 'Index' }, ...LINKS]
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const hit = all.find((l) => l.id === entry.target.id)
            if (hit) setActive(hit.label)
          }
        }
      },
      { rootMargin: '-48% 0px -50% 0px' },
    )
    all.forEach((l) => {
      const el = document.getElementById(l.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  // Measure whichever panel is showing; the shell springs to that size.
  useLayoutEffect(() => {
    const measure = () => {
      const el = open ? bigRef.current : smallRef.current
      if (el) setSize({ w: el.offsetWidth, h: el.offsetHeight })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (smallRef.current) ro.observe(smallRef.current)
    if (bigRef.current) ro.observe(bigRef.current)
    return () => ro.disconnect()
  }, [open, active])

  // Escape and clicks outside close it.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const onDown = (e) => {
      if (!shellRef.current?.contains(e.target)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <header className="island-wrap">
      <div
        ref={shellRef}
        className={`island${open ? ' island--open' : ''}`}
        style={size ? { width: size.w, height: size.h } : undefined}
      >
        {/* Collapsed */}
        <div className="island__small" ref={smallRef} inert={open}>
          <a className="island__brand" href="#top" aria-label={`${SITE.name}, back to top`}>
            <svg className="island__ring" viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r="15" />
              <circle className="island__ring-fill" cx="18" cy="18" r="15" pathLength="1" />
            </svg>
            <span className="island__mono">KJ</span>
          </a>
          <span className="island__label" aria-live="off">
            <span key={active}>{active}</span>
          </span>
          <button
            ref={buttonRef}
            type="button"
            className="island__toggle"
            aria-expanded={open}
            aria-controls="island-menu"
            onClick={() => setOpen(true)}
          >
            <span className="sr-only">Open menu</span>
            <span className="island__bars" aria-hidden="true" />
          </button>
        </div>

        {/* Expanded */}
        <div className="island__big" id="island-menu" ref={bigRef} inert={!open}>
          <div className="island__top">
            <span className="island__who">
              <span className="island__status" aria-hidden="true" />
              {SITE.name} · {SITE.role}
            </span>
            <button type="button" className="island__close" onClick={() => setOpen(false)} aria-label="Close menu">
              <span className="island__x" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Primary">
            <ul className="island__links">
              {LINKS.map((l, i) => (
                <li key={l.id} style={{ '--i': i }}>
                  <a href={`#${l.id}`} onClick={() => setOpen(false)}>
                    <span className="island__num">0{i + 1}</span>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="island__foot">
            <a className="island__chip" href={SITE.github} target="_blank" rel="noreferrer">
              <GitHub />
              GitHub
              <ArrowUpRight />
            </a>
            {SITE.available && <span className="island__avail">Open to new work</span>}
          </div>
        </div>
      </div>
    </header>
  )
}
