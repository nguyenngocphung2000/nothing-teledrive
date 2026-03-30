import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive,
  ArrowDownToLine,
  ArrowUpFromLine,
  AudioWaveform,
  CheckCircle2,
  Cloud,
  Download,
  FileText,
  Folder,
  Image as ImageIcon,
  Languages,
  Loader2,
  LogOut,
  MoreVertical,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Upload,
  User,
  Video,
  XCircle,
} from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import type { StorageChatOption, TelegramFileMessage } from '../lib/telegram'
import {
  downloadFilenameForMessage,
  formatTelegramError,
  MAX_UPLOAD_BYTES,
  useTelegram,
} from '../lib/telegram'
import {
  type FileCategory,
  formatBytes,
  guessCategory,
} from '../lib/fileCategories'

type DashboardProps = {
  onLogout: () => void
}

type ViewMode = 'grid' | 'list'

type TransferRow = {
  id: string
  direction: 'up' | 'down'
  name: string
  loaded: number
  total: number
  status: 'queued' | 'active' | 'done' | 'error'
}

const INITIAL_FILE_RENDER = 8000
const FILE_RENDER_STEP = 8000

const THEME_KEY = 'teledrive_theme'
type ThemeMode = 'system' | 'light' | 'dark'

function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const v = localStorage.getItem(THEME_KEY) as ThemeMode | null
      return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
    } catch {
      return 'system'
    }
  })
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => setSystemDark(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  const dark = mode === 'system' ? systemDark : mode === 'dark'

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
  }, [dark])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    try {
      localStorage.setItem(THEME_KEY, m)
    } catch {
      /* ignore */
    }
  }, [])

  return { dark, mode, setMode }
}

function FileGlyph({ name, mime }: { name: string; mime?: string }) {
  const c = guessCategory(name, mime)
  const cls = 'h-4 w-4'
  if (c === 'image') return <ImageIcon className={`${cls} text-emerald-500`} />
  if (c === 'video') return <Video className={`${cls} text-violet-500`} />
  if (c === 'audio') return <AudioWaveform className={`${cls} text-amber-500`} />
  if (c === 'archive') return <Archive className={`${cls} text-orange-500`} />
  if (c === 'document') return <FileText className={`${cls} text-blue-500`} />
  return <Folder className={`${cls} text-slate-400`} />
}

