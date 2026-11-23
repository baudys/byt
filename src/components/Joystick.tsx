import { useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../store'
import { isTouchDevice } from '../hooks/useIsMobile'

export function Joystick() {
  const mode = useAppStore((s) => s.mode)
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const active = useRef(false)
  const origin = useRef({ x: 0, y: 0 })

  const emit = useCallback((x: number, y: number) => {
    window.dispatchEvent(new CustomEvent('walk-joystick', { detail: { x, y } }))
  }, [])

  useEffect(() => {
    if (mode !== 'walk' || !isTouchDevice()) return

    const base = baseRef.current
    if (!base) return
    const max = 40

    const onDown = (e: PointerEvent) => {
      active.current = true
      const rect = base.getBoundingClientRect()
      origin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      base.setPointerCapture(e.pointerId)
      onMove(e)
    }
    const onMove = (e: PointerEvent) => {
      if (!active.current) return
      let dx = e.clientX - origin.current.x
      let dy = e.clientY - origin.current.y
      const len = Math.hypot(dx, dy)
      if (len > max) {
        dx = (dx / len) * max
        dy = (dy / len) * max
      }
      if (knobRef.current) {
        knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`
      }
      emit(dx / max, -dy / max)
    }
    const onUp = (e: PointerEvent) => {
      active.current = false
      if (knobRef.current) knobRef.current.style.transform = 'translate(0, 0)'
      emit(0, 0)
      try {
        base.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    base.addEventListener('pointerdown', onDown)
    base.addEventListener('pointermove', onMove)
    base.addEventListener('pointerup', onUp)
    base.addEventListener('pointercancel', onUp)
    return () => {
      base.removeEventListener('pointerdown', onDown)
      base.removeEventListener('pointermove', onMove)
      base.removeEventListener('pointerup', onUp)
      base.removeEventListener('pointercancel', onUp)
      emit(0, 0)
    }
  }, [mode, emit])

  if (mode !== 'walk' || !isTouchDevice()) return null

  return (
    <div className="joystick" ref={baseRef} aria-label="Joystick pohybu">
      <div className="joystick-knob" ref={knobRef} />
    </div>
  )
}
