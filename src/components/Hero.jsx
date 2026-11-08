import { AGENT_ID, HERO_META, HERO_WORDS, SITE } from '../data/content'
import { routeLink } from '../router'
import { ArrowRight, ArrowUpRight } from './Icons'
import Magnetic from './Magnetic'
import MorphText from './MorphText'
import './Hero.css'

export default function Hero({ ready }) {
  return (
    <section
      id="top"
      className="hero"
      aria-labelledby="hero-title"
      data-shape="cycle"
      data-cycle="brain self eye cube"
      data-drag
      data-amb="1"
      data-pos="2.75 0 1.32 1"
      data-pos-m="0.3 -1.7 0.78 0.85"
    >
      <div className="hero__inner wrap">
        <p className="hero__label label" style={{ '--d': 0 }}>
          {SITE.name} — {SITE.role}
        </p>

        <h1 id="hero-title" className="hero__title">
          <span className="hero__line">
            <span style={{ '--d': 1 }}>Engineering AI</span>
          </span>
          <span className="hero__line">
            <span style={{ '--d': 2 }}>
              people <MorphText words={HERO_WORDS} start={ready} />
            </span>
          </span>
        </h1>

        <p className="hero__aside" style={{ '--d': 3 }}>
          And a creative engineer who enjoys building things for fun!
        </p>

        <p className="hero__sub" style={{ '--d': 4 }}>
          I work as an AI product engineer, architecting and building a self-serve analytics agent on AWS that
          answers Natural Lanauge questions about our company’s data (With the goal to replace tradition Analytic Platforms). In my spare I enjoy 
          building cool things and desinging unique UI designs... As you can tell by this website :D
          
        </p>

        <div className="hero__actions" style={{ '--d': 5 }}>
          <Magnetic>
            <a className="btn btn--primary" href={`#/work/${AGENT_ID}`} onClick={routeLink}>
              See how it’s built
              <ArrowRight />
            </a>
          </Magnetic>
          <a className="link" href="#work">
            All work
            <ArrowRight />
          </a>
        </div>
      </div>

      <div className="hero__meta wrap" style={{ '--d': 7 }}>
        <dl>
          {HERO_META.map((m) => (
            <div key={m.label}>
              <dt className="label">{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
          <div>
            <dt className="label">Code</dt>
            <dd>
              <a className="link" href={SITE.github} target="_blank" rel="noreferrer">
                GitHub
                <ArrowUpRight />
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
