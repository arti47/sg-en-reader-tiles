// Pack + scope loading and pure lookups (CLAUDE.md §12, §18.7).
import type { ContentPack, PackItem, SkillDef, Lesson, Difficulty } from '../types'
import scope from '../data/scopeAndSequence.json'
import phonicsCvc from '../data/packs/phonics-L02-cvc-short-vowels.json'
import spellingCvc from '../data/packs/spelling-L02-cvc-short-vowels.json'
import phonicsDig from '../data/packs/phonics-L03-digraphs.json'
import spellingDig from '../data/packs/spelling-L03-digraphs.json'
import phonicsBl from '../data/packs/phonics-L04-blends.json'
import spellingBl from '../data/packs/spelling-L04-blends.json'
import phonicsFl from '../data/packs/phonics-L05-floss.json'
import spellingFl from '../data/packs/spelling-L05-floss.json'
import phonicsSe from '../data/packs/phonics-L06-silent-e.json'
import spellingSe from '../data/packs/spelling-L06-silent-e.json'

const PACKS: ContentPack[] = [
  phonicsCvc as ContentPack,
  spellingCvc as ContentPack,
  phonicsDig as ContentPack,
  spellingDig as ContentPack,
  phonicsBl as ContentPack,
  spellingBl as ContentPack,
  phonicsFl as ContentPack,
  spellingFl as ContentPack,
  phonicsSe as ContentPack,
  spellingSe as ContentPack
]

export const SKILLS: SkillDef[] =
  (scope.levels as Array<{ skills: SkillDef[] }>).flatMap(l => l.skills)

export const firstSkillId = (): string => SKILLS[0].id
export const getSkill = (id: string): SkillDef | undefined => SKILLS.find(s => s.id === id)
export const getPack = (packId: string): ContentPack | undefined => PACKS.find(p => p.packId === packId)

export function getLesson(skillId: string): Lesson | undefined {
  const skill = getSkill(skillId); if (!skill) return
  return getPack(skill.itemPool)?.lessons?.[skillId]
}

// Items for a skill at (or below) a difficulty, excluding recently-seen ids (§6d no-repeat).
export function pickItem(skillId: string, difficulty: Difficulty, seen: Set<string>): PackItem | undefined {
  const skill = getSkill(skillId); if (!skill) return
  const pool = getPack(skill.itemPool)?.items.filter(i => i.difficulty <= difficulty) ?? []
  if (!pool.length) return
  const fresh = pool.filter(i => !seen.has(i.id))
  const src = fresh.length ? fresh : pool          // exhausted → recycle
  return src[Math.floor(Math.random() * src.length)]
}

// Next unlocked skill respecting prereqs, given the set of mastered skill ids.
export function nextUnlockedSkill(mastered: Set<string>): SkillDef | undefined {
  return SKILLS.find(s => !mastered.has(s.id) && s.prereqs.every(p => mastered.has(p)))
}
