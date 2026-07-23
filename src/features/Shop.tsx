import { useEffect, useState } from 'react'
import type { Child, Inventory } from '../types'
import { ITEMS } from '../lib/cosmetics'
import { getInventory, putInventory, getWallet, buyCosmetic } from '../store'
import { Buddy } from './Buddy'
import { CoinCounter } from './CoinCounter'
import { playSfx } from '../lib/audio-sfx'

// M6.3 §20.3 — the customisation shop. Spend Star Coins on buddy colours + hats (cosmetic only,
// never affects pedagogy). Buy → own → equip; a live buddy preview shows the current look.
export function Shop(props: { child: Child; onExit: () => void }) {
  const [inv, setInv] = useState<Inventory | null>(null)
  const [coins, setCoins] = useState(0)
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
  async function equip(id: string, kind: 'colour' | 'hat') {
    const equipped = { ...inv!.equipped }
    equipped[kind] = equipped[kind] === id ? undefined : id // tap again to remove
    const next: Inventory = { ...inv!, equipped }
    setInv(next); await putInventory(next); playSfx('tap')
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="link" onClick={props.onExit}>← Back</button>
        <CoinCounter coins={coins} />
      </div>
      <h1>{props.child.buddy?.name ?? 'Buddy'}'s shop</h1>
      <div className="shop-preview">
        <Buddy character={character} state="cheer" colour={inv.equipped.colour} hat={inv.equipped.hat} size={130} />
      </div>
      <div className="shop-grid">
        {ITEMS.map(it => {
          const owned = inv.owned.includes(it.id)
          const on = inv.equipped[it.kind] === it.id
          return (
            <div key={it.id} className={'shop-item' + (on ? ' on' : '')}>
              {it.kind === 'colour'
                ? <span className="shop-swatch" style={{ background: it.value }} aria-hidden="true" />
                : <span className="shop-hat" aria-hidden="true"><Buddy character={character} state="idle" hat={it.id} size={48} /></span>}
              <span className="shop-name">{it.name}</span>
              {owned
                ? <button className={'btn small' + (on ? '' : ' ghost')} onClick={() => equip(it.id, it.kind)}>{on ? 'Equipped ✓' : 'Wear'}</button>
                : <button className="btn small" disabled={coins < it.cost} onClick={() => buy(it.id, it.cost)}>⭐ {it.cost}</button>}
            </div>
          )
        })}
      </div>
      <p className="note tiny">Earn Star Coins by answering in missions. Wearing things is just for fun — it doesn't change your learning.</p>
    </div>
  )
}
