import { useEffect, useState } from 'react'
import Cursor from './components/Cursor'
import Featured from './components/Featured'
import Footer from './components/Footer'
import Hero from './components/Hero'
import Island from './components/Island'
import ParticleField from './components/ParticleField'
import Stack from './components/Stack'
import Work from './components/Work'
import { AWS_SPRITE } from './data/awsSprite'
import { AGENT_ID } from './data/content'
import { useReveal, useSceneScroll } from './hooks/useScrollEffects'
import CaseStudy from './pages/CaseStudy'
import { useRoute } from './router'
import './App.css'

function Home({ ready }) {
  return (
    <>
      <Hero ready={ready} />
      <Featured />
      <Work />
      <Stack />
    </>
  )
}

function App() {
  const route = useRoute()
  const [ready, setReady] = useState(false)
  const routeKey = route.page === 'project' ? `p:${route.id}` : 'home'

  // The opening: wait for the fonts (briefly), then let the hero rise as the particles converge.
  useEffect(() => {
    let done = false
    const go = () => {
      if (!done) {
        done = true
        requestAnimationFrame(() => setReady(true))
      }
    }
    document.fonts?.ready.then(go)
    const t = setTimeout(go, 900)
    return () => clearTimeout(t)
  }, [])

  // Project pages open at the top; a deep link to a home anchor (e.g. #work) scrolls there.
  useEffect(() => {
    if (route.page === 'project') window.scrollTo(0, 0)
    else if (route.anchor) document.getElementById(route.anchor)?.scrollIntoView()
  }, [routeKey, route.page, route.anchor])

  useReveal(ready, routeKey)
  useSceneScroll()

  return (
    <div className={`app${ready ? ' is-ready' : ''}`}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs dangerouslySetInnerHTML={{ __html: AWS_SPRITE }} />
      </svg>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <ParticleField />
      <Island route={route} />
      <Cursor />

      <main id="main" key={routeKey}>
        {route.page === 'project' && route.id === AGENT_ID ? <CaseStudy /> : <Home ready={ready} />}
      </main>

      <Footer />
    </div>
  )
}

export default App
