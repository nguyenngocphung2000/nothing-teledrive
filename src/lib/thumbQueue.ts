import { AsyncQueue, type QueueEvent } from './asyncQueue'

// Telegram hard limit is ~30 req/s; we stay well under (15–20).
const DEFAULT_MAX_RPS = 18

// Single shared queue across the frontend.
const q = new AsyncQueue(DEFAULT_MAX_RPS)

export function subscribeThumbQueue(listener: (ev: QueueEvent) => void): () => void {
  return q.subscribe(listener)
}

export function pauseThumbQueueFor(ms: number, reason: string) {
  q.pauseFor(ms, reason)
}

export function enqueueThumbTask<T>(fn: () => Promise<T>): Promise<T> {
  return q.enqueue(fn)
}

export function parseFloodWaitMs(err: unknown): { waitMs: number; reason: string } | null {
  const msg =
    err instanceof Error
      ? err.message
      : err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
        ? String((err as any).message)
        : String(err)

  // Common Telegram error: "FLOOD_WAIT_X"
  const m = /FLOOD_WAIT_?(\d+)/i.exec(msg)
  if (m) {
    const seconds = Number(m[1])
    if (Number.isFinite(seconds) && seconds > 0) {
      return { waitMs: seconds * 1000, reason: `FLOOD_WAIT_${seconds}` }
    }
  }

  // Generic 429 message (browser/proxy)
  if (/429|too many requests/i.test(msg)) {
    return { waitMs: 15_000, reason: 'HTTP_429' }
  }

  return null
}

