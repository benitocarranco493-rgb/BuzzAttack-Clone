import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import { APP_NAME, ROOM_CLEANUP_INTERVAL_MS } from '@buzz/shared';
import type {
  Category,
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@buzz/shared';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { Server } from 'socket.io';

import { loadCategories } from './content/categories.js';
import { RoomManager } from './rooms/RoomManager.js';
import { registerSocketHandlers } from './sockets/handlers.js';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const webDistDir = path.resolve(serverDir, '../../web/dist');

export interface BuildAppOptions {
  logger?: boolean;
  /** Registrar/adjuntar Socket.IO al servidor HTTP (útil para tests). */
  withSockets?: boolean;
  /** Servir los estáticos del cliente web cuando exista apps/web/dist. */
  serveWeb?: boolean;
  /** Categorías para las salas; por defecto se cargan de content/es/categories.json. */
  categories?: Category[];
  /** Gestor de salas inyectable (para tests deterministas). */
  rooms?: RoomManager;
}

export interface BuiltApp {
  app: FastifyInstance;
  io?: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
}

function corsOriginsFromEnv(): string[] {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) return [];
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export async function buildApp(options: BuildAppOptions = {}): Promise<BuiltApp> {
  const { logger = true, withSockets = true, serveWeb = true } = options;
  const app = Fastify({ logger });

  await app.register(fastifyHelmet, { contentSecurityPolicy: false });

  const corsOrigins = corsOriginsFromEnv();
  if (corsOrigins.length > 0) {
    await app.register(fastifyCors, { origin: corsOrigins });
  }

  app.get('/api/health', async () => ({
    status: 'ok',
    app: APP_NAME,
    uptimeMs: Math.round(process.uptime() * 1000),
    timestamp: new Date().toISOString(),
  }));

  let io: BuiltApp['io'];
  if (withSockets) {
    io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
      app.server,
      {
        serveClient: false,
        ...(corsOrigins.length > 0 ? { cors: { origin: corsOrigins } } : {}),
      },
    );

    const categories = options.categories ?? (await loadCategories(app.log));
    const roomsManager = options.rooms ?? new RoomManager({ categories });

    registerSocketHandlers({
      io,
      rooms: roomsManager,
      logger: app.log,
      getClientIp: (socket) => socket.handshake.address,
    });

    // Las salas caducan a las 3 h de inactividad; el timer no impide la salida del proceso.
    const cleanupTimer = setInterval(() => roomsManager.cleanupExpired(), ROOM_CLEANUP_INTERVAL_MS);
    cleanupTimer.unref();
    app.addHook('onClose', () => clearInterval(cleanupTimer));
  }

  const staticEnabled = serveWeb && existsSync(webDistDir);
  if (staticEnabled) {
    await app.register(fastifyStatic, { root: webDistDir, wildcard: false });
  }

  // Devuelve JSON para rutas de API/métodos no GET y sirve index.html en el resto (SPA).
  app.setNotFoundHandler((request, reply) => {
    if (!staticEnabled || request.method !== 'GET' || request.url.startsWith('/api/')) {
      reply.code(404).send({ error: 'not_found' });
      return;
    }
    void reply.sendFile('index.html');
  });

  // exactOptionalPropertyTypes: no se puede asignar `io: undefined` a una propiedad opcional,
  // así que se añade la propiedad solo cuando existe.
  const result: BuiltApp = { app };
  if (io !== undefined) {
    result.io = io;
  }
  return result;
}
