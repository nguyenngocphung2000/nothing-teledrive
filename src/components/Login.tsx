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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {t('loginTitle')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('loginSubtitle')}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/40">
          {!qrCode && (
            <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-xs">{t('loginGenerating')}</p>
            </div>
          )}

          {qrCode && (
            <div className="flex w-full flex-col items-center gap-4">
              <div
                className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-600"
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
                className="text-xs text-[var(--color-primary)] underline-offset-2 hover:underline"
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
