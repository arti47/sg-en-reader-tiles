import { useId } from 'react'
import { bodyColour, hatValue, slotValue } from '../lib/cosmetics'

// M6 §20.3 — the child's chunky, cartoony buddy as a parametric SVG. One expressive creature whose
// body colour + topper vary by character, with state-driven eyes/mouth. Cosmetic slots layer on top:
// background scene, aura effect, wings/backpack (behind body), hat, accessory (front), pet sidekick,
// and particle effect (front). States + cosmetics animate via CSS (disabled under reduced-motion /
// Calm Mode). Cosmetics NEVER affect pedagogy (§20.3).
export type BuddyState = 'idle' | 'cheer' | 'think' | 'sad' | 'celebrate'

export function Buddy(props: {
  character: string
  state?: BuddyState
  colour?: string       // equipped colour cosmetic id
  hat?: string          // equipped hat cosmetic id
  accessory?: string    // equipped accessory cosmetic id
  pet?: string          // equipped pet cosmetic id
  background?: string    // equipped background (scene) cosmetic id
  effect?: string       // equipped effect cosmetic id
  size?: number
}) {
  const state = props.state ?? 'idle'
  const fill = bodyColour(props.character, props.colour)
  const hat = hatValue(props.hat)
  const acc = slotValue(props.accessory)
  const pet = slotValue(props.pet)
  const bg = slotValue(props.background)
  const fx = slotValue(props.effect)
  const size = props.size ?? 120
  const bounce = state === 'cheer' || state === 'celebrate'
  const clip = 'bgclip-' + useId().replace(/:/g, '')
  return (
    <svg className={'buddy buddy-' + state + (bounce ? ' buddy-bounce' : '')} width={size} height={size}
      viewBox="0 0 100 100" role="img" aria-label="Your buddy">
      {/* background scene (framed, rounded) */}
      {bg && <>
        <clipPath id={clip}><rect x="2" y="2" width="96" height="96" rx="16" /></clipPath>
        <g clipPath={`url(#${clip})`}>{scene(bg)}</g>
      </>}
      {/* aura effect behind the body (glow / rainbow rings) */}
      {fx === 'glow' && <circle cx="50" cy="54" r="40" fill="#ffe08a" opacity="0.22" className="buddy-fx-glow" />}
      {fx === 'rainbow' && ['#e0562f', '#f2b134', '#7ad04f', '#4f9de0', '#9b5fe0'].map((c, i) =>
        <circle key={i} cx="50" cy="54" r={44 - i * 3.5} fill="none" stroke={c} strokeWidth="3" opacity="0.5" />)}
      {/* wings / backpack pack — behind the body */}
      {acc === 'wings' && <g fill="#eaf4ff" stroke="#bcd8f0" strokeWidth="1.5" className="buddy-wings">
        <path d="M22 52 C4 40 4 66 20 70 C10 62 14 54 22 52 Z" />
        <path d="M78 52 C96 40 96 66 80 70 C90 62 86 54 78 52 Z" />
      </g>}
      {acc === 'backpack' && <rect x="14" y="42" width="16" height="30" rx="6" fill="#c96f3a" stroke="#00000033" strokeWidth="2" />}

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
      {hat === 'cap' && <><path d="M32 26 Q50 8 68 26 Z" fill="#4f9de0" stroke="#222" strokeWidth="1.5" /><path d="M68 26 Q82 26 84 30 L68 30 Z" fill="#3d84c0" stroke="#222" strokeWidth="1.5" /></>}
      {hat === 'wizard' && <><path d="M50 0 L36 28 L64 28 Z" fill="#5b3fa0" stroke="#222" strokeWidth="1.5" /><circle cx="50" cy="10" r="2" fill="#ffd76a" /><circle cx="45" cy="20" r="1.6" fill="#ffd76a" /></>}
      {hat === 'crown' && <path d="M36 22 L40 10 L50 18 L60 10 L64 22 Z" fill="#ffd76a" stroke="#222" strokeWidth="1.5" />}
      {hat === 'helmet' && <circle cx="50" cy="40" r="34" fill="#bfe6ff44" stroke="#bfe6ff" strokeWidth="2" />}

      {/* accessory — front of the body */}
      {acc === 'glasses' && <g stroke="#111" strokeWidth="2"><circle cx="40" cy="48" r="7" fill="#22243acc" /><circle cx="60" cy="48" r="7" fill="#22243acc" /><line x1="47" y1="48" x2="53" y2="48" /></g>}
      {acc === 'bowtie' && <g stroke="#111" strokeWidth="1.5"><path d="M50 82 L40 77 L40 87 Z" fill="#e0562f" /><path d="M50 82 L60 77 L60 87 Z" fill="#e0562f" /><circle cx="50" cy="82" r="2.5" fill="#a83a1f" /></g>}
      {acc === 'scarf' && <g stroke="#00000022" strokeWidth="1"><path d="M28 78 Q50 86 72 78 L72 84 Q50 92 28 84 Z" fill="#e05a7d" /><path d="M60 82 L66 96 L58 94 Z" fill="#c94667" /></g>}
      {acc === 'headphones' && <g><path d="M22 48 Q50 12 78 48" fill="none" stroke="#333" strokeWidth="3" /><rect x="16" y="46" width="10" height="16" rx="4" fill="#333" /><rect x="74" y="46" width="10" height="16" rx="4" fill="#333" /></g>}
      {acc === 'backpack' && <path d="M30 44 Q42 52 30 68" fill="none" stroke="#00000044" strokeWidth="3" />}

      {/* pet sidekick */}
      {pet && <g className="buddy-pet" transform="translate(78 78)">{petShape(pet)}</g>}

      {/* particle effect — front */}
      {fx === 'sparkle' && <g className="buddy-fx-twinkle" fill="#fff7c2">{spark(20, 30)}{spark(82, 34)}{spark(30, 82)}{spark(74, 78)}</g>}
      {fx === 'stars' && <g className="buddy-fx-orbit" fill="#ffe08a">{star(50, 8, 3)}{star(88, 50, 2.4)}{star(50, 92, 3)}{star(12, 50, 2.4)}</g>}
    </svg>
  )
}

