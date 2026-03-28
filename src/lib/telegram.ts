import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Buffer } from 'buffer'
import { Api, utils } from 'telegram'
import { CustomFile } from 'telegram/client/uploads'
import localforage from 'localforage'
import type { TelegramClient } from 'telegram'
import { isSessionInvalidError, sleep } from './sessionErrors'

export type TelegramFileMessage = {
  id: number
  name: string
  size: number
  date: Date
  mimeType?: string
}

/** Hội thoại / nhóm / kênh có thể chọn làm nơi lưu file (từ danh sách Telegram). */
export type StorageChatOption = {
  /** Chuỗi truyền cho GramJS: `me` hoặc peer id (vd. `-100…`) */
  peerKey: string
  title: string
  kind: 'saved' | 'private' | 'group' | 'channel'
}

export type TelegramUserInfo = {
  id: number
  firstName: string
  lastName?: string
  username?: string
}

type TelegramState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'needs_qr'; qrCode: string | null }
  | { status: 'logging_in'; qrCode: string | null }
  | { status: 'ready' }
  | { status: 'error'; error: string }

const SESSION_KEY = 'telegram_session_string'
const STORAGE_PEER_KEY = 'teledrive_storage_peer'

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024

/**
 * GramJS `_fileToMedia` treats plain objects without `read` as existing media and fails for
 * browser `File`. A no-op `read` skips that branch. A Proxy caused "Illegal invocation" on
 * native File/Blob APIs — use defineProperty, or buffer + CustomFile + uploadFile fallback.
 */
function tryTagBrowserFileForGramjs(file: File): boolean {
  try {
    Object.defineProperty(file, 'read', {
      value: () => {},
      configurable: true,
      enumerable: false,
      writable: true,
    })
    return true
  } catch {
    return false
  }
}

const LIST_LIMIT = 500

async function fetchStorageChatOptions(client: TelegramClient): Promise<StorageChatOption[]> {
  const dialogs = await client.getDialogs({ limit: 150 })
  const out: StorageChatOption[] = [
    { peerKey: 'me', title: 'Saved Messages', kind: 'saved' },
  ]
  const seen = new Set<string>(['me'])

  for (const d of dialogs) {
    if (!d.entity) continue
    let peerKey: string
    try {
      peerKey = utils.getPeerId(d.entity).toString()
    } catch {
      continue
    }
    if (seen.has(peerKey)) continue

    if (d.isUser) {
      const u = d.entity
      if (u instanceof Api.User) {
        if (u.self) continue
        if (u.bot) continue
      }
    }

    let kind: StorageChatOption['kind'] = 'private'
    if (d.isGroup) kind = 'group'
    else if (d.isChannel) {
      kind = d.entity instanceof Api.Channel && d.entity.megagroup ? 'group' : 'channel'
    }

    const title = d.title || d.name || 'Chat'
    out.push({ peerKey, title, kind })
    seen.add(peerKey)
  }

  return out
}

/** Tiến độ byte (loaded ≤ total). Dùng cho UI thanh progress. */
export type FileTransferProgress = (loaded: number, total: number) => void

type TelegramContextValue = {
  state: TelegramState
  client: TelegramClient | null
  currentUser: TelegramUserInfo | null
  storagePeer: string
  setStoragePeer: (peer: string) => Promise<void>
  fetchStorageChats: () => Promise<StorageChatOption[]>
  bootstrap: () => Promise<void>
  startQrLogin: () => Promise<void>
  logout: () => Promise<void>
  listFiles: () => Promise<TelegramFileMessage[]>
  uploadFile: (file: File, options?: { onProgress?: FileTransferProgress }) => Promise<void>
  downloadFile: (
    msgId: number,
    options?: { onProgress?: FileTransferProgress; fileSize?: number },
  ) => Promise<Blob>
  deleteFile: (msgId: number) => Promise<void>
  forwardFile: (msgId: number, peer: string) => Promise<void>
}

const TelegramContext = createContext<TelegramContextValue | undefined>(undefined)

async function getStoredSession(): Promise<string | null> {
  return (await localforage.getItem<string>(SESSION_KEY)) ?? null
}

async function storeSession(session: string) {
  await localforage.setItem(SESSION_KEY, session)
}

async function clearSession() {
  await localforage.removeItem(SESSION_KEY)
}

