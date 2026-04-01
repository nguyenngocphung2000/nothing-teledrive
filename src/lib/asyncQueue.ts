export type QueueEvent =
  | { type: 'paused'; untilMs: number; reason: string }
  | { type: 'resumed' }

type Listener = (ev: QueueEvent) => void

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * A small promise queue with:
 * - global rate limit (maxStartsPerSecond)
 * - pause / auto-resume support
 *
 * It intentionally starts tasks sequentially to keep RAM/CPU predictable.
 */
export class AsyncQueue {
  private readonly maxStartsPerSecond: number
  private running = false
  private tasks: Array<{
    run: () => Promise<unknown>
    resolve: (v: unknown) => void
    reject: (e: unknown) => void
  }> = []

  private listeners = new Set<Listener>()

  private lastStartTimes: number[] = []
  private pauseUntilMs = 0

  constructor(maxStartsPerSecond: number) {
    this.maxStartsPerSecond = maxStartsPerSecond
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(ev: QueueEvent) {
    for (const fn of this.listeners) fn(ev)
  }

  pauseFor(ms: number, reason: string) {
    const until = Date.now() + Math.max(0, ms)
    const prev = this.pauseUntilMs
    this.pauseUntilMs = Math.max(this.pauseUntilMs, until)
    if (this.pauseUntilMs !== prev) {
      this.emit({ type: 'paused', untilMs: this.pauseUntilMs, reason })
    }
    void this.pump()
  }

  resumeNow() {
    const hadPause = this.pauseUntilMs > Date.now()
    this.pauseUntilMs = 0
    if (hadPause) this.emit({ type: 'resumed' })
    void this.pump()
  }

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.tasks.push({
        run: fn as () => Promise<unknown>,
        resolve: resolve as (v: unknown) => void,
        reject,
      })
      void this.pump()
    })
  }

  private async pump() {
    if (this.running) return
    this.running = true
    try {
      while (this.tasks.length > 0) {
        const now = Date.now()

        // Pause (429/FLOOD_WAIT)
        if (this.pauseUntilMs > now) {
          await sleep(Math.min(250, this.pauseUntilMs - now))
          continue
        }

        // Rate limit: allow up to N starts per second.
        const windowMs = 1000
        this.lastStartTimes = this.lastStartTimes.filter((t) => now - t < windowMs)
        if (this.lastStartTimes.length >= this.maxStartsPerSecond) {
          const oldest = this.lastStartTimes[0]
          const waitMs = Math.max(0, windowMs - (now - oldest))
          await sleep(Math.min(50, waitMs))
          continue
        }

        const task = this.tasks.shift()!
        this.lastStartTimes.push(Date.now())
        try {
          const v = await task.run()
          task.resolve(v)
        } catch (e) {
          task.reject(e)
        }
      }
    } finally {
      this.running = false
    }
  }
}

