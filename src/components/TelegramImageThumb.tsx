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
  const [blobS, setBlobS] = useState<Blob | null>(null)
  const [blobM, setBlobM] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setBlobS(null)
    setBlobM(null)
    
    void (async () => {
      try {
        const bS = await downloadThumbnail(msgId, 's')
        if (!cancelled && bS) setBlobS(bS)
      } catch {
        // ignore
      }

      try {
        const bM = await downloadThumbnail(msgId, 'm')
        if (!cancelled && bM) setBlobM(bM)
      } catch {
        // ignore 
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [downloadThumbnail, msgId])

  const urlS = useMemo(() => (blobS ? URL.createObjectURL(blobS) : null), [blobS])
  const urlM = useMemo(() => (blobM ? URL.createObjectURL(blobM) : null), [blobM])

  useEffect(() => {
    return () => {
      if (urlS) URL.revokeObjectURL(urlS)
    }
  }, [urlS])

  useEffect(() => {
    return () => {
      if (urlM) URL.revokeObjectURL(urlM)
    }
  }, [urlM])

  if (!urlS && !urlM) {
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

  const currentUrl = urlM || urlS
  const isHighRes = !!urlM

  return (
    <img
      src={currentUrl!}
      alt=""
      className={
        className ??
        'h-full w-full rounded-lg bg-slate-100 dark:bg-slate-800/70 transition-[filter] duration-700 ease-in-out'
      }
      style={{
        objectFit: 'cover',
        imageRendering: (isHighRes ? 'high-quality' : 'auto') as any,
        filter: isHighRes ? 'blur(0px)' : 'blur(5px)',
      }}
      loading="eager"
      decoding="async"
      draggable={false}
    />
  )
}
