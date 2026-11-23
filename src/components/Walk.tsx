import { PointerLockControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import {
  COLLISION_RADIUS,
  EYE_HEIGHT_M,
  WALK_SPEED,
  WALK_SPRINT,
} from '../constants'
import { resolveFurnitureId } from '../data/furniture'
import { isTouchDevice } from '../hooks/useIsMobile'
import { kamery, useAppStore } from '../store'
import { collisionWorld } from './Model'

const UP = new THREE.Vector3(0, 1, 0)
const tmp = new THREE.Vector3()
const wish = new THREE.Vector3()
const slide = new THREE.Vector3()
const origin = new THREE.Vector3()
const lookDir = new THREE.Vector3()

function collideAndSlide(
  from: THREE.Vector3,
  delta: THREE.Vector3,
  radius: number,
): THREE.Vector3 {
  const meshes = collisionWorld.meshes
  if (!meshes.length || delta.lengthSq() < 1e-10) return delta

  const raycaster = collisionWorld.raycaster
  const moveDir = delta.clone().normalize()
  const distance = delta.length() + radius
  const heights = [0.4, 1.0]
  const angles = [-0.55, -0.25, 0, 0.25, 0.55]

  const remaining = delta.clone()
  let closest: { dist: number; normal: THREE.Vector3 } | null = null

  for (const h of heights) {
    for (const a of angles) {
      const angled = moveDir.clone().applyAxisAngle(UP, a)
      origin.set(from.x, h, from.z)
      raycaster.set(origin, angled)
      raycaster.far = distance
      raycaster.near = 0
      const hits = raycaster.intersectObjects(meshes, false)
      if (!hits.length) continue
      const hit = hits[0]
      if (hit.distance < radius + 0.02) {
        const n = hit.face
          ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
          : angled.clone().negate()
        n.y = 0
        if (n.lengthSq() < 1e-6) continue
        n.normalize()
        if (!closest || hit.distance < closest.dist) {
          closest = { dist: hit.distance, normal: n }
        }
      }
    }
  }

  if (!closest) return remaining

  const penetration = radius + 0.02 - closest.dist
  if (penetration > 0) {
    remaining.addScaledVector(closest.normal, penetration)
  }
  const into = remaining.dot(closest.normal)
  if (into < 0) {
    remaining.addScaledVector(closest.normal, -into)
  }
  return remaining
}

export function Walk() {
  const mode = useAppStore((s) => s.mode)
  const exitWalk = useAppStore((s) => s.exitWalk)
  const setSelectedId = useAppStore((s) => s.setSelectedId)
  const setWalkAimId = useAppStore((s) => s.setWalkAimId)
  const setCameraPose = useAppStore((s) => s.setCameraPose)
  const { camera, gl, set, scene } = useThree()

  const keys = useRef(new Set<string>())
  const touchMove = useRef({ x: 0, y: 0 })
  const touchLook = useRef({ dx: 0, dy: 0 })
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const touch = useRef(isTouchDevice())
  const pickables = useRef<THREE.Object3D[]>([])

  useEffect(() => {
    if (mode !== 'walk') {
      setWalkAimId(null)
      return
    }

    touch.current = isTouchDevice()
    let cam: THREE.PerspectiveCamera
    if (camera instanceof THREE.PerspectiveCamera) {
      cam = camera
    } else {
      cam = new THREE.PerspectiveCamera(
        70,
        gl.domElement.clientWidth / Math.max(gl.domElement.clientHeight, 1),
        0.05,
        100,
      )
      set({ camera: cam })
    }
    cam.fov = 70
    cam.near = 0.05
    cam.far = 100
    cam.up.set(0, 1, 0)
    cam.updateProjectionMatrix()

    const start = kamery._info.start_volny_pohyb
    const pos = useAppStore.getState().cameraPose
    const inside = pos.x > -1 && pos.x < 5 && pos.z > -1 && pos.z < 16.5

    if (inside) {
      cam.position.set(pos.x, EYE_HEIGHT_M, pos.z)
      cam.lookAt(
        pos.x + Math.sin(pos.yaw),
        EYE_HEIGHT_M,
        pos.z + Math.cos(pos.yaw),
      )
    } else {
      cam.position.set(start.pozice[0], EYE_HEIGHT_M, start.pozice[2])
      cam.lookAt(start.pohled_na[0], EYE_HEIGHT_M, start.pohled_na[2])
    }
    euler.current.setFromQuaternion(cam.quaternion)

    const list: THREE.Object3D[] = []
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) list.push(o)
    })
    pickables.current = list

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.code)
      if (e.code === 'Escape') exitWalk()
      if (e.code === 'KeyE') {
        const aim = useAppStore.getState().walkAimId
        if (aim) setSelectedId(aim)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code)
    const onClick = () => {
      const aim = useAppStore.getState().walkAimId
      if (aim) setSelectedId(aim)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    gl.domElement.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      gl.domElement.removeEventListener('click', onClick)
      keys.current.clear()
    }
  }, [mode, camera, gl, set, scene, exitWalk, setSelectedId, setWalkAimId])

  useEffect(() => {
    if (mode !== 'walk' || !touch.current) return

    const el = gl.domElement
    let looking = false
    let lastX = 0
    let lastY = 0

    const onDown = (e: PointerEvent) => {
      if (e.clientX < window.innerWidth * 0.42) return
      looking = true
      lastX = e.clientX
      lastY = e.clientY
      el.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!looking) return
      touchLook.current.dx += (e.clientX - lastX) * 0.0025
      touchLook.current.dy += (e.clientY - lastY) * 0.0025
      lastX = e.clientX
      lastY = e.clientY
    }
    const onUp = (e: PointerEvent) => {
      looking = false
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
    const onJoy = (e: Event) => {
      const detail = (e as CustomEvent<{ x: number; y: number }>).detail
      touchMove.current.x = detail.x
      touchMove.current.y = detail.y
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    window.addEventListener('walk-joystick', onJoy)

    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      window.removeEventListener('walk-joystick', onJoy)
      touchMove.current = { x: 0, y: 0 }
    }
  }, [mode, gl])

  useFrame((_, dt) => {
    if (mode !== 'walk') return
    const cam = camera
    if (!(cam instanceof THREE.PerspectiveCamera)) return

    const clampedDt = Math.min(dt, 0.05)

    if (touch.current) {
      euler.current.y -= touchLook.current.dx
      euler.current.x -= touchLook.current.dy
      touchLook.current.dx = 0
      touchLook.current.dy = 0
      euler.current.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.current.x))
      cam.quaternion.setFromEuler(euler.current)
    } else {
      euler.current.setFromQuaternion(cam.quaternion)
    }

    wish.set(0, 0, 0)
    const sprint = keys.current.has('ShiftLeft') || keys.current.has('ShiftRight')
    const speed = (sprint ? WALK_SPRINT : WALK_SPEED) * clampedDt

    if (keys.current.has('KeyW') || keys.current.has('ArrowUp')) wish.z -= 1
    if (keys.current.has('KeyS') || keys.current.has('ArrowDown')) wish.z += 1
    if (keys.current.has('KeyA') || keys.current.has('ArrowLeft')) wish.x -= 1
    if (keys.current.has('KeyD') || keys.current.has('ArrowRight')) wish.x += 1

    if (touch.current) {
      wish.x += touchMove.current.x
      wish.z -= touchMove.current.y
    }

    if (wish.lengthSq() > 0) {
      wish.normalize()
      const yaw = euler.current.y
      tmp.set(wish.x, 0, wish.z).applyAxisAngle(UP, yaw).multiplyScalar(speed)

      const pos = cam.position.clone()
      slide.set(tmp.x, 0, 0)
      let moved = collideAndSlide(pos, slide, COLLISION_RADIUS)
      pos.x += moved.x
      slide.set(0, 0, tmp.z)
      moved = collideAndSlide(pos, slide, COLLISION_RADIUS)
      pos.z += moved.z
      cam.position.x = pos.x
      cam.position.z = pos.z
    }

    cam.position.y = EYE_HEIGHT_M

    lookDir.set(0, 0, -1).applyQuaternion(cam.quaternion)
    collisionWorld.raycaster.set(cam.position, lookDir)
    collisionWorld.raycaster.far = 3.5
    const pickHits = collisionWorld.raycaster.intersectObjects(pickables.current, false)
    let aim: string | null = null
    for (const h of pickHits) {
      const id = resolveFurnitureId(h.object)
      if (id) {
        aim = id
        break
      }
    }
    setWalkAimId(aim)
    setCameraPose({ x: cam.position.x, z: cam.position.z, yaw: euler.current.y })
  })

  if (mode !== 'walk') return null

  return (
    <>
      {!touch.current && <PointerLockControls makeDefault />}
    </>
  )
}
