import { useCallback, useEffect, useState } from 'react'
import { Api } from 'telegram'
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  FolderOpen,
  Loader2,
  Send,
  XCircle,
} from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import type { StorageChatOption } from '../lib/telegram'
import {
  formatTelegramError,
  useTelegram,
} from '../lib/telegram'
import { formatBytes } from '../lib/fileCategories'

type FileLeecherMessage = {
  id: number
  name: string
  size: number
  date: Date
  mimeType?: string
  noforwards: boolean
}

type TransferStatus = 'downloading' | 'uploading' | 'completed' | 'error'

type TransferItem = {
  id: string
  messageId: number
  name: string
  status: TransferStatus
  progress: number
  error?: string
}

export function FileLeecher() {
  const { t } = useI18n()
  const { client } = useTelegram()

  const [step, setStep] = useState<'source' | 'files' | 'destination' | 'transfer'>('source')
  const [sourceChats, setSourceChats] = useState<StorageChatOption[]>([])
  const [selectedSource, setSelectedSource] = useState<string>('')
  const [files, setFiles] = useState<FileLeecherMessage[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set())
  const [destinationChats, setDestinationChats] = useState<StorageChatOption[]>([])
  const [selectedDestination, setSelectedDestination] = useState<string>('')
  const [transfers, setTransfers] = useState<TransferItem[]>([])
  const [loading, setLoading] = useState(false)

  // Step 1: Load source chats (groups/channels)
  useEffect(() => {
    if (step !== 'source' || !client) return
    setLoading(true)
    void (async () => {
      try {
        const dialogs = await client.getDialogs({ limit: 150 })
        const chats: StorageChatOption[] = dialogs.flatMap((d) => {
          if (d.id == null || !(d.isGroup || d.isChannel)) return []
          return [
            {
              peerKey: d.id.toString(),
              title: d.title || 'Unknown',
              kind: d.isGroup ? 'group' : 'channel',
            },
          ]
        })
        setSourceChats(chats)
      } catch (e) {
        console.error(e)
        alert(formatTelegramError(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [step, client])

  // Step 2: Load files from selected source
  const loadFiles = useCallback(async () => {
    if (!selectedSource || !client) return
    setLoading(true)
    try {
      const peerId = selectedSource === 'me' ? 'me' : Number(selectedSource)
      const messages = await client.getMessages(peerId, {
        limit: 50,
        filter: new Api.InputMessagesFilterDocument(),
      })
      const fileMessages: FileLeecherMessage[] = messages
        .filter((m) => m.document)
        .map((m) => ({
          id: m.id,
          name: m.document?.attributes?.find((a) => a.className === 'DocumentAttributeFilename')?.fileName || 'Unknown',
          size: Number(m.document?.size ?? 0),
          date: new Date(m.date * 1000),
          mimeType: m.document?.mimeType,
          noforwards: m.noforwards || false,
        }))
      setFiles(fileMessages)
      setStep('files')
    } catch (e) {
      console.error(e)
      alert(formatTelegramError(e))
    } finally {
      setLoading(false)
    }
  }, [selectedSource, client])

  // Step 3: Load destination chats
  useEffect(() => {
    if (step !== 'destination' || !client) return
    setLoading(true)
    void (async () => {
      try {
        const dialogs = await client.getDialogs({ limit: 150 })
        const chats: StorageChatOption[] = dialogs.flatMap((d) => {
          if (d.id == null) return []
          const peerKey = d.id.toString()
          const kind: StorageChatOption['kind'] =
            peerKey === 'me'
              ? 'saved'
              : d.isGroup
              ? 'group'
              : d.isChannel
              ? 'channel'
              : 'private'
          return [
            {
              peerKey,
              title: peerKey === 'me' ? 'Saved Messages' : d.title || d.name || 'Unknown',
              kind,
            },
          ]
        }).filter((chat) => chat.peerKey !== selectedSource)
        setDestinationChats(chats)
      } catch (e) {
        console.error(e)
        alert(formatTelegramError(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [step, client, selectedSource])

  // Transfer logic
  const startTransfer = useCallback(async () => {
    if (!client || selectedFiles.size === 0 || !selectedDestination) return
    setStep('transfer')
    const transferItems: TransferItem[] = Array.from(selectedFiles).map((msgId) => ({
      id: crypto.randomUUID(),
      messageId: msgId,
      name: files.find((f) => f.id === msgId)?.name || 'Unknown',
      status: 'downloading',
      progress: 0,
    }))
    setTransfers(transferItems)

    for (const item of transferItems) {
      const file = files.find((f) => f.id === item.messageId)
      if (!file) continue

      try {
        // Check file size warning
        if (file.size > 500 * 1024 * 1024) {
          alert(t('fileTooLarge'))
          setTransfers((prev) =>
            prev.map((t) =>
              t.id === item.id ? { ...t, status: 'error', error: 'File too large' } : t
            )
          )
          continue
        }

        const peerId = selectedSource === 'me' ? 'me' : Number(selectedSource)
        const destPeerId = selectedDestination === 'me' ? 'me' : Number(selectedDestination)

        if (!file.noforwards) {
          // Normal forward
          await client.forwardMessages(destPeerId, {
            messages: [file.id],
            fromPeer: peerId,
          })
          setTransfers((prev) =>
            prev.map((t) =>
              t.id === item.id ? { ...t, status: 'completed', progress: 100 } : t
            )
          )
        } else {
          // Bypass: download and re-upload
          const message = (await client.getMessages(peerId, { ids: file.id }))[0]
          const buffer = await client.downloadMedia(message, {
            progressCallback: (...args: any[]) => {
              const downloaded = Number(args[0] ?? 0)
              const total = Number(args[1] ?? 0)
              const progress = total > 0 ? (downloaded / total) * 50 : 0
              setTransfers((prev) =>
                prev.map((t) =>
                  t.id === item.id ? { ...t, progress } : t
                )
              )
            },
          })
          if (!buffer) throw new Error('Failed to download media')

          setTransfers((prev) =>
            prev.map((t) =>
              t.id === item.id ? { ...t, status: 'uploading', progress: 50 } : t
            )
          )

          // Create blob and upload
          const blob = new Blob([buffer as BlobPart])
          const fileObj = new File([blob], file.name, { type: file.mimeType || 'application/octet-stream' })

          await client.sendFile(destPeerId, {
            file: fileObj,
            forceDocument: true,
            progressCallback: (...args: any[]) => {
              const uploaded = Number(args[0] ?? 0)
              const total = Number(args[1] ?? 0)
              const progress = 50 + (total > 0 ? (uploaded / total) * 50 : 0)
              setTransfers((prev) =>
                prev.map((t) =>
                  t.id === item.id ? { ...t, progress } : t
                )
              )
            },
          })

          setTransfers((prev) =>
            prev.map((t) =>
              t.id === item.id ? { ...t, status: 'completed', progress: 100 } : t
            )
          )
        }
      } catch (e) {
        console.error(e)
        let errorMsg = formatTelegramError(e)
        if (e instanceof Error && e.message.includes('FLOOD_WAIT')) {
          const waitMs = parseInt(e.message.match(/FLOOD_WAIT_(\d+)/)?.[1] || '0') * 1000
          errorMsg = `Rate limited. Wait ${Math.ceil(waitMs / 1000)} seconds.`
        }
        setTransfers((prev) =>
          prev.map((t) =>
            t.id === item.id ? { ...t, status: 'error', error: errorMsg } : t
          )
        )
      }
    }
  }, [selectedFiles, selectedDestination, selectedSource, files, client, t])

  const toggleFileSelect = (id: number) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const reset = () => {
    setStep('source')
    setSelectedSource('')
    setFiles([])
    setSelectedFiles(new Set())
    setSelectedDestination('')
    setTransfers([])
  }

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{t('fileLeecher')}</h1>
          <button
            onClick={reset}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
          >
            Reset
          </button>
        </div>
        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-400">
          <span className={step === 'source' ? 'text-orange-400' : ''}>1. {t('selectSource')}</span>
          <ArrowRight className="h-4 w-4" />
          <span className={step === 'files' ? 'text-orange-400' : ''}>2. {t('selectFiles')}</span>
          <ArrowRight className="h-4 w-4" />
          <span className={step === 'destination' ? 'text-orange-400' : ''}>3. {t('selectDestination')}</span>
          <ArrowRight className="h-4 w-4" />
          <span className={step === 'transfer' ? 'text-orange-400' : ''}>4. {t('startTransfer')}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {step === 'source' && (
          <div>
            <h2 className="mb-4 text-lg font-medium">{t('selectSource')}</h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sourceChats.map((chat) => (
                  <div
                    key={chat.peerKey}
                    onClick={() => setSelectedSource(chat.peerKey)}
                    className={`cursor-pointer rounded-2xl bg-[#1E2330] p-4 hover:bg-slate-800 ${
                      selectedSource === chat.peerKey ? 'ring-2 ring-orange-400' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <FolderOpen className="h-6 w-6 text-gray-400" />
                      <div>
                        <p className="font-medium">{chat.title}</p>
                        <p className="text-sm text-gray-400 capitalize">{chat.kind}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedSource && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={loadFiles}
                  className="rounded-lg bg-orange-500 px-6 py-2 text-white hover:bg-orange-600"
                >
                  {t('loadFiles')}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'files' && (
          <div>
            <h2 className="mb-4 text-lg font-medium">{t('selectFiles')}</h2>
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center space-x-4 rounded-2xl bg-[#1E2330] p-4 hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={() => toggleFileSelect(file.id)}
                    className="h-5 w-5"
                  />
                  <FileText className="h-6 w-6 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-400">
                      {formatBytes(file.size)} • {file.date.toLocaleDateString()}
                      {file.noforwards && <span className="ml-2 text-red-400">{t('restricted')}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {selectedFiles.size > 0 && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setStep('destination')}
                  className="rounded-lg bg-teal-500 px-6 py-2 text-white hover:bg-teal-600"
                >
                  {t('selectDestination')}
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'destination' && (
          <div>
            <h2 className="mb-4 text-lg font-medium">{t('selectDestination')}</h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {destinationChats.map((chat) => (
                  <div
                    key={chat.peerKey}
                    onClick={() => setSelectedDestination(chat.peerKey)}
                    className={`cursor-pointer rounded-2xl bg-[#1E2330] p-4 hover:bg-slate-800 ${
                      selectedDestination === chat.peerKey ? 'ring-2 ring-teal-400' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Send className="h-6 w-6 text-gray-400" />
                      <div>
                        <p className="font-medium">{chat.title}</p>
                        <p className="text-sm text-gray-400 capitalize">{chat.kind}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedDestination && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={startTransfer}
                  className="rounded-lg bg-green-500 px-6 py-2 text-white hover:bg-green-600"
                >
                  {t('startTransfer')} ({selectedFiles.size} files)
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'transfer' && (
          <div>
            <h2 className="mb-4 text-lg font-medium">{t('startTransfer')}</h2>
            <div className="space-y-4">
              {transfers.map((transfer) => (
                <div key={transfer.id} className="rounded-2xl bg-[#1E2330] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{transfer.name}</span>
                    <div className="flex items-center space-x-2">
                      {transfer.status === 'downloading' && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                      {transfer.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-orange-400" />}
                      {transfer.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                      {transfer.status === 'error' && <XCircle className="h-4 w-4 text-red-400" />}
                      <span className="text-sm text-gray-400">
                        {transfer.status === 'downloading' && t('downloading')}
                        {transfer.status === 'uploading' && t('uploading')}
                        {transfer.status === 'completed' && t('completed')}
                        {transfer.status === 'error' && t('transferError')}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-orange-400 to-teal-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${transfer.progress}%` }}
                    />
                  </div>
                  {transfer.error && (
                    <p className="text-sm text-red-400 mt-2">{transfer.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}