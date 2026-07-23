import { bodyColour, hatValue } from '../lib/cosmetics'

// M6 §20.3 — the child's chunky, cartoony buddy as a parametric SVG. One expressive creature whose
// body colour + topper vary by character, with state-driven eyes/mouth and an optional hat. States
// animate via CSS (disabled under reduced-motion / Calm Mode).
export type BuddyState = 'idle' | 'cheer' | 'think' | 'sad' | 'celebrate'

export function Buddy(props: {
  character: string
  state?: BuddyState
  colour?: string   // equipped colour cosmetic id
  hat?: string      // equipped hat cosmetic id
  size?: number
}) {
  const state = props.state ?? 'idle'
  const fill = bodyColour(props.character, props.colour)
  const hat = hatValue(props.hat)
  const size = props.size ?? 120
  const bounce = state === 'cheer' || state === 'celebrate'
  return (
    <svg className={'buddy buddy-' + state + (bounce ? ' buddy-bounce' : '')} width={size} height={size}
      viewBox="0 0 100 100" role="img" aria-label="Your buddy">
      {/* character-specific topper (behind the body) */}
      {props.character === 'robo' && <>
        <line x1="50" y1="8" x2="50" y2="22" stroke="#555" strokeWidth="3" />
        <circle cx="50" cy="7" r="4" fill="#ffd76a" />
      </>}
      {props.character === 'alien' && <>
        <line x1="38" y1="14" x2="34" y2="4" stroke="#555" strokeWidth="3" /><circle cx="34" cy="3" r="3" fill="#ff7ab0" />
        <line x1="62" y1="14" x2="66" y2="4" stroke="#555" strokeWidth="3" /><circle cx="66" cy="3" r="3" fill="#ff7ab0" />
      </>}
      {/* body */}
      {props.character === 'blob'
        ? <path d="M50 20 C78 20 84 46 82 62 C80 82 66 90 50 90 C34 90 20 82 18 62 C16 46 22 20 50 20 Z" fill={fill} stroke="#00000022" strokeWidth="2" />
        : <rect x="20" y="24" width="60" height="60" rx="20" fill={fill} stroke="#00000022" strokeWidth="2" />}
      {/* cheeks */}
      <circle cx="32" cy="60" r="5" fill="#ffffff33" /><circle cx="68" cy="60" r="5" fill="#ffffff33" />
      {/* eyes */}
      {state === 'celebrate' || state === 'cheer'
        ? <><path d="M34 46 l6 -5 l6 5" fill="none" stroke="#222" strokeWidth="3" strokeLinecap="round" /><path d="M54 46 l6 -5 l6 5" fill="none" stroke="#222" strokeWidth="3" strokeLinecap="round" /></>
        : <><circle cx="40" cy="48" r={state === 'think' ? 4 : 5} fill="#222" /><circle cx="60" cy="48" r={state === 'think' ? 4 : 5} fill="#222" />
            <circle cx="42" cy="46" r="1.6" fill="#fff" /><circle cx="62" cy="46" r="1.6" fill="#fff" /></>}
      {/* mouth per state */}
      {state === 'sad' && <path d="M40 70 Q50 62 60 70" fill="none" stroke="#222" strokeWidth="3" strokeLinecap="round" />}
      {state === 'think' && <line x1="44" y1="68" x2="56" y2="68" stroke="#222" strokeWidth="3" strokeLinecap="round" />}
      {(state === 'idle') && <path d="M40 66 Q50 74 60 66" fill="none" stroke="#222" strokeWidth="3" strokeLinecap="round" />}
      {(state === 'cheer' || state === 'celebrate') && <path d="M38 64 Q50 80 62 64 Z" fill="#7a2b2b" stroke="#222" strokeWidth="2" />}
      {/* hat */}
      {hat === 'party' && <path d="M50 6 L40 26 L60 26 Z" fill="#ff5a7d" stroke="#222" strokeWidth="1.5" />}
      {hat === 'crown' && <path d="M36 22 L40 10 L50 18 L60 10 L64 22 Z" fill="#ffd76a" stroke="#222" strokeWidth="1.5" />}
      {hat === 'helmet' && <><circle cx="50" cy="40" r="34" fill="#bfe6ff44" stroke="#bfe6ff" strokeWidth="2" /></>}
    </svg>
  )
}
