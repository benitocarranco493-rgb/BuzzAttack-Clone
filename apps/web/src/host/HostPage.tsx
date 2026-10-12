import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  type HostRejoinAckData,
  type RoomCreateAckData,
} from '@buzz/shared';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';

import { CategoryChips } from '../components/CategoryChips';
import { ErrorBanner } from '../components/ErrorBanner';
import { PlayersList } from '../components/PlayersList';
import { TeamsGrid } from '../components/TeamsGrid';
import { useConnectionStatus, useGameState } from '../hooks/useGameState';
import { t } from '../i18n';
import { ask } from '../lib/ack';
import {
  clearHostSession,
  loadHostSession,
  saveHostSession,
  type HostSession,
} from '../lib/storage';
import { getGameSocket } from '../socket/gameSocket';

/** Pantalla del anfitrión: crear sala, QR de acceso y lobby hasta empezar. */
export function HostPage() {
  const socket = getGameSocket();
  const { state, error, clearError } = useGameState(socket);
  const connected = useConnectionStatus(socket);
  const [session, setSession] = useState<HostSession | null>(() => loadHostSession());
  const [rejoining, setRejoining] = useState<boolean>(() => loadHostSession() !== null);
  const [creating, setCreating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Recuperación tras recargar: host:rejoin con el token guardado.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setRejoining(true);
    void ask<HostRejoinAckData>((ack) =>
      socket.emit('host:rejoin', { code: session.code, hostToken: session.hostToken }, ack),
    ).then((res) => {
      if (cancelled) return;
      setRejoining(false);
      if (res.ok) return;
      // Sala caducada o token inválido: empezamos de cero.
      clearHostSession();
      setSession(null);
      setLocalError(res.error.code);
    });
    return () => {
      cancelled = true;
    };
  }, [socket, session]);

  const handleCreate = useCallback((): void => {
    setCreating(true);
    setLocalError(null);
    void ask<RoomCreateAckData>((ack) => socket.emit('room:create', {}, ack)).then((res) => {
      setCreating(false);
      if (!res.ok) {
        setLocalError(res.error.code);
        return;
      }
      const newSession: HostSession = { code: res.data.code, hostToken: res.data.hostToken };
      saveHostSession(newSession);
      setSession(newSession);
    });
  }, [socket]);

  const dismissError = useCallback((): void => {
    setLocalError(null);
    clearError();
  }, [clearError]);

  const bannerCode = localError ?? error?.code ?? null;

  if (!state) {
    return (
      <main className="app-shell">
        <h1 className="app-title app-title--small">{t('host.title')}</h1>
        <p className="tagline">{t('app.tagline')}</p>
        <ErrorBanner code={bannerCode} onDismiss={dismissError} />
        {rejoining ? <p className="status">{t('host.reconnecting')}</p> : null}
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleCreate}
          disabled={creating || !connected}
        >
          {creating ? t('host.creating') : t('host.createRoom')}
        </button>
        {!connected ? <p className="status">{t('common.disconnected')}</p> : null}
      </main>
    );
  }

  const playUrl = `${window.location.origin}/play?code=${state.roomCode}`;
  const started = state.phase !== 'lobby';

  return (
    <main className="lobby-shell">
      <header className="lobby-header">
        <span className="lobby-header__status">
          <span
            className={`connection-dot${connected ? ' connection-dot--on' : ''}`}
            aria-hidden="true"
          />
          {connected ? t('common.connected') : t('common.disconnected')}
        </span>
        <h1 className="app-title app-title--small">{t('host.title')}</h1>
      </header>

      <ErrorBanner code={bannerCode} onDismiss={dismissError} />

      <section className="join-panel" aria-label={t('host.enterCode')}>
        <p className="join-label">{t('host.scanQr')}</p>
        <p className="room-code" aria-label={t('host.roomCodeLabel')}>
          {state.roomCode}
        </p>
        <QRCodeSVG value={playUrl} size={220} bgColor="#0b0b12" fgColor="#f4f4f8" />
        <p className="status">{t('host.qrHint')}</p>
      </section>

      <section aria-label={t('host.playersTitle')}>
        <h2>{t('host.playersTitle', { count: state.connectedPlayers, max: MAX_PLAYERS })}</h2>
        <PlayersList players={state.players} teams={state.teams} />
      </section>

      <section aria-label={t('host.teamsTitle')}>
        <h2>{t('host.teamsTitle')}</h2>
        <TeamsGrid teams={state.teams} />
      </section>

      <section aria-label={t('host.categoriesTitle')}>
        <h2>{t('host.categoriesTitle')}</h2>
        <CategoryChips categories={state.availableCategories} />
      </section>

      <footer className="start-panel">
        {started ? (
          <p className="status status--success" role="status">
            {t('host.started')}
          </p>
        ) : (
          <>
            <p className="status" role="status">
              {state.canStart
                ? t('host.readyToStart')
                : state.connectedPlayers < MIN_PLAYERS
                  ? t('host.needPlayers', { count: state.connectedPlayers, min: MIN_PLAYERS })
                  : t('host.needCategories')}
            </p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!state.canStart}
              onClick={() => {
                socket.emit('game:start');
              }}
            >
              {t('host.start')}
            </button>
          </>
        )}
      </footer>
    </main>
  );
}
