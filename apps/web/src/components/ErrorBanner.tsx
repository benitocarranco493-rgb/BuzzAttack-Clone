import { errorMessage, t } from '../i18n';

export interface ErrorBannerProps {
  /** Código de error del servidor (o interno); `null` oculta el banner. */
  code: string | null;
  onDismiss: () => void;
}

/** Banner de error anunciado con `role="alert"` (accesibilidad). */
export function ErrorBanner({ code, onDismiss }: ErrorBannerProps) {
  if (!code) return null;
  return (
    <div className="error-banner" role="alert">
      <span>{errorMessage(code)}</span>
      <button type="button" className="btn btn--ghost btn--compact" onClick={onDismiss}>
        {t('common.dismiss')}
      </button>
    </div>
  );
}
