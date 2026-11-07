import { useEffect, useRef } from 'react'
import './Cursor.css'

/*
  A soft follower that morphs with what's under the pointer:
  a small ring by default, a larger halo over links and buttons, and a labelled
  disc over anything marked data-cursor="Label". Fine pointers only; the system
  cursor stays as it is.
*/
export default function Cursor() {
  const ref = useRef(null)
  const labelRef = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let x = -100
    let y = -100
    let cx = -100
    let cy = -100
    let raf = 0
    let shown = false

    const loop = () => {
      raf = requestAnimationFrame(loop)
      cx += (x - cx) * 0.2
      cy += (y - cy) * 0.2
      el.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`
    }
    const onMove = (e) => {
      x = e.clientX
      y = e.clientY
      if (!shown) {
        shown = true
        cx = x
        cy = y
        el.dataset.shown = 'true'
      }
    }
    const onOver = (e) => {
      const target = e.target instanceof Element ? e.target : null
      const labelled = target?.closest('[data-cursor]')
      const link = target?.closest('a, button, [role="button"], .toolring__stage')
      if (labelled) {
        el.dataset.mode = 'label'
        labelRef.current.textContent = labelled.dataset.cursor
      } else if (link) {
        el.dataset.mode = 'link'
      } else {
        el.dataset.mode = ''
      }
    }
    const onLeave = () => {
      shown = false
      el.dataset.shown = 'false'
    }
    const onDown = () => {
      el.dataset.down = 'true'
    }
    const onUp = () => {
      el.dataset.down = 'false'
    }
    raf = requestAnimationFrame(loop)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.documentElement.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div ref={ref} className="cursor" aria-hidden="true">
      <span className="cursor__blob">
        <span ref={labelRef} className="cursor__label" />
      </span>
    </div>
  )
}
