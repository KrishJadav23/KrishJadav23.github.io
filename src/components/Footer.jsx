import { SITE } from '../data/content'
import { ArrowUp, ArrowUpRight } from './Icons'
import './Footer.css'

export default function Footer() {
  const links = [
    { label: 'GitHub', href: SITE.github },
    SITE.linkedin && { label: 'LinkedIn', href: SITE.linkedin },
    SITE.email && { label: 'Email', href: `mailto:${SITE.email}` },
    { label: 'Source', href: SITE.repo },
  ].filter(Boolean)

  const toTop = (e) => {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="site-foot">
      <div className="wrap site-foot__row">
        <p className="site-foot__name">
          {SITE.name}
          <span>{SITE.role}</span>
        </p>
        <ul className="site-foot__links">
          {links.map((l) => (
            <li key={l.label}>
              <a
                className="link"
                href={l.href}
                {...(l.href.startsWith('mailto') ? {} : { target: '_blank', rel: 'noreferrer' })}
              >
                {l.label}
                <ArrowUpRight />
              </a>
            </li>
          ))}
        </ul>
        <a className="link site-foot__top" href="#top" onClick={toTop}>
          Back to top
          <ArrowUp />
        </a>
      </div>
      <div className="wrap site-foot__base">
        <span>&copy; 2026 {SITE.name}</span>
        <span>Built by hand with React and WebGL</span>
      </div>
    </footer>
  )
}
