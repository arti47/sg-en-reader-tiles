import type { PackItem } from '../types'
import { getPack } from '../lib/packs'
import { McqItem } from './items/McqItem'
import { ClozeItem } from './items/ClozeItem'
import { DictationItem } from './items/DictationItem'

// DEV-only harness route (open with #m3demo). Renders one grammar_cloze, one
// passage_question and one dictation item so the smoke can exercise those renderers +
// deterministic scoring without mastering the whole ladder first. Not linked in the UI.
export function M3Demo() {
  const cloze = getPack('cloze-L01-grammar')?.items[0] as PackItem
  const comp = getPack('comp-L01')?.items[0] as PackItem
  const dict = getPack('dictation-L02-cvc')?.items[0] as PackItem
  if (import.meta.env.DEV) (window as unknown as { __m3?: unknown }).__m3 = { cloze, comp, dict }
  return (
    <div className="stack">
      <h1>M3 demo</h1>
      <div data-testid="m3-cloze"><ClozeItem item={cloze} onAnswer={() => { /* feedback shown inline */ }} /></div>
      <div data-testid="m3-comp"><McqItem item={comp} onAnswer={() => { /* feedback shown inline */ }} /></div>
      <div data-testid="m3-dict"><DictationItem item={dict} onAnswer={() => { /* feedback shown inline */ }} /></div>
    </div>
  )
}
