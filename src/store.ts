// IndexedDB persistence (CLAUDE.md §11). No deps.
import type { Child, Attempt, SkillProgress, Certificate, Review, Aggregate, Daily, Usage, Settings, LearnState, Wallet, Inventory, DailyGoal } from './types'
import { DAILY_TARGET } from './lib/economy'
export const SCHEMA_VERSION = 9
const DB = 'sg-reader'; const VER = SCHEMA_VERSION

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, VER)
    r.onupgradeneeded = (e) => {
      const db = r.result
      const oldV = e.oldVersion // 0 = fresh install; migrations are additive + oldVersion-guarded
      if (!db.objectStoreNames.contains('children')) db.createObjectStore('children', { keyPath: 'id' })
      if (oldV < 2) {
        // v1 keyed attempts by ts (collision risk); v2 rekeys by uuid + childId index.
        if (db.objectStoreNames.contains('attempts')) db.deleteObjectStore('attempts')
        const at = db.createObjectStore('attempts', { keyPath: 'id' })
        at.createIndex('childId', 'childId', { unique: false })
        if (!db.objectStoreNames.contains('progress')) db.createObjectStore('progress', { keyPath: 'key' })
        if (!db.objectStoreNames.contains('certificates')) db.createObjectStore('certificates', { keyPath: 'key' })
      }
      if (oldV < 3) {
        // v3 adds spaced-repetition review scheduling (§7).
        if (!db.objectStoreNames.contains('reviews')) db.createObjectStore('reviews', { keyPath: 'key' })
      }
      if (oldV < 4) {
        // v4 adds M2 analytics: weekly aggregates (never rolled off), usage/streak, settings.
        if (!db.objectStoreNames.contains('aggregates')) db.createObjectStore('aggregates', { keyPath: 'key' })
        if (!db.objectStoreNames.contains('usage')) db.createObjectStore('usage', { keyPath: 'childId' })
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' })
      }
      if (oldV < 5) {
        // v5 adds per-day rollups for the daily view of the trend chart.
        if (!db.objectStoreNames.contains('daily')) db.createObjectStore('daily', { keyPath: 'key' })
      }
      if (oldV < 6) {
        // v6 adds M5 Learn/Test dual-mode per-pattern learn state (§19.4).
        if (!db.objectStoreNames.contains('learn')) db.createObjectStore('learn', { keyPath: 'key' })
      }
      if (oldV < 7) {
        // v7 adds M6 (§20.7) Star Coins wallet — additive reward state.
        if (!db.objectStoreNames.contains('wallet')) db.createObjectStore('wallet', { keyPath: 'childId' })
      }
      if (oldV < 8) {
        // v8 adds M6.3 (§20.7) customisation inventory (owned + equipped cosmetics).
        if (!db.objectStoreNames.contains('inventory')) db.createObjectStore('inventory', { keyPath: 'childId' })
      }
      if (oldV < 9) {
        // v9 adds M6.4 (§20.7) daily goal + streak.
        if (!db.objectStoreNames.contains('dailygoal')) db.createObjectStore('dailygoal', { keyPath: 'childId' })
      }
    }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
function req<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(db => new Promise<T>((res, rej) => {
    const t = db.transaction(store, mode); const rq = fn(t.objectStore(store))
    rq.onsuccess = () => res(rq.result as T); rq.onerror = () => rej(rq.error)
  }))
}

// Children
export const getChildren = () => req<Child[]>('children', 'readonly', s => s.getAll())
export const addChild = (c: Child) => req('children', 'readwrite', s => s.put(c))

// Attempts. Raw attempts are capped per child (§11): mastery/SRS use rolling windows and the
// never-truncated `aggregates`/`daily` stores back the trend charts, so old raw rows are safe to
// roll off — this bounds storage (the §13 eviction risk) without affecting any signal. Trimming
// runs only when a child crosses the cap; the oldest (by ts) overflow rows are deleted.
export const ATTEMPTS_CAP = 4000
export async function addAttempt(a: Attempt): Promise<void> {
  await req('attempts', 'readwrite', s => s.put(a))
  const n = await req<number>('attempts', 'readonly', s => s.index('childId').count(a.childId))
  if (n <= ATTEMPTS_CAP) return
  const rows = await getAttempts(a.childId)
  const doomed = rows.sort((x, y) => x.ts - y.ts).slice(0, rows.length - ATTEMPTS_CAP).map(r => r.id)
  await run(['attempts'], 'readwrite', t => { const st = t.objectStore('attempts'); for (const id of doomed) st.delete(id) })
}
export const getAttempts = (childId: string) =>
  req<Attempt[]>('attempts', 'readonly', s => s.index('childId').getAll(childId))

// Progress — keyed "childId::skillId"
const pKey = (childId: string, skillId: string) => `${childId}::${skillId}`
export const getProgress = (childId: string) =>
  req<Array<SkillProgress & { key: string }>>('progress', 'readonly', s => s.getAll())
    .then(rows => rows.filter(r => r.key.startsWith(childId + '::')))
