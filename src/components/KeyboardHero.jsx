import { useCallback, useEffect, useRef, useState } from 'react'
import './KeyboardHero.css'

// ---- Content: edit these to change the hero --------------------------------
const INTRO = "Hello, I'm Krish"
const DEFAULT_NOTE = 'Press a key, or type on yours.'
const MAX_CHARS = 20

// Each key types its letter and shows its note on the display.
const ROW_ONE = [
  { id: 'k', char: 'K', note: 'About me', tone: 'orange' },
  { id: 'r', char: 'R', note: 'Resume', tone: 'rust' },
  { id: 'i', char: 'I', note: 'Ideas', tone: 'cream' },
  { id: 's', char: 'S', note: 'Skills', tone: 'green' },
  { id: 'h', char: 'H', note: 'Say hi', tone: 'green' },
]

const ROW_TWO = [
  { id: 'c', char: 'C', note: 'Case studies', tone: 'pink' },
  { id: 'o', char: 'O', note: 'Open source', tone: 'rust' },
  { id: 'd', char: 'D', note: 'Design', tone: 'orange' },
  { id: 'e', char: 'E', note: 'Experience', tone: 'amber' },
]

const CLEAR_KEY = { id: 'clear', char: '✦', note: 'Reset', tone: 'pink', action: 'clear' }

const BY_LETTER = Object.fromEntries([...ROW_ONE, ...ROW_TWO].map((key) => [key.char, key]))
// -----------------------------------------------------------------------------

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Each typed character gets an id so only the new one plays its "strike" animation.
const introChars = () => INTRO.split('').map((ch, i) => ({ id: -i - 1, ch }))

function Screws() {
  return (
    <>
      <span className="screw screw--tl" />
      <span className="screw screw--tr" />
      <span className="screw screw--bl" />
      <span className="screw screw--br" />
    </>
  )
}

function Key({ keyData, index, pressed, onActivate, onPress }) {
  return (
    <button
      type="button"
      className={`key key--${keyData.tone}`}
      style={{ '--i': index }}
      data-pressed={pressed}
      aria-label={`${keyData.char === '✦' ? 'Reset display' : keyData.char}: ${keyData.note}`}
      onClick={() => onActivate(keyData)}
      onPointerDown={() => onPress(keyData.id, true)}
      onPointerUp={() => onPress(keyData.id, false)}
      onPointerLeave={() => onPress(keyData.id, false)}
      onPointerCancel={() => onPress(keyData.id, false)}
    >
      <span className="key__char" aria-hidden="true">
        {keyData.char}
      </span>
      <span className="key__note" aria-hidden="true">
        {keyData.note}
      </span>
    </button>
  )
}

