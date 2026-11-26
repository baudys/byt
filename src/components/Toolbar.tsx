import { useEffect, useId, useRef, useState } from 'react'
import { VIEW_HOTKEYS } from '../constants'
import { kamery, useAppStore } from '../store'
import type { MaterialMode, VisibilityMode } from '../types'

const VIS: Array<{ id: VisibilityMode; label: string }> = [
  { id: 'realistic', label: 'Realistický' },
  { id: 'noCeiling', label: 'Bez stropu' },
  { id: 'section', label: 'Řez' },
  { id: 'plan', label: 'Plán' },
]

const MAT: Array<{ id: MaterialMode; label: string }> = [
  { id: 'normal', label: 'Normální' },
  { id: 'clay', label: 'Clay' },
  { id: 'wireframe', label: 'Drátový' },
]

const MODES = [
  { id: 'orbit' as const, label: '🎥 Pohledy' },
  { id: 'walk' as const, label: '🚶 Projít se' },
]

interface SelectOption<T extends string> {
  id: T
  label: string
}

function CollapsibleSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<SelectOption<T>>
  value: T
  onChange: (id: T) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const active = options.find((o) => o.id === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      className={`collapse-select${open ? ' open' : ''}`}
      ref={rootRef}
      role="group"
      aria-label={label}
    >
      {!open ? (
        <button
          type="button"
          className="collapse-select-trigger active"
          aria-haspopup="listbox"
          aria-expanded={false}
          aria-controls={listId}
          onClick={() => setOpen(true)}
        >
          <span>{active.label}</span>
          <span className="collapse-caret" aria-hidden>
            ▾
          </span>
        </button>
      ) : (
        <div className="collapse-select-menu" id={listId} role="listbox" aria-label={label}>
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="option"
              aria-selected={o.id === value}
              className={o.id === value ? 'active' : ''}
              onClick={() => {
                onChange(o.id)
                setOpen(false)
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Toolbar() {
  const mode = useAppStore((s) => s.mode)
  const activeViewId = useAppStore((s) => s.activeViewId)
  const visibilityMode = useAppStore((s) => s.visibilityMode)
  const materialMode = useAppStore((s) => s.materialMode)
  const sectionHeight = useAppStore((s) => s.sectionHeight)
  const walkAimId = useAppStore((s) => s.walkAimId)
  const setView = useAppStore((s) => s.setView)
  const setVisibilityMode = useAppStore((s) => s.setVisibilityMode)
  const setMaterialMode = useAppStore((s) => s.setMaterialMode)
  const setSectionHeight = useAppStore((s) => s.setSectionHeight)
  const cycleVisibility = useAppStore((s) => s.cycleVisibility)
  const enterWalk = useAppStore((s) => s.enterWalk)
  const exitWalk = useAppStore((s) => s.exitWalk)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const idx = VIEW_HOTKEYS.indexOf(e.key as (typeof VIEW_HOTKEYS)[number])
      if (idx >= 0 && kamery.kamery[idx]) {
        setView(kamery.kamery[idx].id)
        return
      }
      if (e.key === 'v' || e.key === 'V') {
        cycleVisibility()
        return
      }
      if (e.key === 'f' || e.key === 'F') {
        if (mode === 'walk') exitWalk()
        else enterWalk()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, setView, cycleVisibility, enterWalk, exitWalk])

  return (
    <>
      <div className="top-bar">
        <div className="brand-block">
          <h1 className="brand">Byt</h1>
          <div className="top-controls">
            <CollapsibleSelect
              label="Režim"
              options={MODES}
              value={mode}
              onChange={(id) => {
                if (id === 'walk') enterWalk()
                else exitWalk()
              }}
            />
            <CollapsibleSelect
              label="Viditelnost"
              options={VIS}
              value={visibilityMode}
              onChange={setVisibilityMode}
            />
            <CollapsibleSelect
              label="Materiál"
              options={MAT}
              value={materialMode}
              onChange={setMaterialMode}
            />
            {visibilityMode === 'section' && (
              <label className="section-slider">
                Řez {sectionHeight.toFixed(1)} m
                <input
                  type="range"
                  min={0.8}
                  max={2.7}
                  step={0.05}
                  value={sectionHeight}
                  onChange={(e) => setSectionHeight(Number(e.target.value))}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {mode === 'orbit' && (
        <nav className="view-strip" aria-label="Předpřipravené pohledy">
          {kamery.kamery.map((cam, i) => (
            <button
              key={cam.id}
              type="button"
              className={activeViewId === cam.id ? 'active' : ''}
              onClick={() => setView(cam.id)}
              title={`${VIEW_HOTKEYS[i] ?? ''} – ${cam.nazev}`}
            >
              <span className="view-key">{VIEW_HOTKEYS[i]}</span>
              <span className="view-name">{cam.nazev}</span>
            </button>
          ))}
        </nav>
      )}

      {mode === 'walk' && (
        <div className="walk-hud">
          <div className="crosshair" aria-hidden />
          {walkAimId && <div className="aim-hint">Klikni / E – info</div>}
        </div>
      )}
    </>
  )
}
