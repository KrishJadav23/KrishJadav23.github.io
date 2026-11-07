import { useCallback, useState } from 'react'
import About from './components/About'
import Cursor from './components/Cursor'
import Featured from './components/Featured'
import Footer from './components/Footer'
import Hero from './components/Hero'
import Intro from './components/Intro'
import Island from './components/Island'
import ParticleField from './components/ParticleField'
import ToolRing from './components/ToolRing'
import Work from './components/Work'
import { useReveal, useSceneScroll } from './hooks/useScrollEffects'
import './App.css'

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function App() {
  // With reduced motion there is no intro: everything is shown straight away.
  const [showIntro, setShowIntro] = useState(() => !prefersReducedMotion())
  const [revealed, setRevealed] = useState(() => prefersReducedMotion())

  const onReveal = useCallback(() => setRevealed(true), [])
  const onDone = useCallback(() => setShowIntro(false), [])

  useReveal(revealed)
  useSceneScroll()

  return (
    <div className={`app${revealed ? ' is-revealed' : ''}`}>
      <a className="skip-link" href="#featured">
        Skip to content
      </a>

      <ParticleField intro={!revealed} />
      {showIntro && <Intro onReveal={onReveal} onDone={onDone} />}
      <Island />
      <Cursor />

      <main>
        <Hero revealed={revealed} />
        <Featured />
        <Work />

        <section
          id="toolbox"
          className="section toolbox"
          aria-labelledby="toolbox-title"
          data-shape="globe"
          data-pos="0 -0.75 0.95 0.55"
          data-pos-m="0 -0.6 0.7 0.45"
        >
          <div className="wrap">
            <div className="section-head" data-inview>
              <span className="eyebrow">Toolbox</span>
              <div className="section-head__row">
                <h2 id="toolbox-title">
                  <span className="line-mask">
                    <span style={{ '--d': 0 }}>What I build</span>
                  </span>
                  <span className="line-mask">
                    <span style={{ '--d': 1 }}>
                      <em className="serif accent">with.</em>
                    </span>
                  </span>
                </h2>
                <p data-reveal style={{ '--d': 3 }}>
                  The tools behind the work, orbiting a globe of data. Drag the ring, or use the
                  arrows; it turns a little as you scroll past.
                </p>
              </div>
            </div>
          </div>
          <div data-reveal style={{ '--d': 2 }}>
            <ToolRing />
          </div>
        </section>

        <About />
      </main>

      <Footer />
    </div>
  )
}

export default App
