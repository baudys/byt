import { CameraControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CAMERA_TRANSITION_S, ORBIT_MAX_DISTANCE } from '../constants'
import { furnitureMap } from '../data/furniture'
import { kamery, useAppStore } from '../store'
import type { CameraDef, OrthoCameraDef, PerspectiveCameraDef } from '../types'

function isOrtho(c: CameraDef): c is OrthoCameraDef {
  return c.typ === 'ortho'
}

function isPersp(c: CameraDef): c is PerspectiveCameraDef {
  return c.typ === 'perspektiva'
}

function mobileFovBoost(fov: number, width: number): number {
  if (width < 600) return Math.min(fov * 1.25, 100)
  if (width < 900) return Math.min(fov * 1.1, 95)
  return fov
}

/** Ortho pohledy: vlastní pan/zoom — OrbitControls neumí up ≠ +Y. */
function OrthoRig({ def }: { def: OrthoCameraDef }) {
  const { set, size, invalidate, gl } = useThree()
  const camRef = useRef<THREE.OrthographicCamera | null>(null)
  const target = useRef(new THREE.Vector3(...def.cil))
  const zoomScale = useRef(1)

  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1)
    const baseH = def.ortho_vyska_m / 2
    const h = baseH / zoomScale.current
    let cam = camRef.current
    if (!cam) {
      cam = new THREE.OrthographicCamera(-h * aspect, h * aspect, h, -h, 0.05, 200)
      camRef.current = cam
    } else {
      cam.left = -h * aspect
      cam.right = h * aspect
      cam.top = h
      cam.bottom = -h
    }

    const [px, py, pz] = def.pozice
    const [tx, ty, tz] = def.cil
    const up = def.up ?? ([0, 1, 0] as const)
    target.current.set(tx, ty, tz)
    // Drobný offset, ať lookAt není přesně kolmý (stabilnější matice)
    const ox = def.id === 'shora' ? 0.001 : 0
    cam.position.set(px + ox, py, pz)
    cam.up.set(up[0], up[1], up[2])
    cam.lookAt(tx, ty, tz)
    cam.updateMatrixWorld(true)
    cam.updateProjectionMatrix()
    set({ camera: cam })
    invalidate()
    requestAnimationFrame(() => invalidate())
  }, [def, size.width, size.height, set, invalidate])

  useEffect(() => {
    const el = gl.domElement
    let dragging = false
    let lastX = 0
    let lastY = 0

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = Math.exp(e.deltaY * 0.0015)
      zoomScale.current = Math.min(4, Math.max(0.35, zoomScale.current / factor))
      const cam = camRef.current
      if (!cam) return
      const aspect = size.width / Math.max(size.height, 1)
      const h = def.ortho_vyska_m / 2 / zoomScale.current
      cam.left = -h * aspect
      cam.right = h * aspect
      cam.top = h
      cam.bottom = -h
      cam.updateProjectionMatrix()
      invalidate()
    }

    const onDown = (e: PointerEvent) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      el.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const cam = camRef.current
      if (!cam) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY

      // Pan in camera right / up axes
      const right = new THREE.Vector3()
      const up = new THREE.Vector3()
      right.setFromMatrixColumn(cam.matrixWorld, 0).normalize()
      up.setFromMatrixColumn(cam.matrixWorld, 1).normalize()
      const worldPerPx =
        ((cam.top - cam.bottom) / Math.max(size.height, 1))
      const move = right.multiplyScalar(-dx * worldPerPx).add(up.multiplyScalar(dy * worldPerPx))
      cam.position.add(move)
      target.current.add(move)
      cam.lookAt(target.current)
      invalidate()
    }
    const onUp = (e: PointerEvent) => {
      dragging = false
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [gl, def, size.width, size.height, invalidate])

  return null
}

