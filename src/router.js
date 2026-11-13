import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

/*
  Hash routes, so the site works on GitHub Pages without server rewrites:
    #/work/<id>   a project page
    anything else the home page (plain #anchors still scroll within it)
*/
export const parseRoute = (hash = window.location.hash) => {
  const m = hash.match(/^#\/work\/([\w-]+)/)
  return m ? { page: 'project', id: m[1] } : { page: 'home', anchor: hash.startsWith('#/') ? '' : hash.slice(1) }
}

let setter = null

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute())
  useEffect(() => {
    setter = setRoute
    const onHash = () => setRoute(parseRoute())
    window.addEventListener('hashchange', onHash)
    return () => {
      setter = null
      window.removeEventListener('hashchange', onHash)
    }
  }, [])
  return route
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/*
  Navigate with a view transition. `morphFrom` (optional) is the element that should
  morph into the new page's [data-morph-target]: a project card into its page hero.
*/
export function navigate(hash, morphFrom) {
  const apply = () => {
    history.pushState(null, '', hash)
    flushSync(() => setter?.(parseRoute(hash)))
    const r = parseRoute(hash)
    if (r.page === 'project' || !r.anchor) window.scrollTo(0, 0)
    else document.getElementById(r.anchor)?.scrollIntoView()
  }
  if (!document.startViewTransition || reduced()) {
    apply()
    return
  }
  if (morphFrom) morphFrom.style.viewTransitionName = 'project-hero'
  const vt = document.startViewTransition(() => {
    if (morphFrom) morphFrom.style.viewTransitionName = ''
    apply()
  })
  vt.finished.catch(() => {})
}

// Click handler for in-app links: <a href="#/work/x" onClick={routeLink}>
export function routeLink(e) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const href = e.currentTarget.getAttribute('href')
  if (!href) return
  const target = parseRoute(href)
  const current = parseRoute()
  // Only intercept moves between pages; same-page anchors scroll natively.
  if (target.page === 'home' && current.page === 'home') return
  e.preventDefault()
  navigate(href)
}
