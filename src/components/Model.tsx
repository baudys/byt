import { Html, useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh'
import { CLICK_DRAG_THRESHOLD_PX, MODEL_URL } from '../constants'
import { furnitureMap, resolveFurnitureId } from '../data/furniture'
import { useAppStore } from '../store'

;(THREE.BufferGeometry.prototype as unknown as { computeBoundsTree: typeof computeBoundsTree }).computeBoundsTree =
  computeBoundsTree
;(THREE.BufferGeometry.prototype as unknown as { disposeBoundsTree: typeof disposeBoundsTree }).disposeBoundsTree =
  disposeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast

useGLTF.setDecoderPath('./draco/')

type MaterialBackup = THREE.Material | THREE.Material[]

const CLAY = new THREE.MeshStandardMaterial({
  color: '#d9d6d0',
  roughness: 0.9,
  metalness: 0.05,
})

const COLLISION_GROUPS = new Set(['STAVBA', 'NABYTEK', 'KUCHYN', 'KOUPELNA'])
const IGNORE_NAME = /^(koberec_|podlaha_|zavesy_|strop_)/
const IGNORE_GROUPS = new Set(['ROSTLINY', 'OBRAZY', 'SVETLA', 'DEKORACE'])

export interface CollisionWorld {
  meshes: THREE.Mesh[]
  raycaster: THREE.Raycaster
}

export const collisionWorld: CollisionWorld = {
  meshes: [],
  raycaster: new THREE.Raycaster(),
}

collisionWorld.raycaster.firstHitOnly = true

function shouldCollide(obj: THREE.Object3D): boolean {
  if (IGNORE_NAME.test(obj.name)) return false
  let p: THREE.Object3D | null = obj
  while (p) {
    if (IGNORE_GROUPS.has(p.name)) return false
    if (COLLISION_GROUPS.has(p.name)) return true
    p = p.parent
  }
  return false
}

function setWireframe(mat: THREE.Material | THREE.Material[], value: boolean) {
  const mats = Array.isArray(mat) ? mat : [mat]
  for (const m of mats) {
    if ('wireframe' in m) {
      ;(m as THREE.MeshStandardMaterial).wireframe = value
      m.needsUpdate = true
    }
  }
}

function applyMaterials(
  root: THREE.Object3D,
  backups: Map<string, MaterialBackup>,
  mode: 'normal' | 'clay' | 'wireframe',
  selectedId: string | null,
): number {
  let count = 0
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    let backup = backups.get(mesh.uuid)
    if (!backup) {
      // lazy backup if mesh appeared later
      const mat = mesh.material
      backup = Array.isArray(mat) ? mat.map((m) => m.clone()) : mat.clone()
      backups.set(mesh.uuid, backup)
    }
    count++

    if (mode === 'normal') {
      mesh.material = backup
      setWireframe(backup, false)
      return
    }

    if (mode === 'wireframe') {
      mesh.material = backup
      setWireframe(backup, true)
      return
    }

    const id = resolveFurnitureId(mesh)
    if (id && id === selectedId) {
      mesh.material = backup
      setWireframe(backup, false)
    } else {
      mesh.material = CLAY
    }
  })
  return count
}

