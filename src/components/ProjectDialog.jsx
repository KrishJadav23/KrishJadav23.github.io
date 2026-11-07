import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react'
import { ArrowUpRight, Close, Code } from './Icons'
import ProjectArt from './ProjectArt'
import './ProjectDialog.css'

// Live demos load only when their project is opened.
const KeyboardHero = lazy(() => import('./KeyboardHero'))
const AsciiBackground = lazy(() => import('./AsciiBackground'))
const NightScene = lazy(() => import('./NightScene'))

function Demo({ project, onEnter }) {
  if (project.demo === 'keyboard') {
    return (
      <div className="pd__demo pd__demo--keyboard">
        <KeyboardHero onEnter={onEnter} />
        <p className="pd__hint">Click the keys, or type K R I S H C O D E on your keyboard.</p>
      </div>
    )
  }
  if (project.demo === 'ascii') {
    return (
      <div className="pd__demo pd__demo--ascii">
        <AsciiBackground />
      </div>
    )
  }
  if (project.demo === 'scene') {
    return (
      <div className="pd__demo pd__demo--scene">
        <NightScene revealed contained />
      </div>
    )
  }
  return (
    <div className="pd__demo pd__demo--art">
      <ProjectArt project={project} />
    </div>
  )
}

/*
  A native <dialog>: focus is trapped, Escape closes, and the page behind is inert.
  It plays a short exit before actually closing.
*/
export default function ProjectDialog({ project, index, onClose }) {
  const ref = useRef(null)
  const [closing, setClosing] = useState(false)
  // Keep showing the last project while the exit plays.
  const [shown, setShown] = useState(project)
  if (project && project !== shown) setShown(project)

  // Layout effect: the window must be open in the same commit, so a view transition can capture it.
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (project && !dialog.open) {
      dialog.showModal()
      // Start on the close button (a scrollable panel would otherwise take focus).
      dialog.querySelector('.pd__close')?.focus({ preventScroll: true })
      document.documentElement.classList.add('has-dialog')
    }
  }, [project])

  const close = (after) => {
    const dialog = ref.current
    if (!dialog || closing) return
    setClosing(true)
    setTimeout(() => {
      dialog.close()
      document.documentElement.classList.remove('has-dialog')
      setClosing(false)
      setShown(null)
      onClose()
      if (typeof after === 'function') after()
    }, 280)
  }

  const p = shown
  const num = String(index + 1).padStart(2, '0')

  return (
    <dialog
      ref={ref}
      className={`pd${closing ? ' pd--closing' : ''}`}
      aria-labelledby="pd-title"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        // A click on the backdrop (the dialog element itself) closes it.
        if (e.target === e.currentTarget) close()
      }}
    >
      {p && (
        <div className="pd__panel">
          <button type="button" className="pd__close" onClick={close} aria-label="Close project">
            <Close />
          </button>

          <Suspense fallback={<div className="pd__demo pd__demo--loading" />}>
            <Demo
              project={p}
              onEnter={() =>
                close(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }))
              }
            />
          </Suspense>

          <div className="pd__body">
            <div className="pd__head">
              <span className="pd__num">{num}</span>
              <div>
                <p className="pd__kind">
                  {p.kind} · {p.year}
                </p>
                <h2 id="pd-title">{p.title}</h2>
              </div>
            </div>

            <div className="pd__text">
              {p.body.map((para) => (
                <p key={para.slice(0, 24)}>{para}</p>
              ))}

              <ul className="pd__stack" aria-label="Built with">
                {p.stack.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>

              <div className="pd__links">
                {p.links?.live && (
                  <a className="btn btn--solid" href={p.links.live} target="_blank" rel="noreferrer">
                    Visit the site
                    <ArrowUpRight />
                  </a>
                )}
                {p.links?.code && (
                  <a className="btn btn--ghost" href={p.links.code} target="_blank" rel="noreferrer">
                    <Code />
                    Read the code
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </dialog>
  )
}
