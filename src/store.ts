// IndexedDB persistence (CLAUDE.md §11). No deps.
import type { Child, Attempt, SkillProgress, Certificate } from './types'
const DB = 'sg-reader'; const VER = 2

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, VER)
    r.onupgradeneeded = () => {
      const db = r.result
      if (!db.objectStoreNames.contains('children')) db.createObjectStore('children', { keyPath: 'id' })
      // v1 keyed attempts by ts (collision risk); v2 rekeys by uuid + childId index.
      if (db.objectStoreNames.contains('attempts')) db.deleteObjectStore('attempts')
      const at = db.createObjectStore('attempts', { keyPath: 'id' })
      at.createIndex('childId', 'childId', { unique: false })
      if (!db.objectStoreNames.contains('progress')) db.createObjectStore('progress', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('certificates')) db.createObjectStore('certificates', { keyPath: 'key' })
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
