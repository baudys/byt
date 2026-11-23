import { useAppStore } from '../store'

/** Bounding box bytu v metrech (půdorys XZ) */
const BOUNDS = { minX: -0.85, maxX: 4.3, minZ: -0.3, maxZ: 15.8 }
const W = 120
const H = 180

function toSvg(x: number, z: number): { cx: number; cy: number } {
  const cx = ((x - BOUNDS.minX) / (BOUNDS.maxX - BOUNDS.minX)) * W
  const cy = ((z - BOUNDS.minZ) / (BOUNDS.maxZ - BOUNDS.minZ)) * H
  return { cx, cy }
}

export function Minimap() {
  const pose = useAppStore((s) => s.cameraPose)
  const { cx, cy } = toSvg(pose.x, pose.z)
  const angle = (-pose.yaw * 180) / Math.PI

  return (
    <div className="minimap" aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <rect x="0" y="0" width={W} height={H} rx="8" className="minimap-bg" />
        {/* zjednodušený obrys místností */}
        <rect x="8" y="4" width={W - 16} height={H * 0.32} rx="3" className="minimap-room" />
        <text x={W / 2} y={H * 0.18} textAnchor="middle" className="minimap-label">
          ložnice
        </text>
        <rect x="8" y={H * 0.34} width={W - 16} height={H * 0.18} rx="3" className="minimap-room" />
        <text x={W / 2} y={H * 0.44} textAnchor="middle" className="minimap-label">
          chodba
        </text>
        <rect x="8" y={H * 0.54} width={W - 16} height={H * 0.42} rx="3" className="minimap-room" />
        <text x={W / 2} y={H * 0.74} textAnchor="middle" className="minimap-label">
          obývák
        </text>
        <g transform={`translate(${cx}, ${cy}) rotate(${angle})`}>
          <circle r="4" className="minimap-dot" />
          <polygon points="0,-10 4,-2 -4,-2" className="minimap-cone" />
        </g>
      </svg>
    </div>
  )
}
