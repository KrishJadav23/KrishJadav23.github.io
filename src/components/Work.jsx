import { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { PROJECTS } from '../data/content'
import { ArrowUpRight } from './Icons'
import ProjectArt from './ProjectArt'
import ProjectDialog from './ProjectDialog'
import './Work.css'

// The light follows the pointer across a card.
const onSpot = (e) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

function Folder({ project, index, onOpen }) {
  const num = String(index + 1).padStart(2, '0')
  return (
    <article
      id={`project-${project.id}`}
      className={`folder folder--${project.theme}`}
      style={{ '--d': index }}
      data-reveal
      data-cursor="Open"
      onPointerMove={onSpot}
    >
      <div className="folder__back" aria-hidden="true" />

      <div className="folder__paper" aria-hidden="true">
        <span className="folder__paper-label">{project.kind}</span>
        <ul>
          {project.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <span className="folder__paper-year">{project.year}</span>
      </div>

      <div className="folder__front">
        <div className="folder__art">
          <ProjectArt project={project} />
        </div>
        <span className="folder__num" aria-hidden="true">
          {num}
        </span>
        <span className="folder__arrow" aria-hidden="true">
          <ArrowUpRight />
        </span>
        <div className="folder__text">
          <h3>
            <button
              type="button"
              className="folder__hit"
              onClick={(e) => onOpen(project, e.currentTarget.closest('.folder')?.querySelector('.folder__front'))}
              aria-haspopup="dialog"
            >
              {project.title}
            </button>
          </h3>
          <p>{project.summary}</p>
        </div>
      </div>
    </article>
  )
}

export default function Work() {
  const [open, setOpen] = useState(null)

  // The card morphs into the project window (View Transitions), where supported.
  const onOpen = useCallback((p, from) => {
    const show = () => {
      flushSync(() => setOpen(p))
      history.replaceState(null, '', `#project-${p.id}`)
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || !from || reduced) {
      show()
      return
    }
    from.style.viewTransitionName = 'project-morph'
    document.documentElement.classList.add('vt-morph')
    const vt = document.startViewTransition(() => {
      from.style.viewTransitionName = ''
      show()
    })
    vt.finished.finally(() => document.documentElement.classList.remove('vt-morph'))
  }, [])

  const onClose = useCallback(() => {
    setOpen(null)
    if (location.hash.startsWith('#project-')) history.replaceState(null, '', '#work')
  }, [])

  // Deep links: #project-<id> opens that project.
  useEffect(() => {
    const fromHash = () => {
      const id = location.hash.match(/^#project-(.+)$/)?.[1]
      const project = PROJECTS.find((p) => p.id === id)
      if (project) setOpen(project)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  return (
    <section
      id="work"
      className="section work"
      aria-labelledby="work-title"
      data-shape="scatter"
      data-pos="0 0 1 0.4"
      data-pos-m="0 0 1 0.35"
    >
      <div className="wrap">
        <div className="section-head" data-inview>
          <span className="eyebrow">More projects</span>
          <div className="section-head__row">
            <h2 id="work-title">
              <span className="line-mask">
                <span style={{ '--d': 0 }}>Things I build</span>
              </span>
              <span className="line-mask">
                <span style={{ '--d': 1 }}>
                  <em className="serif accent">for fun.</em>
                </span>
              </span>
            </h2>
            <p data-reveal style={{ '--d': 3 }}>
              Experiments in motion, 3D and generative graphics. Open a folder: each one morphs into
              its case study, with a live demo inside.
            </p>
          </div>
        </div>

        <div className="folders">
          {PROJECTS.map((p, i) => (
            <Folder key={p.id} project={p} index={i} onOpen={onOpen} />
          ))}
        </div>
      </div>

      <ProjectDialog project={open} index={open ? PROJECTS.indexOf(open) : 0} onClose={onClose} />
    </section>
  )
}