export function ViewCameras() {
  const controlsRef = useRef<CameraControls>(null)
  const mode = useAppStore((s) => s.mode)
  const activeViewId = useAppStore((s) => s.activeViewId)
  const focusRequest = useAppStore((s) => s.focusRequest)
  const setCameraPose = useAppStore((s) => s.setCameraPose)

  const { size, invalidate, set, gl, camera } = useThree()
  const lastView = useRef<string | null>(null)
  const lastFocusToken = useRef(0)
  const defaultPersp = useRef<THREE.PerspectiveCamera | null>(null)

  const activeDef = useMemo(
    () => kamery.kamery.find((c) => c.id === activeViewId),
    [activeViewId],
  )
  const orthoMode = mode === 'orbit' && !!activeDef && isOrtho(activeDef)

  const getPersp = () => {
    if (!defaultPersp.current) {
      defaultPersp.current = new THREE.PerspectiveCamera(
        50,
        size.width / Math.max(size.height, 1),
        0.05,
        100,
      )
    }
    return defaultPersp.current
  }

  useEffect(() => {
    if (mode !== 'orbit' || orthoMode) return
    if (lastView.current === activeViewId) return
    const controls = controlsRef.current
    const def = activeDef
    if (!controls || !def || !isPersp(def)) return

    const cam = getPersp()
    cam.fov = mobileFovBoost(def.fov_vertikalni_st, size.width)
    cam.aspect = size.width / Math.max(size.height, 1)
    cam.near = 0.05
    cam.far = 100
    cam.up.set(0, 1, 0)
    cam.updateProjectionMatrix()
    set({ camera: cam })
    controls.camera = cam
    controls.updateCameraUp()
    controls.smoothTime = CAMERA_TRANSITION_S * 0.45
    controls.maxDistance = ORBIT_MAX_DISTANCE
    controls.minDistance = 0.3

    const [px, py, pz] = def.pozice
    const [tx, ty, tz] = def.cil
    void controls.setLookAt(px, py, pz, tx, ty, tz, true)
    lastView.current = activeViewId
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewId, mode, orthoMode, size.width, size.height])

  useEffect(() => {
    if (orthoMode) lastView.current = activeViewId
  }, [orthoMode, activeViewId])

  useEffect(() => {
    if (!focusRequest || mode !== 'orbit') return
    if (focusRequest.token === lastFocusToken.current) return
    lastFocusToken.current = focusRequest.token

    const item = furnitureMap[focusRequest.id]
    if (!item) return

    // Opustit ortho, ať se připojí CameraControls
    if (orthoMode) {
      useAppStore.setState({ activeViewId: 'obyvak', visibilityMode: 'noCeiling' })
    }

    const cam = getPersp()
    cam.fov = mobileFovBoost(55, size.width)
    cam.aspect = size.width / Math.max(size.height, 1)
    cam.near = 0.05
    cam.far = 100
    cam.up.set(0, 1, 0)
    cam.updateProjectionMatrix()
    set({ camera: cam })
    lastView.current = null

    // Defer until CameraControls remounts after leaving ortho
    requestAnimationFrame(() => {
      const controls = controlsRef.current
      if (!controls) return
      controls.camera = cam
      controls.updateCameraUp()
      controls.maxDistance = ORBIT_MAX_DISTANCE
      const [sx, sy, sz] = item.stred_m
      const dist = 2.2
      void controls.setLookAt(sx + dist * 0.65, sy + 0.85, sz + dist * 0.55, sx, sy, sz, true)
      invalidate()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest, mode, size.width, orthoMode])

  useFrame(() => {
    if (mode !== 'orbit') return
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    const yaw = Math.atan2(dir.x, dir.z)
    setCameraPose({ x: camera.position.x, z: camera.position.z, yaw })
  })

  if (mode !== 'orbit') return null

  if (orthoMode && activeDef && isOrtho(activeDef)) {
    return <OrthoRig def={activeDef} />
  }

  return (
    <CameraControls
      ref={(r) => {
        controlsRef.current = r
        if (
          r &&
          mode === 'orbit' &&
          !orthoMode &&
          lastView.current !== activeViewId &&
          activeDef &&
          isPersp(activeDef)
        ) {
          const cam = getPersp()
          cam.fov = mobileFovBoost(activeDef.fov_vertikalni_st, size.width)
          cam.aspect = size.width / Math.max(size.height, 1)
          cam.updateProjectionMatrix()
          set({ camera: cam })
          r.camera = cam
          r.updateCameraUp()
          const [px, py, pz] = activeDef.pozice
          const [tx, ty, tz] = activeDef.cil
          void r.setLookAt(px, py, pz, tx, ty, tz, false)
          lastView.current = activeViewId
          invalidate()
        }
      }}
      makeDefault
      dollySpeed={0.8}
      truckSpeed={0.6}
      onChange={() => {
        invalidate()
        gl.domElement.style.touchAction = 'none'
      }}
    />
  )
}
