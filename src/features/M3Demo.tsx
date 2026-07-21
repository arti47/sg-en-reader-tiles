import type { PackItem } from '../types'
import { getPack } from '../lib/packs'
import { McqItem } from './items/McqItem'
import { ClozeItem } from './items/ClozeItem'

// DEV-only harness route (open with #m3demo). Renders one grammar_cloze and one
// passage_question so the smoke can exercise the M3 renderers + deterministic scoring
// without having to master the whole decode ladder first. Not linked in the UI.
export function M3Demo() {
  const cloze = getPack('cloze-L01-grammar')?.items[0] as PackItem
  const comp = getPack('comp-L01')?.items[0] as PackItem
  if (import.meta.env.DEV) (window as unknown as { __m3?: unknown }).__m3 = { cloze, comp }
  return (
    <div className="stack">
      <h1>M3 demo</h1>
      <div data-testid="m3-cloze"><ClozeItem item={cloze} onAnswer={() => { /* feedback shown inline */ }} /></div>
      <div data-testid="m3-comp"><McqItem item={comp} onAnswer={() => { /* feedback shown inline */ }} /></div>
    </div>
  )
}
