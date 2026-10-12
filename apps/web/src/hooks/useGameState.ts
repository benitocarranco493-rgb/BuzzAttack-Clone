import type { ServerErrorPayload, StateSyncPayload } from '@buzz/shared';
import { useEffect, useState } from 'react';

import type { GameSocket } from '../socket/gameSocket';

export interface GameStateView {
  state: StateSyncPayload | null;
  error: ServerErrorPayload | null;
  clearError: () => void;
}

/** Suscripción al estado de sala (`state:sync`) y a errores (`game:error`). */
export function useGameState(socket: GameSocket): GameStateView {
  const [state, setState] = useState<StateSyncPayload | null>(null);
  const [error, setError] = useState<ServerErrorPayload | null>(null);

  useEffect(() => {
    const onState = (payload: StateSyncPayload): void => setState(payload);
    const onError = (payload: ServerErrorPayload): void => setError(payload);
    socket.on('state:sync', onState);
    socket.on('game:error', onError);
    return () => {
      socket.off('state:sync', onState);
      socket.off('game:error', onError);
    };
  }, [socket]);

  return { state, error, clearError: () => setError(null) };
}

/** Indicador de conexión del socket (punto verde/gris). */
export function useConnectionStatus(socket: GameSocket): boolean {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = (): void => setConnected(true);
    const onDisconnect = (): void => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setConnected(socket.connected);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  return connected;
}
