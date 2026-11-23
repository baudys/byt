import { useAppStore } from '../store'

export function Help() {
  const open = useAppStore((s) => s.helpOpen)
  const setHelpOpen = useAppStore((s) => s.setHelpOpen)

  return (
    <>
      <button
        type="button"
        className="help-btn"
        aria-label="Nápověda"
        onClick={() => setHelpOpen(true)}
      >
        ?
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setHelpOpen(false)} role="presentation">
          <div
            className="modal-card help-card"
            role="dialog"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <h2 id="help-title">Ovládání</h2>
              <button type="button" className="icon-btn" onClick={() => setHelpOpen(false)} aria-label="Zavřít">
                ×
              </button>
            </header>
            <div className="help-body">
              <h3>Pohledy</h3>
              <ul>
                <li>Tlačítka dole nebo klávesy <kbd>1</kbd>–<kbd>9</kbd>, <kbd>0</kbd></li>
                <li>Myš: otáčení a zoom kolem cíle pohledu</li>
                <li><kbd>V</kbd> — přepínání typu zobrazení</li>
              </ul>
              <h3>Procházka</h3>
              <ul>
                <li><kbd>F</kbd> nebo tlačítko „Projít se“</li>
                <li>Desktop: kliknutím zamknout myš, <kbd>WASD</kbd> / šipky, <kbd>Shift</kbd> rychleji</li>
                <li>Mobil: joystick vlevo, tažením prstem doprava se rozhlížet</li>
                <li><kbd>E</kbd> / klik — info o předmětu v zaměřovači</li>
                <li><kbd>Esc</kbd> — konec procházky</li>
              </ul>
              <h3>Nábytek</h3>
              <ul>
                <li>Klik / tap na kus nábytku otevře panel s údaji</li>
                <li>V panelu je i seznam podle místností</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
