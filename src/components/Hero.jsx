import { CAPABILITIES, MORPH_WORDS, SITE } from '../data/content'
import { ArrowRight, ArrowUpRight } from './Icons'
import Magnetic from './Magnetic'
import MorphText from './MorphText'
import './Hero.css'

export default function Hero({ revealed }) {
  return (
    <section
      id="top"
      className="hero"
      aria-labelledby="hero-title"
      data-shape="brain"
      data-pos="3.1 0.3 0.86 1"
      data-pos-m="0 -1.75 0.6 0.95"
    >
      <div className="hero__inner wrap">
        <div className="hero__content">
          <p className="hero__kicker" style={{ '--d': 0 }}>
            <span className="hero__dot" aria-hidden="true" />
            {SITE.name} — {SITE.role}
          </p>

          <h1 id="hero-title" className="hero__title">
            <span className="hero__line">
              <span style={{ '--d': 1 }}>Turning models</span>
            </span>
            <span className="hero__line">
              <span style={{ '--d': 2 }}>
                into <MorphText words={MORPH_WORDS} start={revealed} />
              </span>
            </span>
          </h1>

          <p className="hero__sub" style={{ '--d': 4 }}>
            I design and ship AI products end to end: the data, the model, and the interface someone
            actually clicks. Every particle behind this text is drawn live on your GPU.
          </p>

          <div className="hero__actions" style={{ '--d': 5 }}>
            <Magnetic>
              <a className="btn btn--solid" href="#featured" data-cursor="View">
                See the work
                <ArrowRight />
              </a>
            </Magnetic>
            <Magnetic>
              <a className="btn btn--ghost" href="#contact">
                Get in touch
                <ArrowUpRight className="btn__ext" />
              </a>
            </Magnetic>
          </div>
        </div>

      </div>

      {/* A small readout pinned to the brain: real numbers from the renderer */}
      <dl className="hero__hud" aria-hidden="true">
        <div>
          <dt>Particles</dt>
          <dd data-gl-stat="count">—</dd>
        </div>
        <div>
          <dt>Frame rate</dt>
          <dd>
            <span data-gl-stat="fps">—</span> fps
          </dd>
        </div>
        <div className="hero__hud-hint">
          <dt>Input</dt>
          <dd>Move your cursor through it</dd>
        </div>
      </dl>

      <div className="hero__ticker" aria-label="What I work on">
        <ul className="hero__track">
          {[...CAPABILITIES, ...CAPABILITIES].map((c, i) => (
            <li key={i} aria-hidden={i >= CAPABILITIES.length ? 'true' : undefined}>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