export function Dashboard({ onLogout }: DashboardProps) {
  const { t, localeSetting, setLocaleSetting, supportedCodes } = useI18n()
  const {
    listFiles,
    uploadFile,
    downloadFile,
    deleteFile,
    forwardFile,
    storagePeer,
    setStoragePeer,
    currentUser,
    fetchStorageChats,
  } = useTelegram()

  const { mode, setMode } = useTheme()

  const [files, setFiles] = useState<TelegramFileMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [contextFile, setContextFile] = useState<TelegramFileMessage | null>(null)
  const [forwardPeer, setForwardPeer] = useState('')
  const [storageOptions, setStorageOptions] = useState<StorageChatOption[]>([])
  const [chatsLoading, setChatsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [smartType, setSmartType] = useState<FileCategory | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [maxSizeMb, setMaxSizeMb] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [transferRows, setTransferRows] = useState<TransferRow[]>([])
  const [fileRenderLimit, setFileRenderLimit] = useState(INITIAL_FILE_RENDER)
  const [downloadAllBusy, setDownloadAllBusy] = useState(false)

  const scheduleRemoveTransfer = useCallback((id: string, delayMs = 4500) => {
    window.setTimeout(() => {
      setTransferRows((prev) => prev.filter((r) => r.id !== id))
    }, delayMs)
  }, [])

  useEffect(() => {
    void (async () => {
      setChatsLoading(true)
      try {
        const list = await fetchStorageChats()
        setStorageOptions(list)
      } catch (e) {
        console.error(e)
        alert(formatTelegramError(e))
        setStorageOptions([{ peerKey: 'me', title: 'Saved Messages', kind: 'saved' }])
      } finally {
        setChatsLoading(false)
      }
    })()
  }, [fetchStorageChats])

  useEffect(() => {
    if (chatsLoading || storageOptions.length === 0) return
    if (!storageOptions.some((o) => o.peerKey === storagePeer)) {
      void (async () => {
        try {
          await setStoragePeer('me')
        } catch {
          /* ignore */
        }
      })()
    }
  }, [chatsLoading, storageOptions, storagePeer, setStoragePeer])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      try {
        const chats = await fetchStorageChats()
        setStorageOptions(chats)
      } catch {
        /* giữ danh sách cũ */
      }
      const list = await listFiles()
      setFiles(list)
    } catch (e) {
      console.error(e)
      alert(formatTelegramError(e))
    } finally {
      setLoading(false)
    }
  }, [listFiles, fetchStorageChats])

  useEffect(() => {
    void refresh()
  }, [storagePeer, refresh])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [storagePeer])

  useEffect(() => {
    setFileRenderLimit(INITIAL_FILE_RENDER)
  }, [storagePeer, search, smartType, dateFrom, dateTo, maxSizeMb])

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearFileSelection = () => setSelectedIds(new Set())

  const onFilesSelected = async (fileList: FileList | null) => {
    if (!fileList?.length) return
    const items: { file: File; id: string }[] = []
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_UPLOAD_BYTES) {
        alert(t('fileTooLarge'))
        continue
      }
      items.push({ file, id: crypto.randomUUID() })
    }
    if (items.length === 0) return

    setTransferRows((prev) => [
      ...prev,
      ...items.map(({ file, id }) => ({
        id,
        direction: 'up' as const,
        name: file.name,
        loaded: 0,
        total: Math.max(file.size, 1),
        status: 'queued' as const,
      })),
    ])
    setUploading(true)
    try {
      for (const { file, id } of items) {
        setTransferRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'active' as const } : r)),
        )
        try {
          await uploadFile(file, {
            onProgress: (loaded, total) => {
              setTransferRows((prev) =>
                prev.map((r) =>
                  r.id === id
                    ? { ...r, loaded, total: total > 0 ? total : r.total }
                    : r,
                ),
              )
            },
          })
          setTransferRows((prev) =>
            prev.map((r) =>
              r.id === id ? { ...r, status: 'done' as const, loaded: r.total } : r,
            ),
          )
          scheduleRemoveTransfer(id)
        } catch (e) {
          if (e instanceof Error && e.message === 'FILE_TOO_LARGE') {
            alert(t('fileTooLarge'))
          } else {
            alert(formatTelegramError(e))
          }
          setTransferRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: 'error' as const } : r)),
          )
        }
      }
      await refresh()
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (file: TelegramFileMessage) => {
    const id = crypto.randomUUID()
    setTransferRows((prev) => [
      ...prev,
      {
        id,
        direction: 'down',
        name: file.name,
        loaded: 0,
        total: Math.max(file.size, 1),
        status: 'active',
      },
    ])
    try {
      const blob = await downloadFile(file.id, {
        fileSize: file.size,
        onProgress: (loaded, total) => {
          setTransferRows((prev) =>
            prev.map((r) =>
              r.id === id ? { ...r, loaded, total: total > 0 ? total : r.total } : r,
            ),
          )
        },
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setTransferRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'done', loaded: r.total } : r)),
      )
      scheduleRemoveTransfer(id)
    } catch (e) {
      alert(formatTelegramError(e))
      setTransferRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'error' } : r)),
      )
    }
  }

  const handleDownloadAll = async () => {
    const list = files
    if (list.length === 0) return
    if (
      !window.confirm(
        t('downloadAllConfirm', {
          n: String(list.length),
        }),
      )
    ) {
      return
    }
    const queueId = crypto.randomUUID()
    const totalBytes = list.reduce((s, f) => s + f.size, 0)
    setDownloadAllBusy(true)
    setTransferRows((prev) => [
      ...prev,
      {
        id: queueId,
        direction: 'down',
        name: t('downloadAllQueue', { current: '0', total: String(list.length) }),
        loaded: 0,
        total: Math.max(totalBytes, 1),
        status: 'active',
      },
    ])
    let accumulated = 0
    try {
      for (let idx = 0; idx < list.length; idx++) {
        const file = list[idx]
        const i = idx + 1
        setTransferRows((prev) =>
          prev.map((r) =>
            r.id === queueId
              ? {
                  ...r,
                  name: t('downloadAllQueue', {
                    current: String(i),
                    total: String(list.length),
                  }),
                }
              : r,
          ),
        )
        try {
          const blob = await downloadFile(file.id, {
            fileSize: file.size,
            onProgress: (loaded, tot) => {
              const cap = tot > 0 ? tot : file.size
              const cur = Math.min(loaded, cap)
              setTransferRows((prev) =>
                prev.map((r) =>
                  r.id === queueId
                    ? {
                        ...r,
                        loaded: accumulated + cur,
                        total: Math.max(totalBytes, 1),
                      }
                    : r,
                ),
              )
            },
          })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = downloadFilenameForMessage(file.id, file.name)
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)
          accumulated += file.size > 0 ? file.size : blob.size
          setTransferRows((prev) =>
            prev.map((r) =>
              r.id === queueId
                ? { ...r, loaded: accumulated, total: Math.max(totalBytes, 1) }
                : r,
            ),
          )
        } catch (e) {
          alert(formatTelegramError(e))
          setTransferRows((prev) =>
            prev.map((r) => (r.id === queueId ? { ...r, status: 'error' as const } : r)),
          )
          return
        }
        await new Promise((r) => setTimeout(r, 280))
      }
      setTransferRows((prev) =>
        prev.map((r) =>
          r.id === queueId
            ? { ...r, status: 'done' as const, loaded: Math.max(totalBytes, 1) }
            : r,
        ),
      )
      scheduleRemoveTransfer(queueId)
    } finally {
      setDownloadAllBusy(false)
    }
  }

  const handleDelete = async (file: TelegramFileMessage) => {
    if (!window.confirm(t('deleteConfirm', { name: file.name }))) return
    await deleteFile(file.id)
    await refresh()
    setContextFile(null)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(file.id)
      return next
    })
  }

  const handleBulkDelete = async () => {
    const n = selectedIds.size
    if (n === 0) return
    if (!window.confirm(t('deleteManyConfirm', { n: String(n) }))) return
    setUploading(true)
    try {
      for (const id of selectedIds) {
        await deleteFile(id)
      }
      clearFileSelection()
      setContextFile(null)
      await refresh()
    } catch (e) {
      alert(formatTelegramError(e))
    } finally {
      setUploading(false)
    }
  }

  const handleBulkDownload = async () => {
    const list = files.filter((f) => selectedIds.has(f.id))
    const items = list.map((f) => ({ file: f, id: crypto.randomUUID() }))
    setTransferRows((prev) => [
      ...prev,
      ...items.map(({ file, id }) => ({
        id,
        direction: 'down' as const,
        name: file.name,
        loaded: 0,
        total: Math.max(file.size, 1),
        status: 'queued' as const,
      })),
    ])
    for (const { file, id } of items) {
      setTransferRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'active' as const } : r)),
      )
      try {
        const blob = await downloadFile(file.id, {
          fileSize: file.size,
          onProgress: (loaded, total) => {
            setTransferRows((prev) =>
              prev.map((r) =>
                r.id === id ? { ...r, loaded, total: total > 0 ? total : r.total } : r,
              ),
            )
          },
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = downloadFilenameForMessage(file.id, file.name)
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        setTransferRows((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, status: 'done' as const, loaded: r.total } : r,
          ),
        )
        scheduleRemoveTransfer(id)
      } catch (e) {
        alert(formatTelegramError(e))
        setTransferRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'error' as const } : r)),
        )
        break
      }
      await new Promise((r) => setTimeout(r, 350))
    }
  }

  const handleForward = async (file: TelegramFileMessage) => {
    if (!forwardPeer.trim()) {
      alert(t('enterPeer'))
      return
    }
    await forwardFile(file.id, forwardPeer.trim())
    alert(t('forwarded'))
  }

  const storageTitle = useMemo(() => {
    const o = storageOptions.find((x) => x.peerKey === storagePeer)
    if (!o) return storagePeer
    if (o.peerKey === 'me') return t('savedMessages')
    return o.title
  }, [storageOptions, storagePeer, t])

  const kindLabel = (k: StorageChatOption['kind']) => {
    switch (k) {
      case 'saved':
        return t('kindSaved')
      case 'private':
        return t('kindPrivate')
      case 'group':
        return t('kindGroup')
      case 'channel':
        return t('kindChannel')
      default:
        return ''
    }
  }

  const userInitials = useMemo(() => {
    if (!currentUser) return '?'
    const a = (currentUser.firstName || '').trim()
    const b = (currentUser.lastName || '').trim()
    if (a && b) return (a[0] + b[0]).toUpperCase()
    if (a.length >= 2) return a.slice(0, 2).toUpperCase()
    return a.slice(0, 1).toUpperCase() || '?'
  }, [currentUser])

  const userDisplayName = useMemo(() => {
    if (!currentUser) return ''
    const a = (currentUser.firstName || '').trim()
    const b = (currentUser.lastName || '').trim()
    return [a, b].filter(Boolean).join(' ') || currentUser.username || `id ${currentUser.id}`
  }, [currentUser])

  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = files

    if (q) {
      list = list.filter((f) => f.name.toLowerCase().includes(q))
    }

    if (smartType !== 'all') {
      list = list.filter((f) => guessCategory(f.name, f.mimeType) === smartType)
    }

    if (dateFrom) {
      const t0 = new Date(dateFrom)
      t0.setHours(0, 0, 0, 0)
      list = list.filter((f) => f.date >= t0)
    }
    if (dateTo) {
      const t1 = new Date(dateTo)
      t1.setHours(23, 59, 59, 999)
      list = list.filter((f) => f.date <= t1)
    }

    const maxMb = Number(maxSizeMb)
    if (maxSizeMb.trim() && Number.isFinite(maxMb) && maxMb > 0) {
      const maxBytes = maxMb * 1024 * 1024
      list = list.filter((f) => f.size <= maxBytes)
    }

    return list
  }, [files, search, smartType, dateFrom, dateTo, maxSizeMb])

  const displayedFiles = useMemo(
    () => filteredFiles.slice(0, fileRenderLimit),
    [filteredFiles, fileRenderLimit],
  )

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(filteredFiles.map((f) => f.id)))
  }, [filteredFiles])

  const onDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault()
    if (e.dataTransfer.files?.length) {
      await onFilesSelected(e.dataTransfer.files)
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <aside className="flex w-64 flex-col overflow-y-auto border-r border-slate-200 bg-sidebar/80 px-3 py-4 dark:border-slate-800 dark:bg-sidebar-dark/90">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            <Cloud className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">{t('brand')}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{t('tagline')}</div>
          </div>
        </div>

        {currentUser && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-2 py-2 text-[11px] dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                <User className="h-3 w-3 shrink-0" />
                {t('signedInAs')}
              </div>
              <div className="truncate font-medium text-slate-800 dark:text-slate-100">
                {userDisplayName}
              </div>
              {currentUser.username ? (
                <div className="truncate text-[10px] text-slate-500">@{currentUser.username}</div>
              ) : null}
            </div>
          </div>
        )}

        <div className="mb-3 rounded-lg border border-slate-200 bg-white/80 p-2 text-[10px] dark:border-slate-700 dark:bg-slate-900/60">
          <div className="mb-1 font-medium text-slate-600 dark:text-slate-300">{t('storage')}</div>
          {chatsLoading ? (
            <div className="flex items-center gap-2 py-2 text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{t('storageLoading')}</span>
            </div>
          ) : (
            <select
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] dark:border-slate-600 dark:bg-slate-900"
              value={storagePeer}
              onChange={(e) => {
                const v = e.target.value
                void (async () => {
                  try {
                    await setStoragePeer(v)
                  } catch (err) {
                    alert(formatTelegramError(err))
                  }
                })()
              }}
            >
              {storageOptions.map((o) => (
                <option key={o.peerKey} value={o.peerKey}>
                  [{kindLabel(o.kind)}] {o.peerKey === 'me' ? t('savedMessages') : o.title}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1 leading-snug text-slate-500 dark:text-slate-500">{t('storageHint')}</p>
        </div>

        <button
          type="button"
          className="mb-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-white shadow hover:bg-blue-600"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="h-4 w-4" />
          {t('upload')}
        </button>
        <input
          id="file-input"
          type="file"
          multiple
          accept="*/*"
          className="hidden"
          onChange={(e) => {
            void onFilesSelected(e.target.files)
            e.target.value = ''
          }}
        />

        <div className="flex-1 min-h-0" aria-hidden="true" />

        <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-[11px] dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">{t('theme')}</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ThemeMode)}
              className="max-w-[120px] rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] dark:border-slate-600 dark:bg-slate-900"
            >
              <option value="system">{t('themeSystem')}</option>
              <option value="light">{t('themeLight')}</option>
              <option value="dark">{t('themeDark')}</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-slate-500">
              <Languages className="h-3 w-3" />
              {t('language')}
            </span>
            <select
              value={localeSetting}
              onChange={(e) => setLocaleSetting(e.target.value)}
              className="max-w-[120px] rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] dark:border-slate-600 dark:bg-slate-900"
            >
              <option value="system">{t('langSystem')}</option>
              {supportedCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900/40"
          >
            <LogOut className="h-3 w-3" />
            {t('logout')}
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-2 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-800 dark:text-slate-100">{storageTitle}</span>
            <span className="mx-1">/</span>
            <span>{t('breadcrumbFiles')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('selectedCount', { n: String(selectedIds.size) })}
                </span>
                <button
                  type="button"
                  onClick={() => void handleBulkDownload()}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t('downloadSelected')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleBulkDelete()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('deleteSelected')}
                </button>
                <button
                  type="button"
                  onClick={clearFileSelection}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  {t('clearSelection')}
                </button>
              </>
            )}
            <button
              type="button"
              disabled={loading || files.length === 0 || downloadAllBusy}
              onClick={() => void handleDownloadAll()}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {downloadAllBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-3.5 w-3.5" />
              )}
              {t('downloadAll')}
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {loading ? t('syncing') : t('sync')}
            </button>
            <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1 py-0.5 text-[11px] dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`rounded-full px-2 py-0.5 ${
                  viewMode === 'grid'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : ''
                }`}
              >
                {t('grid')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded-full px-2 py-0.5 ${
                  viewMode === 'list'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : ''
                }`}
              >
                {t('list')}
              </button>
            </div>
          </div>
        </header>

        <div className="border-b border-slate-200 bg-slate-50/90 px-4 py-1.5 dark:border-slate-800 dark:bg-slate-900/40">
          <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">{t('author')}</p>
        </div>

        <div className="border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-xs dark:border-slate-600 dark:bg-slate-950"
                placeholder={t('search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-950"
                value={smartType}
                onChange={(e) => setSmartType(e.target.value as FileCategory | 'all')}
              >
                <option value="all">{t('allTypes')}</option>
                <option value="image">{t('typeImage')}</option>
                <option value="video">{t('typeVideo')}</option>
                <option value="audio">{t('typeAudio')}</option>
                <option value="document">{t('typeDoc')}</option>
                <option value="archive">{t('typeArchive')}</option>
                <option value="other">{t('typeOther')}</option>
              </select>
              <input
                type="date"
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-950"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title={t('dateFrom')}
              />
              <input
                type="date"
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-950"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                title={t('dateTo')}
              />
              <input
                type="number"
                min={0}
                className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-950"
                placeholder={t('sizeMaxMB')}
                value={maxSizeMb}
                onChange={(e) => setMaxSizeMb(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setSmartType('all')
                  setDateFrom('')
                  setDateTo('')
                  setMaxSizeMb('')
                }}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                {t('clearFilters')}
              </button>
            </div>
          </div>
        </div>

        <section
          className="flex-1 overflow-auto bg-slate-50 p-4 dark:bg-slate-950"
          onDragEnter={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={onDrop}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{t('dropHint')}</span>
            <div className="flex flex-wrap items-center gap-2">
              {filteredFiles.length > displayedFiles.length && (
                <span className="text-[11px] text-amber-700 dark:text-amber-400">
                  {t('listPartial', {
                    shown: String(displayedFiles.length),
                    total: String(filteredFiles.length),
                  })}
                </span>
              )}
              {filteredFiles.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  {t('selectAll')}
                </button>
              )}
              {filteredFiles.length > fileRenderLimit && (
                <button
                  type="button"
                  onClick={() => setFileRenderLimit((n) => n + FILE_RENDER_STEP)}
                  className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  {t('loadMoreFiles')}
                </button>
              )}
              {uploading && transferRows.length === 0 && (
                <span className="inline-flex items-center gap-1 text-blue-500">
                  <Loader2 className="h-3 w-3 animate-spin" /> {t('uploading')}
                </span>
              )}
            </div>
          </div>

          {transferRows.length > 0 && (
            <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 bg-slate-50/90 px-3 py-2 text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                {t('queueTitle')}
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {transferRows.map((row) => {
                  const pct =
                    row.total > 0
                      ? Math.min(100, Math.round((row.loaded / row.total) * 100))
                      : 0
                  const dirLabel = row.direction === 'up' ? t('queueUpload') : t('queueDownload')
                  const statusLabel =
                    row.status === 'queued'
                      ? t('queuePending')
                      : row.status === 'active'
                        ? t('queueRunning')
                        : row.status === 'done'
                          ? t('queueComplete')
                          : t('queueFailed')
                  return (
                    <li key={row.id} className="px-3 py-2.5">
                      <div className="mb-1.5 flex items-start gap-2">
                        <div
                          className={`mt-0.5 shrink-0 rounded-md p-1 ${
                            row.direction === 'up'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300'
                          }`}
                          title={dirLabel}
                        >
                          {row.direction === 'up' ? (
                            <ArrowUpFromLine className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownToLine className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-100">
                              {row.name}
                            </span>
                            <span className="flex shrink-0 items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                              {row.status === 'active' && (
                                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                              )}
                              {row.status === 'done' && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              )}
                              {row.status === 'error' && (
                                <XCircle className="h-3.5 w-3.5 text-red-500" />
                              )}
                              <span>{statusLabel}</span>
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full transition-[width] duration-150 ${
                                row.status === 'error'
                                  ? 'bg-red-400'
                                  : row.status === 'done'
                                    ? 'bg-emerald-500'
                                    : 'bg-primary'
                              }`}
                              style={{ width: `${row.status === 'queued' ? 0 : pct}%` }}
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                            <span>
                              {formatBytes(row.loaded)} / {formatBytes(row.total)}
                            </span>
                            <span>
                              {row.status === 'queued' ? '—' : `${pct}%`}
                            </span>
                          </div>
                        </div>
                        {(row.status === 'error' || row.status === 'done') && (
                          <button
                            type="button"
                            className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() =>
                              setTransferRows((prev) => prev.filter((r) => r.id !== row.id))
                            }
                          >
                            {t('queueDismiss')}
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {filteredFiles.length === 0 && !loading && (
            <div className="mt-16 flex flex-col items-center justify-center text-center text-slate-400">
              <Cloud className="mb-3 h-10 w-10" />
              <p className="text-sm font-medium">{t('empty')}</p>
              <p className="mt-1 max-w-sm text-xs">{t('emptyHint')}</p>
            </div>
          )}

          {viewMode === 'grid' && filteredFiles.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
              {displayedFiles.map((file) => (
                <div
                  key={file.id}
                  className="group relative rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(file.id)}
                        onChange={() => toggleSelect(file.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800">
                        <FileGlyph name={file.name} mime={file.mimeType} />
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={() => setContextFile(file)}
                      className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mb-1 line-clamp-2 text-[11px] font-medium text-slate-800 dark:text-slate-100">
                    {file.name}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{formatBytes(file.size)}</span>
                    <span>{file.date.toLocaleString(undefined, { dateStyle: 'short' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'list' && filteredFiles.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="grid grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] border-b border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <span className="w-6" />
                <span>{t('nameCol')}</span>
                <span>{t('sizeCol')}</span>
                <span>{t('dateCol')}</span>
                <span />
              </div>
              {displayedFiles.map((file) => (
                <div
                  key={file.id}
                  className="grid grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center border-b border-slate-100 px-3 py-2 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/60"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(file.id)}
                    onChange={() => toggleSelect(file.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <div className="flex min-w-0 items-center gap-2">
                    <FileGlyph name={file.name} mime={file.mimeType} />
                    <span className="truncate text-[11px]">{file.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formatBytes(file.size)}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {file.date.toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setContextFile(file)}
                    className="justify-self-end rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {contextFile && (
          <div className="border-t border-slate-200 bg-white/90 px-4 py-3 text-xs shadow-[0_-4px_20px_rgba(15,23,42,0.12)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <FileGlyph name={contextFile.name} mime={contextFile.mimeType} />
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-medium">{contextFile.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {formatBytes(contextFile.size)} • {contextFile.date.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownload(contextFile)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <Download className="h-3 w-3" />
                  {t('download')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(contextFile)}
                  className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900/40"
                >
                  <Trash2 className="h-3 w-3" />
                  {t('delete')}
                </button>
                <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-900">
                  <Send className="h-3 w-3 text-slate-500" />
                  <input
                    className="w-28 bg-transparent px-1 text-[11px] outline-none placeholder:text-slate-400 sm:w-36"
                    placeholder={t('forwardPlaceholder')}
                    value={forwardPeer}
                    onChange={(e) => setForwardPeer(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => void handleForward(contextFile)}
                    className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {t('forwardSend')}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setContextFile(null)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
