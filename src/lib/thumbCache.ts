import localforage from 'localforage'

type CacheEntry = {
  v: 1
  storedAt: number
  blob: Blob
}

const STORE = localforage.createInstance({
  name: 'teledrive',
  storeName: 'thumb_cache_v1',
  description: 'Telegram thumbnail blobs (smallest size)',
})

function keyFor(peerKey: string, msgId: number): string {
  return `${peerKey}:${msgId}`
}

export async function getThumbFromCache(peerKey: string, msgId: number): Promise<Blob | null> {
  const raw = await STORE.getItem<CacheEntry>(keyFor(peerKey, msgId))
  if (!raw || raw.v !== 1) return null
  if (!(raw.blob instanceof Blob)) return null
  return raw.blob
}

export async function putThumbToCache(peerKey: string, msgId: number, blob: Blob): Promise<void> {
  const entry: CacheEntry = { v: 1, storedAt: Date.now(), blob }
  await STORE.setItem(keyFor(peerKey, msgId), entry)
}

/**
 * Best-effort cleanup. Keep it simple: delete entries older than ttlMs.
 * (No strict guarantee — it runs when called.)
 */
export async function pruneThumbCache(ttlMs: number): Promise<void> {
  const now = Date.now()
  const keys = await STORE.keys()
  for (const k of keys) {
    const raw = await STORE.getItem<CacheEntry>(k)
    if (!raw || raw.v !== 1) {
      await STORE.removeItem(k)
      continue
    }
    if (now - raw.storedAt > ttlMs) {
      await STORE.removeItem(k)
    }
  }
}

