import { randomUUID } from 'node:crypto';

import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  PODIUM_COUNT,
  ROOM_TTL_MS,
  SPECIALIST_CATEGORY_COUNT,
  TEAM_MAX_PLAYERS,
  generateRoomCode,
  type Ack,
  type Category,
  type Phase,
  type Player,
  type PublicPlayer,
  type StateSyncPayload,
  type Team,
} from '@buzz/shared';

/** Paleta visible y accesible para los 6 podios (contraste AA sobre fondo oscuro). */
export const TEAM_COLORS = [
  '#ff5d5d',
  '#ffb020',
  '#3ecb6e',
  '#29a3ff',
  '#b06bff',
  '#ff57c0',
] as const;

export type RoomErrorCode =
  | 'room_not_found'
  | 'room_full'
  | 'already_started'
  | 'invalid_token'
  | 'player_not_found'
  | 'team_full'
  | 'team_not_found'
  | 'invalid_categories'
  | 'not_host'
  | 'not_enough_players'
  | 'categories_missing';

export type RoomResult<T> = Ack<T>;

/** Jugador interno: al Player público se le añade el socket al que está atado. */
interface RoomPlayer extends Player {
  socketId?: string;
}

interface RoomState {
  code: string;
  hostToken: string;
  hostSocketId?: string;
  phase: Phase;
  paused: boolean;
  players: Map<string, RoomPlayer>;
  socketToPlayer: Map<string, string>;
  teams: Team[];
  availableCategories: Category[];
  createdAt: number;
  lastActivityAt: number;
}

export interface RoomManagerOptions {
  categories: Category[];
  now?: () => number;
  randomCode?: () => number;
}

export interface CreateRoomOutput {
  code: string;
  hostToken: string;
}

export interface JoinOutput {
  playerId: string;
  playerToken: string;
  rejoined: boolean;
}

export interface DisconnectOutput {
  roomCode?: string;
}

function error<E extends RoomErrorCode>(code: E, message: string): RoomResult<never> {
  return { ok: false, error: { code, message } };
}

