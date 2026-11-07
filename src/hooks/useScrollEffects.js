import { useEffect } from 'react'

const clamp01 = (x) => Math.min(1, Math.max(0, x))

/*
  Marks [data-reveal] and .line-mask elements with .is-in the first time they scroll
  into view (once only). `ready` delays it until the intro has opened.
*/
export function useReveal(ready) {
  useEffect(() => {
    if (!ready) return undefined
    const targets = document.querySelectorAll('[data-reveal], [data-inview]')
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-in'))
      return undefined
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            io.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
    )
    targets.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [ready])
}

/*
  Scroll-linked CSS variables on <html>:
  --scene-p      0 at the top, 1 once the hero has scrolled away, back to 0 as the footer arrives
  --scene-shade  how much the scene is dimmed
  --scroll       0..1 progress through the page
  --hero-p       0..1 progress of the hero scrolling out
*/
export function useSceneScroll() {
  useEffect(() => {
    const root = document.documentElement
    const footer = document.querySelector('[data-footer]')
    let raf = 0

    const update = () => {
      raf = 0
      const vh = window.innerHeight
      const y = window.scrollY
      const max = Math.max(1, root.scrollHeight - vh)
      const heroP = clamp01(y / vh)
      let p = heroP
      if (footer) {
        const top = footer.getBoundingClientRect().top
        if (top < vh) p = clamp01(top / vh)
      }
      root.style.setProperty('--scene-p', p.toFixed(4))
      root.style.setProperty('--scene-shade', (p * 0.55).toFixed(4))
      root.style.setProperty('--hero-p', heroP.toFixed(4))
      root.style.setProperty('--scroll', clamp01(y / max).toFixed(4))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
}
