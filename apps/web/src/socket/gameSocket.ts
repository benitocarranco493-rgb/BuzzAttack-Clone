import type { ClientToServerEvents, ServerToClientEvents } from '@buzz/shared';
import { io, type Socket } from 'socket.io-client';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let instance: GameSocket | undefined;

/**
 * Cliente Socket.IO único de la app (con reconexión automática).
 * Por defecto va al mismo origen (en dev, el proxy de Vite hacia :3000);
 * `VITE_SERVER_URL` permite apuntar a otro servidor (LAN/VPS).
 */
export function getGameSocket(): GameSocket {
  instance ??= io(import.meta.env.VITE_SERVER_URL ?? undefined, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
  });
  return instance;
}
