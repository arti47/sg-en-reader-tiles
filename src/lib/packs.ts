// Pack + scope loading and pure lookups (CLAUDE.md §12, §18.7).
import type { ContentPack, PackItem, SkillDef, Lesson, Difficulty } from '../types'
import scope from '../data/scopeAndSequence.json'
import phonicsLs from '../data/packs/phonics-L01-letter-sounds.json'
import phonicsCvc1 from '../data/packs/phonics-L02a-cvc-1.json'
import spellingCvc1 from '../data/packs/spelling-L02a-cvc-1.json'
import phonicsCvc2 from '../data/packs/phonics-L02b-cvc-2.json'
import spellingCvc2 from '../data/packs/spelling-L02b-cvc-2.json'
import phonicsCvc3 from '../data/packs/phonics-L02c-cvc-3.json'
import spellingCvc3 from '../data/packs/spelling-L02c-cvc-3.json'
import phonicsCvc4 from '../data/packs/phonics-L02d-cvc-4.json'
import spellingCvc4 from '../data/packs/spelling-L02d-cvc-4.json'
import phonicsDig from '../data/packs/phonics-L03-digraphs.json'
import spellingDig from '../data/packs/spelling-L03-digraphs.json'
import phonicsBl from '../data/packs/phonics-L04-blends.json'
import spellingBl from '../data/packs/spelling-L04-blends.json'
import phonicsFl from '../data/packs/phonics-L05-floss.json'
import spellingFl from '../data/packs/spelling-L05-floss.json'
import phonicsSe from '../data/packs/phonics-L06-silent-e.json'
import spellingSe from '../data/packs/spelling-L06-silent-e.json'
import phonicsVtA from '../data/packs/phonics-L07a-vowel-teams-a.json'
import spellingVtA from '../data/packs/spelling-L07a-vowel-teams-a.json'
import phonicsVtB from '../data/packs/phonics-L07b-vowel-teams-b.json'
import spellingVtB from '../data/packs/spelling-L07b-vowel-teams-b.json'
import phonicsRcA from '../data/packs/phonics-L08a-r-controlled-a.json'
import spellingRcA from '../data/packs/spelling-L08a-r-controlled-a.json'
import phonicsRcB from '../data/packs/phonics-L08b-r-controlled-b.json'
import spellingRcB from '../data/packs/spelling-L08b-r-controlled-b.json'
import phonicsDiA from '../data/packs/phonics-L09a-diphthongs-a.json'
import spellingDiA from '../data/packs/spelling-L09a-diphthongs-a.json'
import phonicsDiB from '../data/packs/phonics-L09b-diphthongs-b.json'
import spellingDiB from '../data/packs/spelling-L09b-diphthongs-b.json'
import phonics2s from '../data/packs/phonics-L10-two-syllable.json'
import spelling2s from '../data/packs/spelling-L10-two-syllable.json'
import phonicsSf from '../data/packs/phonics-L11-suffixes.json'
import spellingSf from '../data/packs/spelling-L11-suffixes.json'
import phonicsHf from '../data/packs/phonics-L12-hf.json'
import dictationCvc from '../data/packs/dictation-L02-cvc.json'
import dictationDig from '../data/packs/dictation-L03-digraphs.json'
import grArticles from '../data/packs/grammar-L01-articles.json'
import grSva from '../data/packs/grammar-L02-sva.json'
import grTenses from '../data/packs/grammar-L03-tenses.json'
import vocSyn from '../data/packs/vocab-L01-synonyms.json'
import vocAnt from '../data/packs/vocab-L02-antonyms.json'
import vocCtx from '../data/packs/vocab-L03-context.json'
import comp1 from '../data/packs/comp-L01.json'
import comp2 from '../data/packs/comp-L02.json'
import cloze1 from '../data/packs/cloze-L01-grammar.json'
import cloze2 from '../data/packs/cloze-L02-vocab.json'
import smEdit from '../data/packs/sm-L01-editing.json'
import smSyn from '../data/packs/sm-L02-synthesis.json'
import reading1 from '../data/packs/reading-L01-cvc.json'
import reading2 from '../data/packs/reading-L02-digraphs.json'
import reading3 from '../data/packs/reading-L03-blends.json'
import reading4 from '../data/packs/reading-L04-silent-e.json'
import reading5 from '../data/packs/reading-L05-vowel-teams.json'
import reading6 from '../data/packs/reading-L06-r-controlled.json'
import reading7 from '../data/packs/reading-L07-diphthongs.json'
import reading8 from '../data/packs/reading-L08-two-syllable.json'

const PACKS: ContentPack[] = [
  phonicsLs as ContentPack,
  phonicsCvc1 as ContentPack,
  spellingCvc1 as ContentPack,
  phonicsCvc2 as ContentPack,
  spellingCvc2 as ContentPack,
  phonicsCvc3 as ContentPack,
  spellingCvc3 as ContentPack,
  phonicsCvc4 as ContentPack,
  spellingCvc4 as ContentPack,
  phonicsDig as ContentPack,
  spellingDig as ContentPack,
  phonicsBl as ContentPack,
  spellingBl as ContentPack,
  phonicsFl as ContentPack,
  spellingFl as ContentPack,
  phonicsSe as ContentPack,
  spellingSe as ContentPack,
  phonicsVtA as ContentPack,
  spellingVtA as ContentPack,
  phonicsVtB as ContentPack,
  spellingVtB as ContentPack,
  phonicsRcA as ContentPack,
  spellingRcA as ContentPack,
  phonicsRcB as ContentPack,
  spellingRcB as ContentPack,
  phonicsDiA as ContentPack,
  spellingDiA as ContentPack,
  phonicsDiB as ContentPack,
  spellingDiB as ContentPack,
  phonics2s as ContentPack,
  spelling2s as ContentPack,
  phonicsSf as ContentPack,
  spellingSf as ContentPack,
  phonicsHf as ContentPack,
  dictationCvc as ContentPack,
  dictationDig as ContentPack,
  grArticles as ContentPack,
  grSva as ContentPack,
  grTenses as ContentPack,
  vocSyn as ContentPack,
  vocAnt as ContentPack,
  vocCtx as ContentPack,
  comp1 as ContentPack,
  comp2 as ContentPack,
  cloze1 as ContentPack,
  cloze2 as ContentPack,
  smEdit as ContentPack,
  smSyn as ContentPack,
  reading1 as ContentPack,
  reading2 as ContentPack,
  reading3 as ContentPack,
  reading4 as ContentPack,
  reading5 as ContentPack,
  reading6 as ContentPack,
  reading7 as ContentPack,
  reading8 as ContentPack
]

// Runtime skill graph. Skills flagged `enabled: false` (authored but inert — e.g. T01
// pending phoneme audio) are dropped, and any prereq pointing at a dropped skill is
// stripped so the remaining graph stays valid (a disabled foundation doesn't block its
// dependants). Flip `enabled` in scope + ship the assets to activate.
const RAW_SKILLS: SkillDef[] = (scope.levels as Array<{ skills: SkillDef[] }>).flatMap(l => l.skills)
const ENABLED = new Set(RAW_SKILLS.filter(s => s.enabled !== false).map(s => s.id))
export const SKILLS: SkillDef[] = RAW_SKILLS
  .filter(s => s.enabled !== false)
  .map(s => ({ ...s, prereqs: s.prereqs.filter(p => ENABLED.has(p)) }))

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
