import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { I18nProvider, useI18n } from './i18n/I18nContext'
import { TelegramProvider, useTelegram } from './lib/telegram'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'

function AppInner() {
  const { state, bootstrap, logout } = useTelegram()
  const { t } = useI18n()

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-200">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{t('appLoading')}</span>
        </div>
      </div>
    )
  }

  if (state.status === 'needs_qr' || state.status === 'logging_in') {
    return <Login />
  }

  if (state.status === 'error') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center text-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <p className="text-lg font-semibold">{t('appError')}</p>
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{state.error}</p>
        <button
          type="button"
          onClick={() => void bootstrap()}
          className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
        >
          {t('appRetry')}
        </button>
      </div>
    )
  }

  if (state.status === 'ready') {
    return <Dashboard onLogout={logout} />
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100 p-4 text-sm text-slate-700">
      {t('appUnknown')}
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <TelegramProvider>
        <AppInner />
      </TelegramProvider>
    </I18nProvider>
  )
}
