import { es, type MessageKey, type Messages } from './es';

export type Lang = 'es' | 'en';

/** 'en' quedará preparado para una fase futura (fallback automático a 'es'). */
const dictionaries: Partial<Record<Lang, Partial<Messages>>> = { es };

let currentLang: Lang = 'es';

export function setLang(lang: Lang): void {
  currentLang = lang;
}

/** Traduce una clave; `{param}` se sustituye por los valores dados. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const template = dictionaries[currentLang]?.[key] ?? es[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Mensaje legible para los códigos de error que emite el servidor. */
export function errorMessage(code: string): string {
  const key = `error.${code}` as MessageKey;
  return key in es ? t(key) : t('error.unknown');
}
