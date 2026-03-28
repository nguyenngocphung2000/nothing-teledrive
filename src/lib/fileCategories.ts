export type FileCategory = 'all' | 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other'

const imageExt = /\.(jpe?g|png|gif|webp|bmp|svg|ico|heic|avif)$/i
const videoExt = /\.(mp4|webm|mkv|mov|avi|m4v|wmv|flv)$/i
const audioExt = /\.(mp3|ogg|opus|wav|flac|aac|m4a|wma)$/i
const archiveExt = /\.(zip|rar|7z|tar|gz|bz2|xz)$/i

export function guessCategory(fileName: string, mimeType?: string): FileCategory {
  const m = (mimeType ?? '').toLowerCase()
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('video/')) return 'video'
  if (m.startsWith('audio/')) return 'audio'
  if (
    m.includes('pdf') ||
    m.includes('word') ||
    m.includes('document') ||
    m.includes('sheet') ||
    m.includes('presentation') ||
    m.includes('text/') ||
    m.includes('json') ||
    m.includes('xml')
  ) {
    return 'document'
  }
  const n = fileName.toLowerCase()
  if (imageExt.test(n)) return 'image'
  if (videoExt.test(n)) return 'video'
  if (audioExt.test(n)) return 'audio'
  if (archiveExt.test(n)) return 'archive'
  if (/\.(pdf|docx?|xlsx?|pptx?|txt|csv|md|rtf|odt)$/i.test(n)) return 'document'
  return 'other'
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
