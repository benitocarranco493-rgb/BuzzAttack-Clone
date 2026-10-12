import {
  EVENT_RATE_LIMIT_PER_SEC,
  EVENTS,
  ROOM_CREATE_LIMIT_PER_HOUR,
  categoriesPickSchema,
  hostRejoinSchema,
  roomCreateSchema,
  roomJoinSchema,
  roomRejoinSchema,
  teamChooseSchema,
  type Ack,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from '@buzz/shared';

import type { FastifyBaseLogger } from 'fastify';
import type { Server, Socket } from 'socket.io';

import { TokenBucketRateLimiter } from '../security/rateLimit.js';
import type { RoomManager } from '../rooms/RoomManager.js';

type GameServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

interface RoomCreationEntry {
  count: number;
  windowStart: number;
}

export interface SocketHandlerDeps {
  io: GameServer;
  rooms: RoomManager;
  logger: FastifyBaseLogger;
  getClientIp: (socket: GameSocket) => string;
  now?: () => number;
}

/**
 * Conecta los eventos de Socket.IO con el RoomManager.
 * Reglas: validar todo payload con Zod, ignorar eventos inválidos (con log),
 * y emitir `state:sync` a toda la sala tras cada cambio.
 */
export function registerSocketHandlers(deps: SocketHandlerDeps): void {
  const { io, rooms, logger, getClientIp } = deps;
  const now = deps.now ?? Date.now;
  const roomCreationsByIp = new Map<string, RoomCreationEntry>();

  io.on('connection', (socket) => {
    const limiter = new TokenBucketRateLimiter(
      EVENT_RATE_LIMIT_PER_SEC,
      EVENT_RATE_LIMIT_PER_SEC,
      now,
    );

    socket.use((middlewareEvent, next) => {
      const [event] = middlewareEvent;
      if (event !== 'tap' && !limiter.tryTake()) {
        logger.warn({ socketId: socket.id, event }, 'rate limit exceeded, evento descartado');
        next(new Error('rate_limited'));
        return;
      }
      next();
    });

    socket.on(EVENTS['room:create'], (payload, ack) => {
      const parsed = roomCreateSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        ackError(ack, 'invalid_payload', 'Payload inválido.');
        return;
      }
      const ip = getClientIp(socket);
      if (!allowRoomCreation(roomCreationsByIp, ip, now)) {
        ackError(ack, 'rate_limited', 'Demasiadas salas creadas desde esta IP.');
        return;
      }
      const result = rooms.createRoom(socket.id);
      if (!result.ok) {
        ackError(ack, result.error.code, result.error.message);
        return;
      }
      socket.data.roomCode = result.data.code;
      socket.data.isHost = true;
      void socket.join(result.data.code);
      ack({ ok: true, data: result.data });
      broadcastState(io, rooms, result.data.code);
    });

    socket.on(EVENTS['room:join'], (payload, ack) => {
      const parsed = roomJoinSchema.safeParse(payload);
      if (!parsed.success) {
        ackError(ack, 'invalid_payload', 'Payload inválido.');
        return;
      }
      const result = rooms.joinPlayer({
        code: parsed.data.code,
        nickname: parsed.data.nickname,
        socketId: socket.id,
      });
      if (!result.ok) {
        ackError(ack, result.error.code, result.error.message);
        return;
      }
      socket.data.roomCode = parsed.data.code;
      socket.data.playerId = result.data.playerId;
      void socket.join(parsed.data.code);
      ack({
        ok: true,
        data: { playerToken: result.data.playerToken, playerId: result.data.playerId },
      });
      broadcastState(io, rooms, parsed.data.code);
    });
    socket.on(EVENTS['room:rejoin'], (payload, ack) => {
      const parsed = roomRejoinSchema.safeParse(payload);
      if (!parsed.success) {
        ackError(ack, 'invalid_payload', 'Payload inválido.');
        return;
      }
      const result = rooms.rejoinPlayer({
        code: parsed.data.code,
        playerToken: parsed.data.playerToken,
        socketId: socket.id,
      });
      if (!result.ok) {
        ackError(ack, result.error.code, result.error.message);
        return;
      }
      socket.data.roomCode = parsed.data.code;
      socket.data.playerId = result.data.playerId;
      void socket.join(parsed.data.code);
      ack({
        ok: true,
        data: { playerToken: result.data.playerToken, playerId: result.data.playerId },
      });
      broadcastState(io, rooms, parsed.data.code);
    });

    socket.on(EVENTS['host:rejoin'], (payload, ack) => {
      const parsed = hostRejoinSchema.safeParse(payload);
      if (!parsed.success) {
        ackError(ack, 'invalid_payload', 'Payload inválido.');
        return;
      }
      const result = rooms.hostRejoin({
        code: parsed.data.code,
        hostToken: parsed.data.hostToken,
        socketId: socket.id,
      });
      if (!result.ok) {
        ackError(ack, result.error.code, result.error.message);
        return;
      }
      socket.data.roomCode = result.data.code;
      socket.data.isHost = true;
      void socket.join(result.data.code);
      ack({ ok: true, data: result.data });
      broadcastState(io, rooms, result.data.code);
    });

    socket.on(EVENTS['team:choose'], (payload) => {
      const parsed = teamChooseSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(EVENTS['game:error'], {
          code: 'invalid_payload',
          message: 'Payload inválido.',
        });
        return;
      }
      const code = socket.data.roomCode;
      const playerId = socket.data.playerId;
      if (!code || !playerId) return;
      const result = rooms.chooseTeam({
        code,
        playerId,
        ...(parsed.data.teamId !== undefined ? { teamId: parsed.data.teamId } : {}),
        ...(parsed.data.newTeamName !== undefined ? { newTeamName: parsed.data.newTeamName } : {}),
      });
      if (!result.ok) {
        socket.emit(EVENTS['game:error'], {
          code: result.error.code,
          message: result.error.message,
        });
        return;
      }
      broadcastState(io, rooms, code);
    });

    socket.on(EVENTS['categories:pick'], (payload) => {
      const parsed = categoriesPickSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(EVENTS['game:error'], {
          code: 'invalid_payload',
          message: 'Payload inválido.',
        });
        return;
      }
      const code = socket.data.roomCode;
      const playerId = socket.data.playerId;
      if (!code || !playerId) return;
      const result = rooms.pickCategories({
        code,
        playerId,
        categoryIds: parsed.data.categoryIds,
      });
      if (!result.ok) {
        socket.emit(EVENTS['game:error'], {
          code: result.error.code,
          message: result.error.message,
        });
        return;
      }
      broadcastState(io, rooms, code);
    });

    socket.on(EVENTS['game:start'], () => {
      const code = socket.data.roomCode;
      if (!code) return;
      if (!socket.data.isHost) {
        socket.emit(EVENTS['game:error'], {
          code: 'not_host',
          message: 'Solo el anfitrión puede empezar.',
        });
        return;
      }
      const result = rooms.startGame({ code });
      if (!result.ok) {
        socket.emit(EVENTS['game:error'], {
          code: result.error.code,
          message: result.error.message,
        });
        return;
      }
      broadcastState(io, rooms, code);
    });

    socket.on('disconnect', () => {
      const result = rooms.handleSocketDisconnect(socket.id);
      if (result.roomCode) {
        broadcastState(io, rooms, result.roomCode);
      }
    });
  });
}

function ackError<T>(
  ack: ((res: Ack<T>) => void) | undefined,
  code: string,
  message: string,
): void {
  ack?.({ ok: false, error: { code, message } });
}

function broadcastState(io: GameServer, rooms: RoomManager, code: string): void {
  const state = rooms.getState(code);
  if (!state) return;
  io.to(code).emit(EVENTS['state:sync'], state);
}

/** Ventana de 1 hora por IP para crear salas (AGENTS §9). */
function allowRoomCreation(
  byIp: Map<string, RoomCreationEntry>,
  ip: string,
  now: () => number,
): boolean {
  const timestamp = now();
  const entry = byIp.get(ip);
  if (!entry || timestamp - entry.windowStart >= 60 * 60 * 1000) {
    byIp.set(ip, { count: 1, windowStart: timestamp });
    return true;
  }
  if (entry.count >= ROOM_CREATE_LIMIT_PER_HOUR) return false;
  entry.count += 1;
  return true;
}
