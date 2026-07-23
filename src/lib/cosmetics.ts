// Cosmetics catalogue lookups (M6 §20.3/§20.7). Pure — cosmetics never affect pedagogy.
import raw from '../data/cosmetics.json'

import type { CosmeticSlot } from '../types'
export interface BuddyDef { id: string; name: string; colour: string }
export type Rarity = 'common' | 'rare' | 'legendary'
export interface ItemDef { id: string; kind: CosmeticSlot; name: string; cost: number; value: string; rarity?: Rarity }
// The equip slots the shop offers, in display order (tab order).
export const SLOTS: { kind: CosmeticSlot; label: string; icon: string }[] = [
  { kind: 'colour', label: 'Colours', icon: '🎨' },
  { kind: 'hat', label: 'Hats', icon: '🎩' },
  { kind: 'accessory', label: 'Extras', icon: '🕶️' },
  { kind: 'pet', label: 'Pets', icon: '⭐' },
  { kind: 'background', label: 'Scenes', icon: '🌌' },
  { kind: 'effect', label: 'Effects', icon: '✨' }
]

export const BUDDIES = (raw.buddies as BuddyDef[])
export const ITEMS = (raw.items as ItemDef[])

export const getBuddy = (id: string): BuddyDef | undefined => BUDDIES.find(b => b.id === id)
export const getItem = (id: string): ItemDef | undefined => ITEMS.find(i => i.id === id)

// The buddy's body colour: an equipped colour cosmetic, else the character's default.
export function bodyColour(character: string, equippedColourId?: string): string {
  const item = equippedColourId ? getItem(equippedColourId) : undefined
  return item?.value ?? getBuddy(character)?.colour ?? '#6ad0e0'
}
// The equipped hat's value ('party'|'helmet'|'crown'…), if any.
export function hatValue(equippedHatId?: string): string | undefined {
  return equippedHatId ? getItem(equippedHatId)?.value : undefined
}
// Generic: the render `value` of any equipped cosmetic id (accessory/pet/background/effect).
export function slotValue(equippedId?: string): string | undefined {
  return equippedId ? getItem(equippedId)?.value : undefined
}
