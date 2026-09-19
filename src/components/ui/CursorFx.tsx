import { useEffect, useRef } from 'react'

const PAW_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
  <ellipse cx="12" cy="15.5" rx="5" ry="4.2"/>
  <circle cx="5.6" cy="10.2" r="2.3"/>
  <circle cx="10" cy="7" r="2.4"/>
  <circle cx="14" cy="7" r="2.4"/>
  <circle cx="18.4" cy="10.2" r="2.3"/>
</svg>`

export default function CursorFx() {
  const ringRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!finePointer.matches || reduced.matches) return

    const ring = ringRef.current!
    const dot = dotRef.current!
    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    let rx = x
    let ry = y
    let lastPawX = x
    let lastPawY = y
    let moved = 0
    let raf = 0

    const onMove = (e: MouseEvent) => {
      x = e.clientX
      y = e.clientY
      dot.style.transform = `translate(${x - 4}px, ${y - 4}px)`

      const dx = x - lastPawX
      const dy = y - lastPawY
      if (dx * dx + dy * dy > 90 * 90) {
        lastPawX = x
        lastPawY = y
        moved += 1
        const paw = document.createElement('div')
        paw.className = 'paw-trail'
        paw.innerHTML = PAW_SVG
        const side = moved % 2 === 0 ? 14 : -14
        paw.style.left = `${x + side}px`
        paw.style.top = `${y + side * 0.4}px`
        paw.style.setProperty('--paw-rot', `${Math.atan2(dy, dx) * (180 / Math.PI) + 90}deg`)
        paw.addEventListener('animationend', () => paw.remove())
        document.body.appendChild(paw)
      }
    }

    const tick = () => {
      rx += (x - rx) * 0.18
      ry += (y - ry) * 0.18
      ring.style.transform = `translate(${rx - ring.offsetWidth / 2}px, ${ry - ring.offsetHeight / 2}px)`
      raf = requestAnimationFrame(tick)
    }

    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('a, button, input, textarea, select, [role="button"]')) {
        ring.classList.add('cursor-ring--active')
      } else {
        ring.classList.remove('cursor-ring--active')
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onOver)
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  )
}
