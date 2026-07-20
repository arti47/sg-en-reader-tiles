export type ItemType = 'grammar_mcq' // M0: one type; expands per CLAUDE.md §6

export interface Choice { id: string; label: string }
export interface PackItem {
  id: string
  skillId: string
  itemType: ItemType
  difficulty: 1 | 2 | 3
  stem: string
  choices: Choice[]
  correctChoiceId: string
  missedConceptOnFail: string
  rationale: string
}
export interface ContentPack {
  packId: string
  strand: string
  skillIds: string[]
  version: number
  items: PackItem[]
}

export interface Child {
  id: string
  name: string
  pLevel: 1 | 2 | 3 | 4 | 5 | 6
  createdAt: number
}
export interface Attempt {
  childId: string
  skillId: string
  itemId: string
  correct: boolean
  ts: number
}
