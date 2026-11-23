#!/usr/bin/env node
/**
 * Porovná klíče z nabytek.json s názvy uzlů v GLB (JSON chunk, bez dekomprese meshů).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nabytek = JSON.parse(readFileSync(join(root, 'src/data/nabytek.json'), 'utf8'))
const glbPath = join(root, 'public/models/byt-v21-web-draco.glb')
const buf = readFileSync(glbPath)

const magic = buf.toString('utf8', 0, 4)
if (magic !== 'glTF') {
  console.error('Neplatný GLB:', glbPath)
  process.exit(1)
}

const jsonChunkLength = buf.readUInt32LE(12)
const jsonChunkType = buf.readUInt32LE(16)
if (jsonChunkType !== 0x4e4f534a) {
  console.error('Očekáván JSON chunk')
  process.exit(1)
}
const gltf = JSON.parse(buf.toString('utf8', 20, 20 + jsonChunkLength))
const nodeNames = new Set((gltf.nodes ?? []).map((n) => n.name).filter(Boolean))

const keys = Object.keys(nabytek).filter((k) => !k.startsWith('_'))
const neklik = nabytek._info?.neklikatelne ?? []

const missing = keys.filter((k) => !nodeNames.has(k))
const missingNeklik = neklik.filter((k) => !nodeNames.has(k))
const extraInModel = [...nodeNames].filter(
  (n) => !keys.includes(n) && !neklik.includes(n),
)

console.log('=== Ověření uzlů GLB vs nabytek.json ===')
console.log(`GLB: ${glbPath}`)
console.log(`Uzly v GLB (pojmenované): ${nodeNames.size}`)
console.log(`Klikací klíče v JSON: ${keys.length}`)
console.log(`Neklikatelné v JSON: ${neklik.length}`)
console.log('')

if (missing.length === 0) {
  console.log(`✓ Všech ${keys.length} klikacích klíčů existuje v modelu.`)
} else {
  console.log(`✗ Chybí v modelu (${missing.length}):`)
  for (const m of missing) console.log(`  - ${m}`)
}

if (missingNeklik.length === 0) {
  console.log(`✓ Všech ${neklik.length} neklikacích uzlů existuje v modelu.`)
} else {
  console.log(`✗ Neklikatelné chybí v modelu (${missingNeklik.length}):`)
  for (const m of missingNeklik) console.log(`  - ${m}`)
}

console.log(`\nPojmenované uzly mimo JSON (ukázka max 20): ${extraInModel.length}`)
for (const n of extraInModel.slice(0, 20)) console.log(`  · ${n}`)

const ok = missing.length === 0 && missingNeklik.length === 0
process.exit(ok ? 0 : 1)
