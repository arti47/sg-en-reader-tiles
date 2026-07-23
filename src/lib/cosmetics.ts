// Cosmetics catalogue lookups (M6 §20.3/§20.7). Pure — cosmetics never affect pedagogy.
import raw from '../data/cosmetics.json'

export interface BuddyDef { id: string; name: string; colour: string }
export interface ItemDef { id: string; kind: 'colour' | 'hat'; name: string; cost: number; value: string }

export const BUDDIES = (raw.buddies as BuddyDef[])
export const ITEMS = (raw.items as ItemDef[])

export const getBuddy = (id: string): BuddyDef | undefined => BUDDIES.find(b => b.id === id)
export const getItem = (id: string): ItemDef | undefined => ITEMS.find(i => i.id === id)

// The buddy's body colour: an equipped colour cosmetic, else the character's default.
export function bodyColour(character: string, equippedColourId?: string): string {
  const item = equippedColourId ? getItem(equippedColourId) : undefined
  return item?.value ?? getBuddy(character)?.colour ?? '#6ad0e0'
}
// The equipped hat's value ('party'|'helmet'|'crown'), if any.
export function hatValue(equippedHatId?: string): string | undefined {
  return equippedHatId ? getItem(equippedHatId)?.value : undefined
}
