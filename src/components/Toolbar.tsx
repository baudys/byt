import { useEffect } from 'react'
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
          <h1 className="brand">Náš byt – v21</h1>
          <div className="mode-switch" role="group" aria-label="Režim">
            <button
              type="button"
              className={mode === 'orbit' ? 'active' : ''}
              onClick={() => exitWalk()}
            >
              🎥 Pohledy
            </button>
            <button
              type="button"
              className={mode === 'walk' ? 'active' : ''}
              onClick={() => enterWalk()}
            >
              🚶 Projít se
            </button>
          </div>
        </div>

        <div className="display-controls">
          <div className="segment" role="group" aria-label="Viditelnost">
            {VIS.map((v) => (
              <button
                key={v.id}
                type="button"
                className={visibilityMode === v.id ? 'active' : ''}
                onClick={() => setVisibilityMode(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="segment" role="group" aria-label="Materiál">
            {MAT.map((m) => (
              <button
                key={m.id}
                type="button"
                className={materialMode === m.id ? 'active' : ''}
                onClick={() => setMaterialMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
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
          {walkAimId && (
            <div className="aim-hint">Klikni / E – info</div>
          )}
        </div>
      )}
    </>
  )
}
