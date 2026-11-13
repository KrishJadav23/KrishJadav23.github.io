import { useEffect, useRef } from 'react'

/*
  Pulls its child toward the pointer while the pointer is near, then springs back.
  Fine pointers only; nothing happens on touch or with reduced motion.
*/
export default function Magnetic({ children, strength = 0.3 }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const child = el.firstElementChild
    let raf = 0
    let tx = 0
    let ty = 0
    let x = 0
    let y = 0
    const loop = () => {
      x += (tx - x) * 0.18
      y += (ty - y) * 0.18
      child.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`
      if (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05) raf = requestAnimationFrame(loop)
      else raf = 0
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop)
    }
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      tx = (e.clientX - (r.left + r.width / 2)) * strength
      ty = (e.clientY - (r.top + r.height / 2)) * strength
      kick()
    }
    const onLeave = () => {
      tx = 0
      ty = 0
      kick()
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [strength])

  return (
    <span ref={ref} className="magnetic" style={{ display: 'inline-flex', padding: 10, margin: -10 }}>
      {children}
    </span>
  )
}
