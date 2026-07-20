// Minimal IndexedDB wrapper (no deps). Full schema per CLAUDE.md §11 comes in M1+.
import type { Child, Attempt } from './types'
const DB = 'sg-reader'; const VER = 1
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, VER)
    r.onupgradeneeded = () => {
      const db = r.result
      if (!db.objectStoreNames.contains('children')) db.createObjectStore('children', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('attempts')) db.createObjectStore('attempts', { keyPath: 'ts' })
    }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(db => new Promise<T>((res, rej) => {
    const t = db.transaction(store, mode); const req = fn(t.objectStore(store))
    req.onsuccess = () => res(req.result as T); req.onerror = () => rej(req.error)
  }))
}
export const getChildren = () => tx<Child[]>('children', 'readonly', s => s.getAll())
export const addChild = (c: Child) => tx('children', 'readwrite', s => s.put(c))
export const addAttempt = (a: Attempt) => tx('attempts', 'readwrite', s => s.put(a))
