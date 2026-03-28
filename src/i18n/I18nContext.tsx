/* eslint-disable react-refresh/only-export-components -- hook + provider belong together */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { type MessageKey, resolveLocale, SUPPORTED_LOCALE_CODES, translate } from './catalog'

const STORAGE_KEY = 'teledrive_ui_locale'

type I18nValue = {
  locale: string
  /** 'system' | mã locale */
  localeSetting: string
  setLocaleSetting: (v: string) => void
  t: (key: MessageKey, vars?: Record<string, string>) => string
  supportedCodes: readonly string[]
}

const I18nContext = createContext<I18nValue | undefined>(undefined)

function normalizeLocaleSetting(raw: string | null): string {
  if (!raw || raw === 'system') return 'system'
  if (raw === 'en' || raw === 'vi') return raw
  return 'system'
}

function readInitialSetting(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return normalizeLocaleSetting(v)
  } catch {
    /* ignore */
  }
  return 'system'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [localeSetting, setLocaleSettingState] = useState<string>(readInitialSetting)

  const effectiveLocale = useMemo(
    () => (localeSetting === 'system' ? resolveLocale(null) : resolveLocale(localeSetting)),
    [localeSetting],
  )

  const setLocaleSetting = useCallback((v: string) => {
    const next = normalizeLocaleSetting(v === 'system' ? 'system' : v)
    setLocaleSettingState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string>) => {
      let s = translate(effectiveLocale, key)
      if (vars) {
        for (const [k, val] of Object.entries(vars)) {
          s = s.replaceAll(`{${k}}`, val)
        }
      }
      return s
    },
    [effectiveLocale],
  )

  const value = useMemo<I18nValue>(
    () => ({
      locale: effectiveLocale,
      localeSetting,
      setLocaleSetting,
      t,
      supportedCodes: SUPPORTED_LOCALE_CODES,
    }),
    [effectiveLocale, localeSetting, setLocaleSetting, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n requires I18nProvider')
  return ctx
}
