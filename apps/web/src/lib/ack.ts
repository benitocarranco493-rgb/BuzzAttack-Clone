import type { Ack } from '@buzz/shared';

const DEFAULT_ACK_TIMEOUT_MS = 5000;

/**
 * Envía un evento con ack y espera su respuesta; si el servidor no contesta
 * en `timeoutMs`, devuelve un error tipado en vez de dejar la promesa colgada.
 */
export function ask<T>(
  emit: (ack: (res: Ack<T>) => void) => void,
  timeoutMs = DEFAULT_ACK_TIMEOUT_MS,
): Promise<Ack<T>> {
  return new Promise<Ack<T>>((resolve) => {
    const timer = setTimeout(() => {
      resolve({ ok: false, error: { code: 'timeout', message: 'Sin respuesta del servidor.' } });
    }, timeoutMs);
    emit((res) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}
