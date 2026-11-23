import { Environment, useProgress } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import * as THREE from 'three'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAppStore } from '../store'
import { ClippingSync, Model } from './Model'
import { ViewCameras } from './ViewCameras'
import { Walk } from './Walk'

function LoaderOverlay() {
  const { progress, active } = useProgress()
  if (!active && progress >= 100) return null
  return (
    <div className="loader-overlay" role="status" aria-live="polite">
      <div className="loader-card">
        <p>Načítám byt… {Math.round(progress)} %</p>
        <div className="loader-bar">
          <div className="loader-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}

function Lights({ mobile }: { mobile: boolean }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[4, 8, 6]}
        intensity={0.55}
        castShadow={!mobile}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <Environment preset="apartment" environmentIntensity={0.65} />
    </>
  )
}

function SceneContent({ mobile }: { mobile: boolean }) {
  return (
    <>
      <color attach="background" args={['#e8e4da']} />
      <Lights mobile={mobile} />
      <ClippingSync />
      <Model />
      <ViewCameras />
      <Walk />
    </>
  )
}

export function Scene() {
  const mode = useAppStore((s) => s.mode)
  const mobile = useIsMobile()

  useEffect(() => {
    document.documentElement.classList.toggle('walk-mode', mode === 'walk')
  }, [mode])

  return (
    <div className="scene-root">
      <Canvas
        shadows={!mobile}
        dpr={[1, mobile ? 1.5 : 2]}
        frameloop={mode === 'walk' ? 'always' : 'demand'}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
          localClippingEnabled: true,
        }}
        camera={{ position: [2.62, 1.65, 13.98], fov: 62, near: 0.05, far: 100 }}
        onCreated={({ gl, invalidate }) => {
          gl.toneMappingExposure = 1.05
          gl.shadowMap.type = THREE.PCFShadowMap
          invalidate()
        }}
      >
        <Suspense fallback={null}>
          <SceneContent mobile={mobile} />
        </Suspense>
      </Canvas>
      <LoaderOverlay />
    </div>
  )
}