/** Crea los 6 podios por defecto (1–3 jugadores, como el original). */
export function createDefaultTeams(): Team[] {
  return Array.from({ length: PODIUM_COUNT }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Equipo ${index + 1}`,
    color: TEAM_COLORS[index] ?? '#888888',
    podium: index + 1,
    playerIds: [],
    score: 0,
    spinsTaken: 0,
  }));
}

/** El podio con más hueco (y menos jugadores); empates resueltos por orden de podio. */
export function pickTeamId(
  teams: readonly Team[],
  teamSizes: ReadonlyMap<string, number>,
): string | undefined {
  let best: Team | undefined;
  let bestSize = Number.POSITIVE_INFINITY;
  for (const team of teams) {
    const size = teamSizes.get(team.id) ?? 0;
    if (size < TEAM_MAX_PLAYERS && size < bestSize) {
      best = team;
      bestSize = size;
    }
  }
  return best?.id;
}
/**
 * Único dueño de las salas (AGENTS §4.8). Estado en memoria; cada sala encapsula sus datos.
 * Métodos puros y validables: todo efecto (sockets, timers) vive en la capa de handlers.
 */
export class RoomManager {
  private rooms = new Map<string, RoomState>();
  private readonly categories: Category[];
  private readonly now: () => number;
  private readonly randomCode: () => number;

  constructor(options: RoomManagerOptions) {
    this.categories = options.categories;
    this.now = options.now ?? Date.now;
    this.randomCode = options.randomCode ?? Math.random;
  }

  createRoom(hostSocketId: string): RoomResult<CreateRoomOutput> {
    const room: RoomState = {
      code: this.generateUniqueCode(),
      hostToken: randomUUID(),
      hostSocketId,
      phase: 'lobby',
      paused: false,
      players: new Map(),
      socketToPlayer: new Map(),
      teams: createDefaultTeams(),
      availableCategories: this.categories,
      createdAt: this.now(),
      lastActivityAt: this.now(),
    };
    this.rooms.set(room.code, room);
    return { ok: true, data: { code: room.code, hostToken: room.hostToken } };
  }

  private generateUniqueCode(): string {
    for (;;) {
      const code = generateRoomCode(this.randomCode).toUpperCase();
      if (!this.rooms.has(code)) return code;
    }
  }

  joinPlayer(input: { code: string; nickname: string; socketId: string }): RoomResult<JoinOutput> {
    const room = this.rooms.get(input.code);
    if (!room) return error('room_not_found', 'La sala no existe o ha caducado.');
    if (room.phase !== 'lobby') return error('already_started', 'La partida ya ha empezado.');
    if (room.players.size >= MAX_PLAYERS) {
      return error('room_full', `La sala está llena (máximo ${MAX_PLAYERS} jugadores).`);
    }

    const teamId = pickTeamId(room.teams, teamSizes(room));
    if (!teamId) return error('room_full', 'No quedan podios libres.');

    const player: RoomPlayer = {
      id: randomUUID(),
      token: randomUUID(),
      nickname: input.nickname,
      teamId,
      connected: true,
      specialistCategoryIds: [],
      socketId: input.socketId,
    };
    room.players.set(player.id, player);
    room.socketToPlayer.set(input.socketId, player.id);
    const team = room.teams.find((t) => t.id === teamId);
    if (team) team.playerIds.push(player.id);
    room.lastActivityAt = this.now();
    return { ok: true, data: { playerId: player.id, playerToken: player.token, rejoined: false } };
  }

  rejoinPlayer(input: {
    code: string;
    playerToken: string;
    socketId: string;
  }): RoomResult<JoinOutput> {
    const room = this.rooms.get(input.code);
    if (!room) return error('room_not_found', 'La sala no existe o ha caducado.');
    const player = [...room.players.values()].find((p) => p.token === input.playerToken);
    if (!player) return error('invalid_token', 'No se reconoce esta sesión; vuelve a entrar.');

    if (player.socketId && player.socketId !== input.socketId) {
      room.socketToPlayer.delete(player.socketId);
    }
    player.socketId = input.socketId;
    player.connected = true;
    room.socketToPlayer.set(input.socketId, player.id);
    room.lastActivityAt = this.now();
    return { ok: true, data: { playerId: player.id, playerToken: player.token, rejoined: true } };
  }

  hostRejoin(input: {
    code: string;
    hostToken: string;
    socketId: string;
  }): RoomResult<{ code: string }> {
    const room = this.rooms.get(input.code);
    if (!room) return error('room_not_found', 'La sala no existe o ha caducado.');
    if (room.hostToken !== input.hostToken)
      return error('invalid_token', 'Token de anfitrión inválido.');

    const previous = room.hostSocketId;
    if (previous !== undefined && previous !== input.socketId) {
      room.socketToPlayer.delete(previous);
    }
    room.hostSocketId = input.socketId;
    room.lastActivityAt = this.now();
    return { ok: true, data: { code: room.code } };
  }
  chooseTeam(input: {
    code: string;
    playerId: string;
    teamId?: string;
    newTeamName?: string;
  }): RoomResult<null> {
    const room = this.rooms.get(input.code);
    if (!room) return error('room_not_found', 'La sala no existe o ha caducado.');
    const player = room.players.get(input.playerId);
    if (!player) return error('player_not_found', 'Jugador no encontrado.');
    if (room.phase !== 'lobby') return error('already_started', 'La partida ya ha empezado.');

    const currentTeam = room.teams.find((t) => t.id === player.teamId);

    if (input.newTeamName !== undefined) {
      if (!currentTeam) return error('team_not_found', 'Equipo no encontrado.');
      currentTeam.name = input.newTeamName;
      room.lastActivityAt = this.now();
      return { ok: true, data: null };
    }

    if (input.teamId === undefined) return error('team_not_found', 'Equipo no encontrado.');
    if (input.teamId === player.teamId) return { ok: true, data: null }; // ya está ahí
    const target = room.teams.find((t) => t.id === input.teamId);
    if (!target) return error('team_not_found', 'Equipo no encontrado.');
    if (target.playerIds.length >= TEAM_MAX_PLAYERS) {
      return error('team_full', `Ese podio ya tiene ${TEAM_MAX_PLAYERS} jugadores.`);
    }

    if (currentTeam) {
      currentTeam.playerIds = currentTeam.playerIds.filter((id) => id !== player.id);
    }
    target.playerIds.push(player.id);
    player.teamId = target.id;
    room.lastActivityAt = this.now();
    return { ok: true, data: null };
  }

  pickCategories(input: {
    code: string;
    playerId: string;
    categoryIds: string[];
  }): RoomResult<null> {
    const room = this.rooms.get(input.code);
    if (!room) return error('room_not_found', 'La sala no existe o ha caducado.');
    const player = room.players.get(input.playerId);
    if (!player) return error('player_not_found', 'Jugador no encontrado.');
    if (room.phase !== 'lobby') return error('already_started', 'La partida ya ha empezado.');

    const unique = new Set(input.categoryIds);
    if (unique.size !== input.categoryIds.length || unique.size !== SPECIALIST_CATEGORY_COUNT) {
      return error(
        'invalid_categories',
        `Elige exactamente ${SPECIALIST_CATEGORY_COUNT} categorías distintas.`,
      );
    }
    const known = new Set(this.categories.map((category) => category.id));
    if (!input.categoryIds.every((id) => known.has(id))) {
      return error('invalid_categories', 'Alguna categoría no existe.');
    }
    player.specialistCategoryIds = input.categoryIds;
    room.lastActivityAt = this.now();
    return { ok: true, data: null };
  }
  startGame(input: { code: string }): RoomResult<null> {
    const room = this.rooms.get(input.code);
    if (!room) return error('room_not_found', 'La sala no existe o ha caducado.');
    if (room.phase !== 'lobby') return error('already_started', 'La partida ya ha empezado.');
    // El handler ya comprueba que el socket es anfitrión; aquí validamos que haya uno atado.
    if (room.hostSocketId === undefined)
      return error('not_host', 'El anfitrión no está conectado.');

    const connectedPlayers = [...room.players.values()].filter((player) => player.connected);
    if (connectedPlayers.length < MIN_PLAYERS) {
      return error(
        'not_enough_players',
        `Se necesitan al menos ${MIN_PLAYERS} jugadores conectados.`,
      );
    }
    const withoutCategories = connectedPlayers.find(
      (player) => player.specialistCategoryIds.length !== SPECIALIST_CATEGORY_COUNT,
    );
    if (withoutCategories) {
      return error(
        'categories_missing',
        `Faltan categorías por elegir a ${withoutCategories.nickname}.`,
      );
    }
    room.phase = 'intro';
    room.lastActivityAt = this.now();
    return { ok: true, data: null };
  }

  /** Marca como desconectado el jugador (o anfitrión) atado a un socket; devuelve la sala afectada. */
  handleSocketDisconnect(socketId: string): DisconnectOutput {
    for (const room of this.rooms.values()) {
      if (room.hostSocketId === socketId) {
        delete room.hostSocketId;
        room.lastActivityAt = this.now();
        return { roomCode: room.code };
      }
      const playerId = room.socketToPlayer.get(socketId);
      if (playerId) {
        const player = room.players.get(playerId);
        if (player) {
          player.connected = false;
          delete player.socketId;
        }
        room.socketToPlayer.delete(socketId);
        room.lastActivityAt = this.now();
        return { roomCode: room.code };
      }
    }
    return {};
  }

  /** Estado público de la sala (nunca incluye tokens ni datos privados). */
  getState(code: string): StateSyncPayload | undefined {
    const room = this.rooms.get(code);
    if (!room) return undefined;

    const connectedPlayers = [...room.players.values()].filter((player) => player.connected);
    const readyCount = connectedPlayers.filter(
      (player) => player.specialistCategoryIds.length === SPECIALIST_CATEGORY_COUNT,
    ).length;
    return {
      roomCode: room.code,
      phase: room.phase,
      paused: room.paused,
      players: [...room.players.values()].map(toPublicPlayer),
      teams: room.teams.map((team) => ({ ...team, playerIds: [...team.playerIds] })),
      availableCategories: room.availableCategories,
      minPlayers: MIN_PLAYERS,
      connectedPlayers: connectedPlayers.length,
      canStart:
        room.phase === 'lobby' &&
        connectedPlayers.length >= MIN_PLAYERS &&
        readyCount === connectedPlayers.length,
    };
  }

  hasRoom(code: string): boolean {
    return this.rooms.has(code);
  }

  /** Elimina salas inactivas más allá del TTL (3 h). */
  cleanupExpired(): void {
    const now = this.now();
    for (const [code, room] of this.rooms) {
      if (now - room.lastActivityAt >= ROOM_TTL_MS) {
        this.rooms.delete(code);
      }
    }
  }

  get roomCount(): number {
    return this.rooms.size;
  }
}

function teamSizes(room: RoomState): Map<string, number> {
  const sizes = new Map<string, number>();
  for (const team of room.teams) {
    sizes.set(team.id, team.playerIds.length);
  }
  return sizes;
}

function toPublicPlayer(player: RoomPlayer): PublicPlayer {
  return {
    id: player.id,
    nickname: player.nickname,
    teamId: player.teamId,
    connected: player.connected,
    specialistCategoryIds: player.specialistCategoryIds,
  };
}
