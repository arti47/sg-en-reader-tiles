// IndexedDB persistence (CLAUDE.md §11). No deps.
import type { Child, Attempt, SkillProgress, Certificate, Review, Aggregate, Usage, Settings } from './types'
export const SCHEMA_VERSION = 4
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

// Attempts
export const addAttempt = (a: Attempt) => req('attempts', 'readwrite', s => s.put(a))
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

// Usage / streak (§14)
export const getUsage = (childId: string) =>
  req<Usage | undefined>('usage', 'readonly', s => s.get(childId))
export const putUsage = (u: Usage) => req('usage', 'readwrite', s => s.put(u))

// Settings (single row keyed "app")
export const getSettings = () =>
  req<(Settings & { key: string }) | undefined>('settings', 'readonly', s => s.get('app'))
    .then(r => r ?? { key: 'app', ttsRate: 0.9, englishVariant: 'en-SG' as const, sessionLength: 16 })
export const putSettings = (st: Settings) => req('settings', 'readwrite', s => s.put({ ...st, key: 'app' }))

// Export / import (§11) — device-bound storage safety net. Full-DB JSON round-trip.
const ALL_STORES = ['children', 'attempts', 'progress', 'certificates', 'reviews', 'aggregates', 'usage', 'settings']
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
  return run(['attempts', 'progress', 'certificates', 'reviews', 'aggregates', 'usage'], 'readwrite', t => {
    const at = t.objectStore('attempts')
    at.index('childId').getAllKeys(childId).onsuccess = e =>
      (e.target as IDBRequest<IDBValidKey[]>).result.forEach(k => at.delete(k))
    for (const name of ['progress', 'certificates', 'reviews', 'aggregates']) {
      const st = t.objectStore(name)
      st.getAllKeys().onsuccess = e =>
        (e.target as IDBRequest<IDBValidKey[]>).result.forEach(k => {
          if (String(k).startsWith(childId + '::')) st.delete(k)
        })
    }
    t.objectStore('usage').delete(childId)
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