/*
  The 3D keyboard, shown as a live demo inside its project dialog.
  onEnter: called by the "Let's talk" key (the dialog closes and jumps to contact).
*/
export default function KeyboardHero({ revealed = true, onEnter }) {
  const [chars, setChars] = useState(() => (prefersReducedMotion() ? introChars() : []))
  const [note, setNote] = useState(DEFAULT_NOTE)
  const [pressed, setPressed] = useState(() => new Set())
  const [run, setRun] = useState(0)
  const introActive = useRef(true)
  const nextId = useRef(0)
  const tiltRef = useRef(null)

  const addChar = useCallback((ch) => {
    const id = nextId.current
    nextId.current += 1
    setChars((prev) => [...prev, { id, ch }].slice(-MAX_CHARS))
  }, [])

  // Types the intro line once the page has revealed (and again after a reset), with
  // human-ish timing. It waits for the keys to finish dropping in.
  useEffect(() => {
    if (prefersReducedMotion() || !revealed) return undefined
    introActive.current = true
    let timer
    let i = 0
    const step = () => {
      if (!introActive.current) return
      const ch = INTRO[i]
      addChar(ch)
      i += 1
      if (i < INTRO.length) {
        const delay = ch === ',' ? 260 : ch === ' ' ? 130 : 45 + Math.random() * 75
        timer = setTimeout(step, delay)
      }
    }
    const start = setTimeout(step, run === 0 ? 1700 : 300)
    return () => {
      clearTimeout(start)
      clearTimeout(timer)
    }
  }, [run, addChar, revealed])

  const press = useCallback((id, isDown) => {
    setPressed((prev) => {
      const next = new Set(prev)
      if (isDown) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const activate = useCallback(
    (keyData) => {
      introActive.current = false
      if (keyData.action === 'clear') {
        setChars(prefersReducedMotion() ? introChars() : [])
        setNote('Display reset')
        setRun((r) => r + 1)
        return
      }
      addChar(keyData.char)
      setNote(`${keyData.char} · ${keyData.note}`)
    },
    [addChar],
  )

  // Physical keyboard: letters press the matching keycap, Backspace deletes.
  useEffect(() => {
    const isFormField = (el) =>
      el instanceof HTMLElement &&
      (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isFormField(e.target)) return
      if (e.key === 'Backspace') {
        introActive.current = false
        setChars((prev) => prev.slice(0, -1))
        return
      }
      if (e.key.length !== 1) return
      const keyData = BY_LETTER[e.key.toUpperCase()]
      if (!keyData) return
      activate(keyData)
      press(keyData.id, true)
    }

    const onKeyUp = (e) => {
      if (e.key.length !== 1) return
      const keyData = BY_LETTER[e.key.toUpperCase()]
      if (keyData) press(keyData.id, false)
    }

    const onBlur = () => setPressed(new Set())

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [activate, press])

  // 3D tilt: the device leans toward the pointer. Skipped on touch and reduced motion.
  useEffect(() => {
    const el = tiltRef.current
    if (!el || prefersReducedMotion() || window.matchMedia('(hover: none)').matches) {
      return undefined
    }
    let raf = 0
    let nx = 0.5
    let ny = 0.5
    const apply = () => {
      raf = 0
      el.style.setProperty('--ry', `${((nx - 0.5) * 18).toFixed(2)}deg`)
      el.style.setProperty('--rx', `${(14 + (0.5 - ny) * 12).toFixed(2)}deg`)
    }
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(apply)
    }
    const onMove = (e) => {
      nx = e.clientX / window.innerWidth
      ny = e.clientY / window.innerHeight
      queue()
    }
    const onLeave = () => {
      nx = 0.5
      ny = 0.5
      queue()
    }
    window.addEventListener('pointermove', onMove)
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  const keyProps = (keyData, index) => ({
    keyData,
    index,
    pressed: pressed.has(keyData.id),
    onActivate: activate,
    onPress: press,
  })

  const lastId = chars.length ? chars[chars.length - 1].id : 'empty'

  const device = (
      <div className="device" role="group" aria-label="Interactive keyboard">
        <div className="device__tilt" ref={tiltRef}>
          <div className="panel device__lid">
            <Screws />
            <div className="screen">
              <div className="screen__meta" aria-hidden="true">
                <span>PORTFOLIO / 2026</span>
                <span>ONLINE</span>
              </div>
              <p className="screen__text" aria-hidden="true">
                {chars.map((c) => (
                  <span key={c.id} className="ch">
                    {c.ch}
                  </span>
                ))}
                <span className="cursor" />
              </p>
              <p className="screen__note" aria-live="polite">
                {note}
              </p>
              <span key={lastId} className="screen__flash" aria-hidden="true" />
            </div>
          </div>

          <div className="device__hinge" aria-hidden="true" />

          <div className="panel device__base">
            <Screws />
            <div className="keybed">
              <div className="row row--one">
                {ROW_ONE.map((keyData, i) => (
                  <Key key={keyData.id} {...keyProps(keyData, i)} />
                ))}
              </div>
              <div className="row row--two">
                {ROW_TWO.map((keyData, i) => (
                  <Key key={keyData.id} {...keyProps(keyData, i + ROW_ONE.length)} />
                ))}
                <Key {...keyProps(CLEAR_KEY, ROW_ONE.length + ROW_TWO.length)} />
                <a
                  className="key key--dark key--enter"
                  href="#contact"
                  style={{ '--i': ROW_ONE.length + ROW_TWO.length + 1 }}
                  aria-label="Let's talk: jump to contact"
                  onClick={(e) => {
                    if (!onEnter) return
                    e.preventDefault()
                    onEnter()
                  }}
                >
                  <span className="key__char" aria-hidden="true">
                    ↵
                  </span>
                  <span className="key__note" aria-hidden="true">
                    Let&apos;s talk
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
  )

  return device
}