async function persistClientSession(client: TelegramClient) {
  const s = client.session.save() as string | undefined
  if (s) await storeSession(s)
}

async function loadStoragePeer(): Promise<string> {
  const v = await localforage.getItem<string>(STORAGE_PEER_KEY)
  const t = typeof v === 'string' ? v.trim() : ''
  return t || 'me'
}

function readTelegramEnv(): { apiIdRaw: string; apiHash: string } {
  const apiIdRaw = String(import.meta.env.VITE_TELEGRAM_API_ID ?? '').trim()
  const apiHash = String(import.meta.env.VITE_TELEGRAM_API_HASH ?? '').trim()
  return { apiIdRaw, apiHash }
}

function bufferToBase64Url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function formatTelegramError(e: unknown): string {
  if (e instanceof Error && e.message) return e.message
  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>
    if (typeof o.errorMessage === 'string') return o.errorMessage
    if (typeof o.message === 'string') return o.message
  }
  return String(e)
}

async function createClientFromEnv(sessionString: string | null): Promise<TelegramClient> {
  const [{ TelegramClient }, { StringSession }] = await Promise.all([
    import('telegram'),
    import('telegram/sessions'),
  ])

  const { apiIdRaw, apiHash } = readTelegramEnv()

  if (!apiIdRaw || !apiHash) {
    throw new Error(
      'Missing VITE_TELEGRAM_API_ID / VITE_TELEGRAM_API_HASH. Add .env at project root and restart dev server.',
    )
  }

  const apiId = Number(apiIdRaw)
  if (!Number.isFinite(apiId)) {
    throw new Error('VITE_TELEGRAM_API_ID must be a number')
  }

  const session = new StringSession(sessionString ?? '')

  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
    useWSS: true,
    deviceModel: 'TeleDrive Web',
    systemVersion: typeof navigator !== 'undefined' ? navigator.userAgent : 'web',
    appVersion: '1.0',
  })

  return client
}

