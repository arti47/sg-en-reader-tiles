import { useEffect, useState } from 'react'
import type { Child, Inventory, CosmeticSlot } from '../types'
import { ITEMS, SLOTS } from '../lib/cosmetics'
import { getInventory, putInventory, getWallet, buyCosmetic } from '../store'
import { Buddy, PetIcon } from './Buddy'
import { CoinCounter } from './CoinCounter'
import { playSfx } from '../lib/audio-sfx'

// M6.3 §20.3 — the customisation shop. Spend Star Coins on buddy cosmetics across six slots
// (colours, hats, extras, pets, scenes, effects), browsed via category tabs. Buy → own → equip;
// a live buddy preview shows the whole current look. Cosmetic only — never affects pedagogy.
export function Shop(props: { child: Child; onExit: () => void }) {
  const [inv, setInv] = useState<Inventory | null>(null)
  const [coins, setCoins] = useState(0)
  const [tab, setTab] = useState<CosmeticSlot>('colour')
  const character = props.child.buddy?.character ?? 'robo'

  useEffect(() => {
    void (async () => { setInv(await getInventory(props.child.id)); setCoins((await getWallet(props.child.id)).coins) })()
  }, [props.child.id])

  if (!inv) return <div className="stack center"><p className="note">Opening the shop…</p></div>

  async function buy(id: string, cost: number) {
    if (coins < cost || inv!.owned.includes(id)) return
    const { inv: nextInv, wallet } = await buyCosmetic(props.child.id, id, cost)
    playSfx('coin'); setInv(nextInv); setCoins(wallet.coins)
  }
  async function equip(id: string, kind: CosmeticSlot) {
    const equipped = { ...inv!.equipped }
    equipped[kind] = equipped[kind] === id ? undefined : id // tap again to remove
    const next: Inventory = { ...inv!, equipped }
    setInv(next); await putInventory(next); playSfx('tap')
  }

  const shown = ITEMS.filter(it => it.kind === tab)
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="link" onClick={props.onExit}>← Back</button>
        <CoinCounter coins={coins} />
      </div>
      <h1>{props.child.buddy?.name ?? 'Buddy'}'s shop</h1>
      <div className="shop-preview">
        <Buddy character={character} state="cheer" {...inv.equipped} size={150} />
      </div>

      {/* category tabs */}
      <div className="shop-tabs" role="tablist" aria-label="Shop categories">
        {SLOTS.map(s => (
          <button key={s.kind} role="tab" aria-selected={tab === s.kind}
            className={'shop-tab' + (tab === s.kind ? ' on' : '')} onClick={() => setTab(s.kind)}>
            <span aria-hidden="true">{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      <div className="shop-grid">
        {shown.map(it => {
          const owned = inv.owned.includes(it.id)
          const on = inv.equipped[it.kind] === it.id
          const rare = it.rarity && it.rarity !== 'common'
          return (
            <div key={it.id} className={'shop-item' + (on ? ' on' : '') + (rare ? ' r-' + it.rarity : '')}>
              {rare && <span className={'rarity-badge ' + it.rarity} aria-hidden="true">{it.rarity === 'legendary' ? '★ Legendary' : '◆ Rare'}</span>}
              {it.kind === 'colour'
                ? <span className="shop-swatch" style={{ background: it.value }} aria-hidden="true" />
                : it.kind === 'pet'
                  ? <span className="shop-mini" aria-hidden="true"><PetIcon pet={it.id} size={56} /></span>
                  : <span className="shop-mini" aria-hidden="true"><Buddy character={character} state="idle" {...{ [it.kind]: it.id }} size={56} /></span>}
              <span className="shop-name">{it.name}</span>
              {owned
                ? <button className={'btn small' + (on ? '' : ' ghost')} onClick={() => equip(it.id, it.kind)}>{on ? 'Wearing ✓' : 'Wear'}</button>
                : <button className="btn small" disabled={coins < it.cost} onClick={() => buy(it.id, it.cost)}>⭐ {it.cost}</button>}
            </div>
          )
        })}
      </div>
      <p className="note tiny">Earn Star Coins in missions and by learning. Dressing up your buddy is just for fun — it never changes your learning.</p>
    </div>
  )
}
