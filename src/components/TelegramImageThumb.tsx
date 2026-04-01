import { useEffect, useMemo, useState } from 'react'
import { useTelegram } from '../lib/telegram'

export function TelegramImageThumb({
  msgId,
  className,
}: {
  msgId: number
  className?: string
}) {
  const { downloadThumbnail } = useTelegram()
  const [blob, setBlob] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setBlob(null)
    void (async () => {
      try {
        const b = await downloadThumbnail(msgId)
        if (!cancelled) setBlob(b)
      } catch {
        if (!cancelled) setBlob(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [downloadThumbnail, msgId])

  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  if (!url) {
    return (
      <div
        className={
          className ??
          'h-full w-full rounded-lg bg-slate-100 animate-pulse dark:bg-slate-800/70'
        }
        aria-busy={loading}
      />
    )
  }

  return (
    <img
      src={url}
      alt=""
      className={
        className ??
        'h-full w-full rounded-lg object-cover bg-slate-100 dark:bg-slate-800/70'
      }
      loading="eager"
      decoding="async"
      draggable={false}
    />
  )
}

