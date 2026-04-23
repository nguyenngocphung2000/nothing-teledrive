import { useEffect } from 'react'
import { QrCode, Loader2 } from 'lucide-react'
import QRCodePkg from 'react-qr-code'
import type QRCodeComponent from 'react-qr-code'
import { useI18n } from '../i18n/I18nContext'
import { useTelegram } from '../lib/telegram'

const QRCode: typeof QRCodeComponent =
  typeof QRCodePkg === 'function'
    ? QRCodePkg
    : (QRCodePkg as { default: typeof QRCodeComponent }).default

export function Login() {
  const { state, startQrLogin } = useTelegram()
  const { t } = useI18n()

  const qrCode =
    state.status === 'needs_qr' || state.status === 'logging_in' ? state.qrCode : null

  useEffect(() => {
    if (!qrCode) {
      void startQrLogin()
    }
  }, [qrCode, startQrLogin])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md rounded-[2rem] bg-white/95 p-8 shadow-2xl ring-1 ring-slate-200/80 dark:bg-slate-900/95 dark:ring-slate-700">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              {t('loginTitle')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('loginSubtitle')}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-primary/20 bg-slate-50 p-6 dark:border-primary/20 dark:bg-slate-900/70">
          {!qrCode && (
            <div className="flex flex-col items-center gap-3 text-slate-600 dark:text-slate-300">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm font-medium">{t('loginGenerating')}</p>
              <button
                type="button"
                onClick={() => void startQrLogin()}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600"
              >
                {t('loginRetry')}
              </button>
            </div>
          )}

          {qrCode && (
            <div className="flex w-full flex-col items-center gap-4">
              <div
                className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-600"
                role="img"
                aria-label="Telegram login QR"
              >
                <QRCode value={qrCode} size={220} level="M" title="Telegram" />
              </div>
              <p className="text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {t('loginSteps')}
              </p>
              <a
                href={qrCode}
                className="text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                {t('loginFallback')}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
