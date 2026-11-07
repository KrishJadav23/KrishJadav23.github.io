import { PROJECTS, SITE } from '../data/content'
import { ArrowUp, ArrowUpRight } from './Icons'
import Magnetic from './Magnetic'
import './Footer.css'

const elsewhere = [
  { label: 'GitHub', href: SITE.github },
  SITE.linkedin && { label: 'LinkedIn', href: SITE.linkedin },
  { label: 'Source code', href: SITE.repo },
].filter(Boolean)

// The page ends on the name, spelled in particles behind this section.
export default function Footer() {
  const contactHref = SITE.email ? `mailto:${SITE.email}` : SITE.github
  return (
    <footer
      id="contact"
      className="footer"
      aria-labelledby="contact-title"
      data-shape="name"
      data-pos="0 0.45 0.92 0.85"
      data-pos-m="0 1.15 1 0.8"
    >
      <div className="wrap footer__top">
        <span className="eyebrow">Contact</span>
        <h2 id="contact-title" className="footer__title" data-inview>
          <span className="line-mask">
            <span style={{ '--d': 0 }}>Let&apos;s build something</span>
          </span>
          <span className="line-mask">
            <span style={{ '--d': 1 }}>
              <em className="serif accent">intelligent.</em>
            </span>
          </span>
        </h2>

        <div className="footer__cta" data-reveal style={{ '--d': 2 }}>
          <p className="footer__blurb">
            Have a model that needs a product, or a product that needs a brain? I&apos;d like to hear
            about it.
          </p>
          <Magnetic strength={0.35}>
            <a
              className="blob"
              href={contactHref}
              {...(SITE.email ? {} : { target: '_blank', rel: 'noreferrer' })}
              data-cursor="Say hi"
            >
              <span className="blob__shape" aria-hidden="true" />
              <span className="blob__text">
                Start a<br />
                conversation
                <ArrowUpRight />
              </span>
            </a>
          </Magnetic>
        </div>
      </div>

      <div className="wrap footer__bottom">
        <nav className="footer__cols" aria-label="Footer">
          <div>
            <h3>Index</h3>
            <ul>
              <li>
                <a href="#featured">Featured</a>
              </li>
              <li>
                <a href="#work">Projects</a>
              </li>
              <li>
                <a href="#toolbox">Toolbox</a>
              </li>
              <li>
                <a href="#about">About</a>
              </li>
            </ul>
          </div>
          <div>
            <h3>Projects</h3>
            <ul>
              {PROJECTS.map((p) => (
                <li key={p.id}>
                  <a href={`#project-${p.id}`}>{p.title}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Elsewhere</h3>
            <ul>
              {elsewhere.map((l) => (
                <li key={l.label}>
                  <a href={l.href} target="_blank" rel="noreferrer">
                    {l.label}
                    <ArrowUpRight />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="footer__base">
          <p>
            &copy; 2026 {SITE.name} · Built by hand with React and WebGL
          </p>
          <a className="footer__top-link" href="#top">
            Back to top
            <ArrowUp />
          </a>
        </div>
      </div>
    </footer>
  )
}