function ratioToLoadedTotal(
  ratio: number,
  fileSize: number,
  onProgress?: FileTransferProgress,
): void {
  if (!onProgress || !fileSize) return
  const clamped = Math.min(Math.max(ratio, 0), 1)
  onProgress(Math.round(clamped * fileSize), fileSize)
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<TelegramClient | null>(null)
  const [state, setState] = useState<TelegramState>({ status: 'idle' })
  const [storagePeer, setStoragePeerState] = useState<string>('me')
  const [currentUser, setCurrentUser] = useState<TelegramUserInfo | null>(null)
  const bootstrapGen = useRef(0)
  /** Tránh gọi `signInUserWithQrCode` song song (Strict Mode / effect lặp) — gây nhảy về màn QR sau khi đã ready. */
  const qrLoginInFlightRef = useRef<Promise<void> | null>(null)

  const setStoragePeer = useCallback(
    async (peer: string) => {
      const trimmed = peer.trim() || 'me'
      if (client) {
        try {
          await client.getInputEntity(trimmed)
        } catch (e) {
          throw new Error(formatTelegramError(e))
        }
      }
      await localforage.setItem(STORAGE_PEER_KEY, trimmed)
      setStoragePeerState(trimmed)
    },
    [client],
  )

  useEffect(() => {
    void loadStoragePeer().then((raw) => {
      setStoragePeerState(raw)
    })
  }, [])

  useEffect(() => {
    if (!client) return
    void (async () => {
      const raw = await loadStoragePeer()
      try {
        await client.getInputEntity(raw)
        setStoragePeerState(raw)
      } catch {
        await localforage.setItem(STORAGE_PEER_KEY, 'me')
        setStoragePeerState('me')
      }
    })()
  }, [client])

  useEffect(() => {
    if (state.status !== 'ready' || !client) {
      setCurrentUser(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const me = await client.getMe()
        if (cancelled || !me || typeof me !== 'object' || !('id' in me)) return
        const u = me as Api.User
        setCurrentUser({
          id: Number(u.id),
          firstName: u.firstName ?? '',
          lastName: u.lastName,
          username: u.username,
        })
      } catch {
        if (!cancelled) setCurrentUser(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [state.status, client])

  const fetchStorageChats = useCallback(async (): Promise<StorageChatOption[]> => {
    if (!client) return []
    return fetchStorageChatOptions(client)
  }, [client])

  const bootstrap = useCallback(async () => {
    const gen = ++bootstrapGen.current
    try {
      setState({ status: 'loading' })
      let existing = await getStoredSession()
      let newClient = await createClientFromEnv(existing)
      await newClient.connect()

      if (gen !== bootstrapGen.current) {
        await newClient.disconnect().catch(() => {})
        return
      }

      if (existing) {
        let me = null
        let lastErr: unknown = null

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            me = await newClient.getMe()
            break
          } catch (e) {
            lastErr = e
            if (isSessionInvalidError(e)) {
              await newClient.disconnect().catch(() => {})
              await clearSession()
              existing = null
              newClient = await createClientFromEnv(null)
              await newClient.connect()
              if (gen !== bootstrapGen.current) {
                await newClient.disconnect().catch(() => {})
                return
              }
              me = null
              break
            }
            if (attempt < 2) await sleep(1200 * (attempt + 1))
          }
        }

        if (gen !== bootstrapGen.current) {
          await newClient.disconnect().catch(() => {})
          return
        }

        if (me) {
          await persistClientSession(newClient)
          setClient(newClient)
          setState({ status: 'ready' })
          return
        }

        if (existing && lastErr && !isSessionInvalidError(lastErr)) {
          await newClient.disconnect().catch(() => {})
          setState({
            status: 'error',
            error: formatTelegramError(lastErr),
          })
          return
        }
      }

      setClient(newClient)
      setState({ status: 'needs_qr', qrCode: null })
    } catch (e: unknown) {
      console.error(e)
      setState({ status: 'error', error: formatTelegramError(e) })
    }
  }, [])

  const startQrLogin = useCallback(async () => {
    if (!client) return
    const existing = qrLoginInFlightRef.current
    if (existing) {
      await existing
      return
    }
    const run = async () => {
      const { apiIdRaw, apiHash } = readTelegramEnv()
      if (!apiIdRaw || !apiHash) {
        setState({
          status: 'error',
          error:
            'Missing VITE_TELEGRAM_API_ID / VITE_TELEGRAM_API_HASH. Create .env next to package.json.',
        })
        return
      }
      const apiId = Number(apiIdRaw)
      try {
        setState((prev) => ({
          status: 'logging_in',
          qrCode: prev.status === 'needs_qr' || prev.status === 'logging_in' ? prev.qrCode : null,
        }))

        await client.signInUserWithQrCode(
          { apiId, apiHash },
          {
            qrCode: async ({ token }) => {
              const url = `tg://login?token=${bufferToBase64Url(token)}`
              setState({ status: 'logging_in', qrCode: url })
            },
            password: async (hint) =>
              window.prompt(hint ? `2FA password (${hint})` : '2FA password (if any)') ?? '',
            onError: async (err) => {
              console.error(err)
              return false
            },
          },
        )

        await persistClientSession(client)
        setState({ status: 'ready' })
      } catch (e: unknown) {
        console.error(e)
        setState({ status: 'error', error: formatTelegramError(e) })
      }
    }
    const p = run()
    qrLoginInFlightRef.current = p
    try {
      await p
    } finally {
      if (qrLoginInFlightRef.current === p) {
        qrLoginInFlightRef.current = null
      }
    }
  }, [client])

  const logout = useCallback(async () => {
    try {
      if (client) {
        await client.disconnect()
      }
    } finally {
      await clearSession()
      setClient(null)
      setCurrentUser(null)
      setState({ status: 'loading' })
    }
    await bootstrap()
  }, [client, bootstrap])

  const peer = storagePeer || 'me'

  const listFiles = useCallback(async (): Promise<TelegramFileMessage[]> => {
    if (!client) return []
    const result: TelegramFileMessage[] = []

    const it = client.iterMessages(peer, {
      limit: LIST_LIMIT,
    })

    for await (const message of it) {
      const doc = message.document
      if (!doc) continue
      const nameAttr = doc.attributes.find(
        (a: { className?: string; fileName?: string }) =>
          a.className === 'DocumentAttributeFilename' || 'fileName' in a,
      )
      const name = (nameAttr as { fileName?: string } | undefined)?.fileName ?? 'Unknown'
      const size = Number(doc.size) || 0
      const date = new Date(Number(message.date) * 1000)
      const mimeType = doc.mimeType ? String(doc.mimeType) : undefined

      result.push({
        id: Number(message.id),
        name,
        size,
        date,
        mimeType,
      })
    }

    return result
  }, [client, peer])

  const uploadFile = useCallback(
    async (file: File, options?: { onProgress?: FileTransferProgress }) => {
      if (!client) throw new Error('Client not ready')
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error('FILE_TOO_LARGE')
      }
      const onProgress = options?.onProgress
      const total = Math.max(file.size, 1)
      if (tryTagBrowserFileForGramjs(file)) {
        await client.sendFile(peer, {
          file,
          forceDocument: true,
          workers: 1,
          progressCallback: onProgress
            ? (ratio: number) => ratioToLoadedTotal(ratio, file.size, onProgress)
            : undefined,
        })
        onProgress?.(file.size, total)
        return
      }
      const ab = await file.arrayBuffer()
      const buf = Buffer.from(ab)
      const cf = new CustomFile(file.name, file.size, '', buf)
      const input = await client.uploadFile({
        file: cf,
        workers: 1,
        maxBufferSize: MAX_UPLOAD_BYTES,
        onProgress: onProgress
          ? (ratio: number) => ratioToLoadedTotal(ratio, file.size, onProgress)
          : undefined,
      })
      await client.sendFile(peer, {
        file: input,
        forceDocument: true,
        workers: 1,
      })
      onProgress?.(file.size, total)
    },
    [client, peer],
  )

  const downloadFile = useCallback(
    async (
      msgId: number,
      options?: { onProgress?: FileTransferProgress; fileSize?: number },
    ): Promise<Blob> => {
      if (!client) throw new Error('Client not ready')
      const msgs = await client.getMessages(peer, { ids: msgId })
      const msg = msgs[0]
      if (!msg || !msg.document) {
        throw new Error('File not found')
      }
      const docSizeRaw = msg.document && 'size' in msg.document ? Number(msg.document.size) : 0
      const totalHint = options?.fileSize && options.fileSize > 0 ? options.fileSize : docSizeRaw
      const onProgress = options?.onProgress
      const buffer = await client.downloadMedia(msg, {
        progressCallback:
          onProgress && totalHint > 0
            ? async (received, total) => {
                const loaded = Number(received.toString())
                const t = Number(total.toString()) || totalHint
                onProgress(loaded, t > 0 ? t : totalHint)
              }
            : onProgress
              ? async (received) => {
                  const loaded = Number(received.toString())
                  onProgress(loaded, totalHint > 0 ? totalHint : loaded)
                }
              : undefined,
      })
      if (buffer == null) {
        throw new Error('Download failed')
      }
      const bytes =
        typeof buffer === 'string' ? new TextEncoder().encode(buffer) : new Uint8Array(buffer)
      if (onProgress && totalHint > 0) {
        onProgress(totalHint, totalHint)
      }
      return new Blob([bytes])
    },
    [client, peer],
  )

  const deleteFile = useCallback(
    async (msgId: number) => {
      if (!client) throw new Error('Client not ready')
      await client.deleteMessages(peer, [msgId], {})
    },
    [client, peer],
  )

  const forwardFile = useCallback(
    async (msgId: number, toPeer: string) => {
      if (!client) throw new Error('Client not ready')
      await client.forwardMessages(toPeer, {
        messages: [msgId],
        fromPeer: peer,
      })
    },
    [client, peer],
  )

  const value = useMemo<TelegramContextValue>(
    () => ({
      state,
      client,
      currentUser,
      storagePeer: peer,
      setStoragePeer,
      fetchStorageChats,
      bootstrap,
      startQrLogin,
      logout,
      listFiles,
      uploadFile,
      downloadFile,
      deleteFile,
      forwardFile,
    }),
    [
      state,
      client,
      currentUser,
      peer,
      setStoragePeer,
      fetchStorageChats,
      bootstrap,
      startQrLogin,
      logout,
      listFiles,
      uploadFile,
      downloadFile,
      deleteFile,
      forwardFile,
    ],
  )

  return createElement(TelegramContext.Provider, { value }, children)
}

export function useTelegram(): TelegramContextValue {
  const ctx = useContext(TelegramContext)
  if (!ctx) {
    throw new Error('useTelegram must be used inside TelegramProvider')
  }
  return ctx
}
