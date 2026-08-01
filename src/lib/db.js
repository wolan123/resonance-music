const DB_NAME = 'klee-music-db'
const STORE = 'tracks'
const VERSION = 1

let dbPromise = null

function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('当前浏览器不支持本地音乐库'))
        return
      }
      const req = indexedDB.open(DB_NAME, VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function run(mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const store = tx.objectStore(STORE)
        let result
        try {
          result = fn(store)
        } catch (e) {
          reject(e)
          return
        }
        tx.oncomplete = () => resolve(result)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      }),
  )
}

export function getAllTracks() {
  return run('readonly', (store) => store.getAll())
}

export function getTrack(id) {
  return run('readonly', (store) => store.get(id))
}

export function putTrack(track) {
  return run('readwrite', (store) => store.put(track))
}

export function deleteTrack(id) {
  return run('readwrite', (store) => store.delete(id))
}
