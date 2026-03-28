/** Chỉ xóa session khi Telegram báo key/session không còn hợp lệ — không phải lỗi mạng tạm thời. */
export function isSessionInvalidError(e: unknown): boolean {
  if (e == null) return false
  const o = e as { errorMessage?: string; message?: string; code?: number }
  const raw = String(o.errorMessage ?? o.message ?? e)
  const upper = raw.toUpperCase()
  const invalidTokens = [
    'AUTH_KEY_UNREGISTERED',
    'AUTH_KEY_INVALID',
    'SESSION_REVOKED',
    'SESSION_EXPIRED',
    'USER_DEACTIVATED',
    'AUTH_KEY_DUPLICATED',
  ]
  if (invalidTokens.some((t) => upper.includes(t))) return true
  if (o.code === 401 && upper.includes('UNAUTHORIZED')) return true
  return false
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