export const putProgress = (childId: string, p: SkillProgress) =>
  req('progress', 'readwrite', s => s.put({ ...p, key: pKey(childId, p.skillId) }))

// Certificates — keyed "childId::skillId" (idempotent award)
export const getCertificates = (childId: string) =>
  req<Array<Certificate & { key: string }>>('certificates', 'readonly', s => s.getAll())
    .then(rows => rows.filter(r => r.key.startsWith(childId + '::')))
export const putCertificate = (childId: string, c: Certificate) =>
  req('certificates', 'readwrite', s => s.put({ ...c, key: pKey(childId, c.skillId) }))

// Reviews (spaced repetition) — keyed "childId::skillId"
export const getReviews = (childId: string) =>
  req<Array<Review & { key: string }>>('reviews', 'readonly', s => s.getAll())
    .then(rows => rows.filter(r => r.key.startsWith(childId + '::')))
export const putReview = (childId: string, rv: Review) =>
  req('reviews', 'readwrite', s => s.put({ ...rv, key: pKey(childId, rv.skillId) }))

// Aggregates (weekly rollups) — keyed "childId::week::skillId"
const aKey = (childId: string, week: string, skillId: string) => `${childId}::${week}::${skillId}`
export const getAggregates = (childId: string) =>
  req<Array<Aggregate & { key: string }>>('aggregates', 'readonly', s => s.getAll())
    .then(rows => rows.filter(r => r.key.startsWith(childId + '::')))
// Add one attempt's worth of activity to (child, week, skill): read-modify-write.
export async function bumpAggregate(childId: string, skillId: string, week: string, correct: boolean, minutes: number): Promise<void> {
  const key = aKey(childId, week, skillId)
  const prev = await req<(Aggregate & { key: string }) | undefined>('aggregates', 'readonly', s => s.get(key))
  const next: Aggregate & { key: string } = {
    key, childId, week, skillId,
    items: (prev?.items ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    minutes: (prev?.minutes ?? 0) + minutes
  }
  await req('aggregates', 'readwrite', s => s.put(next))
}

// Daily rollups — keyed "childId::YYYY-MM-DD" (per-day totals across skills)
const dKey = (childId: string, day: string) => `${childId}::${day}`
export const getDaily = (childId: string) =>
  req<Array<Daily & { key: string }>>('daily', 'readonly', s => s.getAll())
    .then(rows => rows.filter(r => r.key.startsWith(childId + '::')))
export async function bumpDaily(childId: string, day: string, correct: boolean, minutes: number): Promise<void> {
  const key = dKey(childId, day)
  const prev = await req<(Daily & { key: string }) | undefined>('daily', 'readonly', s => s.get(key))
  const next: Daily & { key: string } = {
    key, childId, day,
    items: (prev?.items ?? 0) + 1,
    correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
    minutes: (prev?.minutes ?? 0) + minutes
  }
  await req('daily', 'readwrite', s => s.put(next))
}

// Learn state (M5 dual-mode, §19.4) — keyed "childId::patternId"
export const getLearn = (childId: string) =>
  req<Array<LearnState & { key: string }>>('learn', 'readonly', s => s.getAll())
    .then(rows => rows.filter(r => r.key.startsWith(childId + '::')))
export const putLearn = (childId: string, row: LearnState) =>
  req('learn', 'readwrite', s => s.put({ ...row, key: pKey(childId, row.patternId) }))
async function updateLearn(childId: string, patternId: string, patch: Partial<LearnState>): Promise<void> {
  const key = pKey(childId, patternId)
  const prev = await req<(LearnState & { key: string }) | undefined>('learn', 'readonly', s => s.get(key))
  const base: LearnState = prev ?? { patternId, learned: false, needsReview: false }
  await req('learn', 'readwrite', s => s.put({ ...base, ...patch, patternId, key }))
}
export const setLearned = (childId: string, patternId: string) =>
  updateLearn(childId, patternId, { learned: true, needsReview: false, learnedAt: Date.now() })
export const flagReview = (childId: string, patternId: string) =>
  updateLearn(childId, patternId, { needsReview: true, flaggedAt: Date.now() })
export const clearReview = (childId: string, patternId: string) =>
  updateLearn(childId, patternId, { needsReview: false })

// Usage / streak (§14)
export const getUsage = (childId: string) =>
  req<Usage | undefined>('usage', 'readonly', s => s.get(childId))
export const putUsage = (u: Usage) => req('usage', 'readwrite', s => s.put(u))

// Settings (single row keyed "app")
export const getSettings = () =>
  req<(Settings & { key: string }) | undefined>('settings', 'readonly', s => s.get('app'))
    .then(r => r ?? { key: 'app', ttsRate: 0.4, englishVariant: 'en-SG' as const, sessionLength: 16 })
export const putSettings = (st: Settings) => req('settings', 'readwrite', s => s.put({ ...st, key: 'app' }))

// Star Coins wallet (M6 §20.7). additive reward state — never read by the pedagogy engine.
export const getWallet = (childId: string) =>
  req<Wallet | undefined>('wallet', 'readonly', s => s.get(childId))
    .then(w => w ?? { childId, coins: 0, lifetimeCoins: 0 })
export async function addCoins(childId: string, n: number): Promise<Wallet> {
  const w = await getWallet(childId)
  const next: Wallet = { childId, coins: w.coins + n, lifetimeCoins: w.lifetimeCoins + Math.max(0, n) }
  await req('wallet', 'readwrite', s => s.put(next))
  return next
}

// Customisation inventory (M6.3 §20.7). Cosmetic-only.
export const getInventory = (childId: string) =>
  req<Inventory | undefined>('inventory', 'readonly', s => s.get(childId))
    .then(i => i ?? { childId, owned: [], equipped: {} })
export const putInventory = (inv: Inventory) => req('inventory', 'readwrite', s => s.put(inv))

// Daily goal + streak (M6.4 §20.7).
export const getDailyGoal = (childId: string) =>
  req<DailyGoal | undefined>('dailygoal', 'readonly', s => s.get(childId))
    .then(d => d ?? { childId, day: '', progress: 0, target: DAILY_TARGET, streak: 0, lastGoalDay: '' })
export const putDailyGoal = (d: DailyGoal) => req('dailygoal', 'readwrite', s => s.put(d))
// Buy a cosmetic: deduct coins + add to owned (idempotent — no double-charge if already owned).
export async function buyCosmetic(childId: string, itemId: string, cost: number): Promise<{ inv: Inventory; wallet: Wallet }> {
  const inv = await getInventory(childId); const wallet = await getWallet(childId)
  if (inv.owned.includes(itemId)) return { inv, wallet }
  if (wallet.coins < cost) return { inv, wallet } // caller checks affordability first; guard anyway
  const nextInv: Inventory = { ...inv, owned: [...inv.owned, itemId] }
  await putInventory(nextInv)
  const nextWallet = await addCoins(childId, -cost)
  return { inv: nextInv, wallet: nextWallet }
}

// Export / import (§11) — device-bound storage safety net. Full-DB JSON round-trip.
const ALL_STORES = ['children', 'attempts', 'progress', 'certificates', 'reviews', 'aggregates', 'daily', 'usage', 'settings', 'learn', 'wallet', 'inventory', 'dailygoal']
export async function exportAll(): Promise<{ app: string; schemaVersion: number; exportedAt: number; stores: Record<string, unknown[]> }> {
  const db = await open()
  const stores: Record<string, unknown[]> = {}
  await Promise.all(ALL_STORES.map(name => new Promise<void>((res, rej) => {
    const rq = db.transaction(name, 'readonly').objectStore(name).getAll()
    rq.onsuccess = () => { stores[name] = rq.result; res() }
    rq.onerror = () => rej(rq.error)
  })))
  return { app: 'sg-reader', schemaVersion: SCHEMA_VERSION, exportedAt: Date.now(), stores }
}
export async function importAll(data: { stores: Record<string, unknown[]> }): Promise<void> {
  const names = ALL_STORES.filter(n => data.stores[n])
  await run(names, 'readwrite', t => {
    for (const name of names) {
      const os = t.objectStore(name); os.clear()
      for (const row of data.stores[name]) os.put(row)
    }
  })
}

// Multi-store transaction that resolves on completion.
function run(stores: string[], mode: IDBTransactionMode, fn: (t: IDBTransaction) => void): Promise<void> {
  return open().then(db => new Promise<void>((res, rej) => {
    const t = db.transaction(stores, mode)
    t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error)
    fn(t)
  }))
}

