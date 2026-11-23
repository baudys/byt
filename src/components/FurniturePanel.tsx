import { useMemo, useState } from 'react'
import type { FurnitureItem, RozmeryCm } from '../types'
import { furnitureByRoom, furnitureMap, mistnostLabel, roomOrder } from '../data/furniture'
import { useAppStore } from '../store'

function formatRozmery(item: FurnitureItem): string {
  const r = item.rozmery_cm
  if (r && 'kusy' in r && Array.isArray(r.kusy)) {
    return r.kusy
      .map((k) => `${k.nazev ?? 'kus'}: ${k.sirka}×${k.hloubka}×${k.vyska} cm`)
      .join('; ')
  }
  if (r && 'sirka' in r) {
    return `${r.sirka} × ${r.hloubka} × ${r.vyska} cm`
  }
  const m = item.rozmery_modelu_cm
  return `${m.y.toFixed(0)} × ${m.x.toFixed(0)} × ${m.z.toFixed(0)} cm (model)`
}

function hasKatalogRozmery(r: RozmeryCm): boolean {
  return r !== null
}

export function FurniturePanel() {
  const panelOpen = useAppStore((s) => s.panelOpen)
  const panelTab = useAppStore((s) => s.panelTab)
  const selectedId = useAppStore((s) => s.selectedId)
  const showLabels = useAppStore((s) => s.showLabels)
  const setPanelOpen = useAppStore((s) => s.setPanelOpen)
  const setPanelTab = useAppStore((s) => s.setPanelTab)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const requestFocus = useAppStore((s) => s.requestFocus)
  const setShowLabels = useAppStore((s) => s.setShowLabels)
  const [query, setQuery] = useState('')

  const selected = selectedId ? furnitureMap[selectedId] : null
  const groups = useMemo(() => furnitureByRoom(), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groups
    const out: typeof groups = {}
    for (const [room, list] of Object.entries(groups)) {
      const match = list.filter(
        ({ item }) =>
          item.nazev.toLowerCase().includes(q) ||
          item.kategorie.toLowerCase().includes(q) ||
          item.zdroj.toLowerCase().includes(q),
      )
      if (match.length) out[room] = match
    }
    return out
  }, [groups, query])

  if (!panelOpen) {
    return (
      <button type="button" className="panel-toggle" onClick={() => setPanelOpen(true)}>
        Nábytek
      </button>
    )
  }

  return (
    <aside className="furniture-panel" aria-label="Informace o nábytku">
      <header className="panel-header">
        <div className="tabs">
          <button
            type="button"
            className={panelTab === 'info' ? 'active' : ''}
            onClick={() => setPanelTab('info')}
          >
            Info
          </button>
          <button
            type="button"
            className={panelTab === 'list' ? 'active' : ''}
            onClick={() => setPanelTab('list')}
          >
            Nábytek
          </button>
        </div>
        <button type="button" className="icon-btn" onClick={() => setPanelOpen(false)} aria-label="Sbalit panel">
          ×
        </button>
      </header>

      <label className="labels-toggle">
        <input
          type="checkbox"
          checked={showLabels}
          onChange={(e) => setShowLabels(e.target.checked)}
        />
        Popisky
      </label>

      {panelTab === 'info' && (
        <div className="panel-body">
          {!selected ? (
            <p className="muted">Klikni na kus nábytku v modelu nebo vyber ze seznamu.</p>
          ) : (
            <>
              <h2>
                {selected.nazev}
                {selected.odhad && <span className="badge-odh">odh.</span>}
              </h2>
              <dl className="info-grid">
                <dt>Kategorie</dt>
                <dd>{selected.kategorie}</dd>
                <dt>Místnost</dt>
                <dd>{mistnostLabel(selected.mistnost)}</dd>
                <dt>
                  Rozměry
                  {selected.odhad && <span className="badge-odh">odh.</span>}
                </dt>
                <dd>
                  {formatRozmery(selected)}
                  {!hasKatalogRozmery(selected.rozmery_cm) && (
                    <span className="muted"> — z modelu</span>
                  )}
                </dd>
                <dt>
                  Materiál / barva
                  {selected.odhad && <span className="badge-odh">odh.</span>}
                </dt>
                <dd>{selected.material_barva}</dd>
                <dt>Zdroj</dt>
                <dd>{selected.zdroj}</dd>
              </dl>
              <div className="panel-actions">
                <button type="button" className="btn primary" onClick={() => selectedId && requestFocus(selectedId)}>
                  Ukázat
                </button>
                <button type="button" className="btn" onClick={() => setSelectedId(null)}>
                  Zavřít
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {panelTab === 'list' && (
        <div className="panel-body list-body">
          <input
            type="search"
            className="search"
            placeholder="Hledat nábytek…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {roomOrder.map((room) => {
            const list = filtered[room]
            if (!list?.length) return null
            return (
              <section key={room} className="room-group">
                <h3>{mistnostLabel(room)}</h3>
                <ul>
                  {list.map(({ id, item }) => (
                    <li key={id}>
                      <button
                        type="button"
                        className={selectedId === id ? 'active' : ''}
                        onClick={() => {
                          setSelectedId(id)
                          setPanelTab('info')
                          requestFocus(id)
                        }}
                      >
                        <span>{item.nazev}</span>
                        {item.odhad && <span className="badge-odh">odh.</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </aside>
  )
}
