import { create } from 'zustand'
import type { AppMode, MaterialMode, PanelTab, VisibilityMode } from './types'
import kameryData from './data/kamery.json'
import type { KameryFile } from './types'

const kamery = kameryData as unknown as KameryFile
const firstView = kamery.kamery[0]?.id ?? 'obyvak'

interface AppState {
  mode: AppMode
  activeViewId: string
  visibilityMode: VisibilityMode
  materialMode: MaterialMode
  sectionHeight: number
  selectedId: string | null
  hoveredId: string | null
  walkAimId: string | null
  showLabels: boolean
  panelOpen: boolean
  panelTab: PanelTab
  helpOpen: boolean
  focusRequest: { id: string; token: number } | null
  cameraPose: { x: number; z: number; yaw: number }

  setMode: (mode: AppMode) => void
  setView: (id: string) => void
  setVisibilityMode: (m: VisibilityMode) => void
  setMaterialMode: (m: MaterialMode) => void
  cycleVisibility: () => void
  setSectionHeight: (h: number) => void
  setSelectedId: (id: string | null) => void
  setHoveredId: (id: string | null) => void
  setWalkAimId: (id: string | null) => void
  setShowLabels: (v: boolean) => void
  setPanelOpen: (v: boolean) => void
  setPanelTab: (t: PanelTab) => void
  setHelpOpen: (v: boolean) => void
  requestFocus: (id: string) => void
  setCameraPose: (pose: { x: number; z: number; yaw: number }) => void
  enterWalk: () => void
  exitWalk: () => void
}

const visibilityCycle: VisibilityMode[] = ['realistic', 'noCeiling', 'section', 'plan']

export const useAppStore = create<AppState>((set, get) => ({
  mode: 'orbit',
  activeViewId: firstView,
  visibilityMode: 'realistic',
  materialMode: 'normal',
  sectionHeight: 1.2,
  selectedId: null,
  hoveredId: null,
  walkAimId: null,
  showLabels: false,
  panelOpen: false,
  panelTab: 'list',
  helpOpen: false,
  focusRequest: null,
  cameraPose: {
    x: kamery._info.start_volny_pohyb.pozice[0],
    z: kamery._info.start_volny_pohyb.pozice[2],
    yaw: 0,
  },

  setMode: (mode) => set({ mode }),
  setView: (id) => {
    const patch: Partial<AppState> = { activeViewId: id, mode: 'orbit' }
    if (id === 'shora') {
      patch.visibilityMode = 'plan'
    } else if (id === 'ptaci') {
      patch.visibilityMode = 'section'
    }
    set(patch)
  },
  setVisibilityMode: (visibilityMode) => {
    const patch: Partial<AppState> = { visibilityMode }
    if (visibilityMode === 'plan') {
      patch.activeViewId = 'shora'
      patch.mode = 'orbit'
    }
    set(patch)
  },
  setMaterialMode: (materialMode) => set({ materialMode }),
  cycleVisibility: () => {
    const cur = get().visibilityMode
    const i = visibilityCycle.indexOf(cur)
    const next = visibilityCycle[(i + 1) % visibilityCycle.length]
    get().setVisibilityMode(next)
  },
  setSectionHeight: (sectionHeight) => set({ sectionHeight }),
  setSelectedId: (selectedId) =>
    set({
      selectedId,
      panelOpen: selectedId !== null,
      panelTab: selectedId !== null ? 'info' : get().panelTab,
    }),
  setHoveredId: (hoveredId) => set({ hoveredId }),
  setWalkAimId: (walkAimId) => set({ walkAimId }),
  setShowLabels: (showLabels) => set({ showLabels }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setPanelTab: (panelTab) => set({ panelTab }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  requestFocus: (id) =>
    set((s) => ({
      selectedId: id,
      panelOpen: true,
      panelTab: 'info',
      focusRequest: { id, token: (s.focusRequest?.token ?? 0) + 1 },
      mode: 'orbit',
    })),
  setCameraPose: (cameraPose) => set({ cameraPose }),
  enterWalk: () => set({ mode: 'walk' }),
  exitWalk: () => set({ mode: 'orbit' }),
}))

export { kamery }