// Delete all of a child's data (attempts by index; progress/certs/reviews/aggregates by
// key prefix; usage by childId key).
function clearChildData(childId: string): Promise<void> {
  return run(['attempts', 'progress', 'certificates', 'reviews', 'aggregates', 'daily', 'usage', 'learn', 'wallet', 'inventory', 'dailygoal'], 'readwrite', t => {
    const at = t.objectStore('attempts')
    at.index('childId').getAllKeys(childId).onsuccess = e =>
      (e.target as IDBRequest<IDBValidKey[]>).result.forEach(k => at.delete(k))
    for (const name of ['progress', 'certificates', 'reviews', 'aggregates', 'daily', 'learn']) {
      const st = t.objectStore(name)
      st.getAllKeys().onsuccess = e =>
        (e.target as IDBRequest<IDBValidKey[]>).result.forEach(k => {
          if (String(k).startsWith(childId + '::')) st.delete(k)
        })
    }
    t.objectStore('usage').delete(childId)
    t.objectStore('wallet').delete(childId)
    t.objectStore('inventory').delete(childId)
    t.objectStore('dailygoal').delete(childId)
  })
}

// Remove a student entirely (profile + all their data).
export async function removeChild(childId: string): Promise<void> {
  await clearChildData(childId)
  await req('children', 'readwrite', s => s.delete(childId))
}

// Reset a student: wipe all progress/attempts/certs/reviews and clear the entry
// skill so the warm-up placement runs again. Keeps the profile.
export async function resetChild(child: Child): Promise<void> {
  await clearChildData(child.id)
  const fresh: Child = { ...child }
  delete fresh.entrySkillId
  await addChild(fresh)
}
