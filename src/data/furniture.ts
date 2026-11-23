import raw from './nabytek.json'
import type { FurnitureItem, NabytekFile } from '../types'
import { MISTNOST_LABEL } from '../constants'

const data = raw as unknown as NabytekFile

export const neklikatelne = new Set(data._info.neklikatelne)

export const furnitureMap: Record<string, FurnitureItem> = {}
for (const [key, value] of Object.entries(data)) {
  if (key.startsWith('_')) continue
  furnitureMap[key] = value as FurnitureItem
}

export const furnitureIds = Object.keys(furnitureMap)

export function isClickableNode(name: string): boolean {
  return name in furnitureMap && !neklikatelne.has(name)
}

export function resolveFurnitureId(
  object: { name?: string; parent: unknown } | null | undefined,
): string | null {
  let current: { name?: string; parent: unknown } | null | undefined = object
  while (current) {
    if (current.name && isClickableNode(current.name)) return current.name
    current = current.parent as typeof current
  }
  return null
}

export function mistnostLabel(mistnost: string): string {
  return MISTNOST_LABEL[mistnost] ?? mistnost
}

export function furnitureByRoom(): Record<string, Array<{ id: string; item: FurnitureItem }>> {
  const groups: Record<string, Array<{ id: string; item: FurnitureItem }>> = {}
  for (const [id, item] of Object.entries(furnitureMap)) {
    const key = item.mistnost
    if (!groups[key]) groups[key] = []
    groups[key].push({ id, item })
  }
  for (const list of Object.values(groups)) {
    list.sort((a, b) => a.item.nazev.localeCompare(b.item.nazev, 'cs'))
  }
  return groups
}

export const roomOrder = ['loznice', 'chodba', 'koupelna', 'obyvak', 'predsin']
