/** Přepni na meshopt: '/models/byt-v21-web-meshopt.glb' + useGLTF(url, true, true) */
export const MODEL_URL = '/models/byt-v21-web-draco.glb'

export const EYE_HEIGHT_M = 1.6
export const WALK_SPEED = 1.4
export const WALK_SPRINT = 2.5
export const COLLISION_RADIUS = 0.25
export const CAMERA_TRANSITION_S = 0.8
export const ORBIT_MAX_DISTANCE = 3
export const CLICK_DRAG_THRESHOLD_PX = 5

export const ACCENT = '#4f6b4a'
export const PANEL_BG = 'rgba(250, 247, 240, 0.85)'

export const MISTNOST_LABEL: Record<string, string> = {
  loznice: 'Ložnice',
  chodba: 'Chodba',
  koupelna: 'Koupelna',
  obyvak: 'Obývák s kuchyní',
  predsin: 'Předsíň',
}

export const VIEW_HOTKEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const