// A pet shown big + centred (for the shop tile — the pet is the product, not a corner sidekick).
export function PetIcon(props: { pet: string; size?: number }) {
  const v = slotValue(props.pet)
  if (!v) return null
  return (
    <svg className="buddy-pet" width={props.size ?? 56} height={props.size ?? 56} viewBox="-18 -18 36 36" role="img" aria-label="Pet">
      {petShape(v)}
    </svg>
  )
}

// A background scene (already clipped to a rounded frame by the caller).
function scene(bg: string) {
  const stars = (pts: [number, number][]) => pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.2" fill="#fff" opacity="0.85" />)
  switch (bg) {
    case 'deepspace': return <><rect x="0" y="0" width="100" height="100" fill="#0b1030" />{stars([[18, 20], [70, 16], [84, 40], [30, 66], [60, 78], [46, 34]])}</>
    case 'nebula': return <><rect x="0" y="0" width="100" height="100" fill="#1a1040" /><circle cx="32" cy="36" r="34" fill="#7a2b6b" opacity="0.65" /><circle cx="72" cy="66" r="28" fill="#2b6b8a" opacity="0.6" />{stars([[20, 70], [80, 24], [52, 14]])}</>
    case 'moon': return <><rect x="0" y="0" width="100" height="100" fill="#0b1030" />{stars([[18, 18], [76, 22], [40, 12]])}<circle cx="50" cy="104" r="42" fill="#b8bcc8" /><circle cx="34" cy="80" r="4" fill="#9aa0ac" /><circle cx="60" cy="86" r="5" fill="#9aa0ac" /><circle cx="48" cy="74" r="3" fill="#9aa0ac" /></>
    case 'planet': return <><rect x="0" y="0" width="100" height="100" fill="#10204a" />{stars([[16, 20], [80, 18], [40, 30]])}<ellipse cx="50" cy="92" rx="46" ry="10" fill="none" stroke="#e0c08a" strokeWidth="3" opacity="0.7" /><circle cx="50" cy="94" r="30" fill="#c98a5a" /></>
    case 'sunset': return <><rect x="0" y="0" width="100" height="52" fill="#6b2f77" /><rect x="0" y="52" width="100" height="48" fill="#e0562f" /><circle cx="50" cy="54" r="16" fill="#ffd76a" /></>
    default: return null
  }
}

// A small 5-point star centred at (cx,cy).
function star(cx: number, cy: number, r: number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  return <polygon points={pts} />
}
// A 4-point sparkle at (x,y).
function spark(x: number, y: number) {
  return <path d={`M${x} ${y - 4} L${x + 1.3} ${y - 1.3} L${x + 4} ${y} L${x + 1.3} ${y + 1.3} L${x} ${y + 4} L${x - 1.3} ${y + 1.3} L${x - 4} ${y} L${x - 1.3} ${y - 1.3} Z`} />
}
// A pet sidekick, drawn around the origin (caller translates to the corner).
function petShape(pet: string) {
  switch (pet) {
    case 'star': return <g stroke="#c99a1f" strokeWidth="1" fill="#ffd76a">{star(0, 0, 10)}<circle cx="-3" cy="-1" r="1.2" fill="#000" /><circle cx="3" cy="-1" r="1.2" fill="#000" /></g>
    case 'moon': return <g><circle cx="0" cy="0" r="10" fill="#f2e9c0" /><circle cx="4" cy="-2" r="8" fill="#d9cfa0" /><circle cx="-3" cy="1" r="1.2" fill="#7a6f45" /></g>
    case 'comet': return <g><path d="M-4 4 L-16 16 L0 6 Z" fill="#bfe6ff" opacity="0.7" /><circle cx="0" cy="0" r="8" fill="#8fd0ff" stroke="#5aa8e0" strokeWidth="1" /><circle cx="-2" cy="-1" r="1.2" fill="#123" /><circle cx="2" cy="-1" r="1.2" fill="#123" /></g>
    case 'bot': return <g stroke="#7a8496" strokeWidth="1"><rect x="-8" y="-7" width="16" height="15" rx="4" fill="#c3ccdb" /><circle cx="-3" cy="-1" r="2" fill="#2b3a6b" /><circle cx="3" cy="-1" r="2" fill="#2b3a6b" /><line x1="0" y1="-7" x2="0" y2="-12" stroke="#7a8496" /><circle cx="0" cy="-13" r="1.6" fill="#ff7ab0" /></g>
    default: return null
  }
}
