/**
 * Persistencia mínima del cliente (AGENTS §6): tokens y ajustes en localStorage
 * con try/catch (Safari privado puede lanzar).
 */

export type HostSession = {
  code: string;
  hostToken: string;
};

export type PlayerSession = {
  code: string;
  playerToken: string;
  playerId: string;
  nickname: string;
};

const HOST_KEY = 'buzz-home:host-session';
const PLAYER_KEY = 'buzz-home:player-session';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readJson(key: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readString(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function writeSession(key: string, value: Record<string, string>): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin persistencia la partida sigue funcionando (solo pierde la reconexión).
  }
}

function removeSession(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nada que hacer.
  }
}

export function loadHostSession(): HostSession | null {
  const parsed = readJson(HOST_KEY);
  if (!parsed) return null;
  const code = readString(parsed, 'code');
  const hostToken = readString(parsed, 'hostToken');
  return code && hostToken ? { code, hostToken } : null;
}

export function saveHostSession(session: HostSession): void {
  writeSession(HOST_KEY, session);
}

export function clearHostSession(): void {
  removeSession(HOST_KEY);
}

export function loadPlayerSession(): PlayerSession | null {
  const parsed = readJson(PLAYER_KEY);
  if (!parsed) return null;
  const code = readString(parsed, 'code');
  const playerToken = readString(parsed, 'playerToken');
  const playerId = readString(parsed, 'playerId');
  const nickname = readString(parsed, 'nickname');
  return code && playerToken && playerId && nickname
    ? { code, playerToken, playerId, nickname }
    : null;
}

export function savePlayerSession(session: PlayerSession): void {
  writeSession(PLAYER_KEY, session);
}

export function clearPlayerSession(): void {
  removeSession(PLAYER_KEY);
}
