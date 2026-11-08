import { PROJECTS } from '../data/content'
import { navigate } from '../router'
import { ArrowUpRight } from './Icons'
import ProjectArt from './ProjectArt'
import './Work.css'

// The light follows the pointer across a card.
const onSpot = (e) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

// Opening a card morphs its front into the project page's hero.
const open = (e) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  const front = e.currentTarget.closest('.folder')?.querySelector('.folder__front')
  navigate(e.currentTarget.getAttribute('href'), front)
}

function Soon({ project, index }) {
  return (
    <article className="folder folder--soon" style={{ '--d': index }} data-reveal aria-label="Coming soon">
      <div className="folder__back" aria-hidden="true" />
      <div className="folder__front">
        <span className="folder__num" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="folder__text">
          <h3>{project.title}</h3>
          <p>{project.summary}</p>
        </div>
      </div>
    </article>
  )
}

function Folder({ project, index }) {
  if (project.soon) return <Soon project={project} index={index} />
  const num = String(index + 1).padStart(2, '0')
  return (
    <article
      className={`folder folder--${project.theme}${project.wide ? ' folder--wide' : ''}`}
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
            <a className="folder__hit" href={`#/work/${project.id}`} onClick={open}>
              {project.title}
            </a>
          </h3>
          <p>{project.summary}</p>
        </div>
      </div>
    </article>
  )
}

export default function Work() {
  return (
    <section
      id="work"
      className="section work"
      aria-labelledby="work-title"
      data-shape="dust"
      data-pos="0 0 1 0.22"
      data-pos-m="0 0 1 0.3"
    >
      <div className="wrap">
        <div className="section-head" data-inview>
          <span className="label">Work</span>
          <h2 id="work-title">
            <span className="line-mask">
              <span style={{ '--d': 0 }}>One system in production,</span>
            </span>
            <span className="line-mask">
              <span style={{ '--d': 1 }} className="powder">
                more on the way.
              </span>
            </span>
          </h2>
          <p data-reveal style={{ '--d': 3 }}>
            Open the folder for the full case study: the architecture, the agent and the guardrails
            that keep every number honest.
          </p>
        </div>

        <div className="folders">
          {PROJECTS.map((p, i) => (
            <Folder key={p.id || p.title} project={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