function ModelInner() {
  const { scene } = useGLTF(MODEL_URL, true)
  const groupRef = useRef<THREE.Group>(null)
  const backups = useRef(new Map<string, MaterialBackup>())
  const prepared = useRef(false)
  const appliedKey = useRef('')
  const visibilityKey = useRef('')
  const pointerDown = useRef<{ x: number; y: number } | null>(null)

  const visibilityMode = useAppStore((s) => s.visibilityMode)
  const materialMode = useAppStore((s) => s.materialMode)
  const selectedId = useAppStore((s) => s.selectedId)
  const hoveredId = useAppStore((s) => s.hoveredId)
  const showLabels = useAppStore((s) => s.showLabels)
  const mode = useAppStore((s) => s.mode)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const setHoveredId = useAppStore((s) => s.setHoveredId)
  const { gl, invalidate } = useThree()

  // Aplikace materiálů / stropu v useFrame — spolehlivé i při frameloop=demand
  useFrame(() => {
    if (!prepared.current) {
      prepared.current = true
      backups.current.clear()
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        const mat = mesh.material
        if (Array.isArray(mat)) {
          const clonedMats = mat.map((m) => m.clone())
          backups.current.set(mesh.uuid, clonedMats)
          mesh.material = clonedMats
        } else {
          const clone = mat.clone()
          backups.current.set(mesh.uuid, clone)
          mesh.material = clone
        }
        ;(mesh.geometry as unknown as { computeBoundsTree?: () => void }).computeBoundsTree?.()
      })

      const colliders: THREE.Mesh[] = []
      scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && shouldCollide(o)) {
          colliders.push(o as THREE.Mesh)
        }
      })
      collisionWorld.meshes = colliders
    }

    if (visibilityKey.current !== visibilityMode) {
      visibilityKey.current = visibilityMode
      const strop = scene.getObjectByName('STROP')
      const hideCeiling =
        visibilityMode === 'noCeiling' ||
        visibilityMode === 'section' ||
        visibilityMode === 'plan'
      if (strop) strop.visible = !hideCeiling
    }

    const key = `${materialMode}|${selectedId ?? ''}`
    if (appliedKey.current !== key) {
      appliedKey.current = key
      applyMaterials(scene, backups.current, materialMode, selectedId)
    }
  })

  // Po změně store vynutit frame (demand mode)
  useEffect(() => {
    invalidate()
  }, [materialMode, selectedId, visibilityMode, invalidate])

  useEffect(() => {
    gl.domElement.style.cursor = hoveredId && mode === 'orbit' ? 'pointer' : 'default'
  }, [hoveredId, mode, gl])

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'orbit') return
    pointerDown.current = { x: e.clientX, y: e.clientY }
  }

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'orbit' || !pointerDown.current) return
    const dx = e.clientX - pointerDown.current.x
    const dy = e.clientY - pointerDown.current.y
    pointerDown.current = null
    if (Math.hypot(dx, dy) > CLICK_DRAG_THRESHOLD_PX) return
    e.stopPropagation()
    setSelectedId(resolveFurnitureId(e.object))
  }

  const onPointerMissed = () => {
    if (mode === 'orbit') setSelectedId(null)
  }

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'orbit') return
    e.stopPropagation()
    setHoveredId(resolveFurnitureId(e.object))
  }

  const onPointerOut = () => {
    if (mode === 'orbit') setHoveredId(null)
  }

  const highlightId = hoveredId ?? selectedId
  const prevHighlight = useRef<string | null>(null)

  useEffect(() => {
    const paint = (id: string | null, on: boolean) => {
      if (!id) return
      const obj = scene.getObjectByName(id)
      if (!obj) return
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        if (mesh.material === CLAY) return
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
          const std = m as THREE.MeshStandardMaterial
          if (std.emissive) {
            if (on) {
              std.emissive.set('#4f6b4a')
              std.emissiveIntensity = 0.35
            } else {
              std.emissive.setHex(0x000000)
              std.emissiveIntensity = 0
            }
          }
        }
      })
    }
    paint(prevHighlight.current, false)
    paint(highlightId, true)
    prevHighlight.current = highlightId
    invalidate()
  }, [scene, highlightId, invalidate])

  const labelItems = useMemo(() => {
    if (!showLabels) return []
    const roomCounts: Record<string, number> = {}
    const items: Array<{ id: string; pos: [number, number, number]; nazev: string }> = []
    for (const [id, item] of Object.entries(furnitureMap)) {
      const count = roomCounts[item.mistnost] ?? 0
      if (count >= 15) continue
      roomCounts[item.mistnost] = count + 1
      items.push({
        id,
        pos: [item.stred_m[0], item.stred_m[1] + 0.15, item.stred_m[2]],
        nazev: item.nazev,
      })
    }
    return items.slice(0, 15)
  }, [showLabels])

  return (
    <group
      ref={groupRef}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerMissed={onPointerMissed}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
    >
      <primitive object={scene} />
      {hoveredId && furnitureMap[hoveredId] && mode === 'orbit' && (
        <Html position={furnitureMap[hoveredId].stred_m} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
          <div className="hover-label">{furnitureMap[hoveredId].nazev}</div>
        </Html>
      )}
      {labelItems.map((item) => (
        <Html key={item.id} position={item.pos} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div className="world-label">{item.nazev}</div>
        </Html>
      ))}
    </group>
  )
}

export function ClippingSync() {
  const sectionHeight = useAppStore((s) => s.sectionHeight)
  const visibilityMode = useAppStore((s) => s.visibilityMode)
  const { gl, scene, invalidate } = useThree()
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.2), [])

  useEffect(() => {
    const enable = visibilityMode === 'section'
    plane.constant = sectionHeight
    gl.localClippingEnabled = enable
    gl.clippingPlanes = enable ? [plane] : []

    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) {
        if (!m) continue
        m.clippingPlanes = enable ? [plane] : null
        m.clipShadows = enable
        m.needsUpdate = true
      }
    })
    CLAY.clippingPlanes = enable ? [plane] : null
    CLAY.needsUpdate = true
    invalidate()
  }, [visibilityMode, sectionHeight, gl, scene, invalidate, plane])

  useEffect(() => {
    return () => {
      gl.localClippingEnabled = false
      gl.clippingPlanes = []
    }
  }, [gl])

  return null
}

export function Model() {
  return <ModelInner />
}

useGLTF.preload(MODEL_URL, true)
