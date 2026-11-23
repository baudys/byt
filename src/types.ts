export type Vec3 = [number, number, number]

export type RozmeryCm =
  | { sirka: number; hloubka: number; vyska: number }
  | { kusy: Array<{ nazev?: string; sirka: number; hloubka: number; vyska: number }> }
  | null

export interface FurnitureItem {
  nazev: string
  kategorie: string
  mistnost: string
  rozmery_cm: RozmeryCm
  rozmery_modelu_cm: { x: number; y: number; z: number }
  material_barva: string
  zdroj: string
  odhad: boolean
  skupina_v_glb: string
  stred_m: Vec3
}

export interface NabytekFile {
  _info: {
    popis: string
    verze: string
    neklikatelne: string[]
  }
  [key: string]: FurnitureItem | NabytekFile['_info']
}

export interface PerspectiveCameraDef {
  id: string
  nazev: string
  pozice: Vec3
  cil: Vec3
  ohnisko_mm?: number
  fov_vertikalni_st: number
  typ: 'perspektiva'
}

export interface OrthoCameraDef {
  id: string
  nazev: string
  pozice: Vec3
  cil: Vec3
  up?: Vec3
  typ: 'ortho'
  ortho_vyska_m: number
  poznamka?: string
}

export type CameraDef = PerspectiveCameraDef | OrthoCameraDef

export interface KameryFile {
  _info: {
    popis: string
    vyska_oci_m: number
    stropy_m: Record<string, number>
    start_volny_pohyb: {
      pozice: Vec3
      pohled_na: Vec3
      poznamka?: string
    }
  }
  kamery: CameraDef[]
}

export type AppMode = 'orbit' | 'walk'
export type VisibilityMode = 'realistic' | 'noCeiling' | 'section' | 'plan'
export type MaterialMode = 'normal' | 'clay' | 'wireframe'
export type PanelTab = 'info' | 'list'
