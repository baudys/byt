import { ErrorBoundary } from './components/ErrorBoundary'
import { FurniturePanel } from './components/FurniturePanel'
import { Help } from './components/Help'
import { Joystick } from './components/Joystick'
import { Minimap } from './components/Minimap'
import { Scene } from './components/Scene'
import { Toolbar } from './components/Toolbar'

export default function App() {
  return (
    <ErrorBoundary>
      <div className="app">
        <Scene />
        <Toolbar />
        <FurniturePanel />
        <Minimap />
        <Help />
        <Joystick />
      </div>
    </ErrorBoundary>
  )
}
