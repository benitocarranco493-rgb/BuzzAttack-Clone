import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import { APP_NAME } from '@buzz/shared';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@buzz/shared';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { Server } from 'socket.io';

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const webDistDir = path.resolve(serverDir, '../../web/dist');

export interface BuildAppOptions {
  logger?: boolean;
  /** Registrar/adjuntar Socket.IO al servidor HTTP (útil para tests). */
  withSockets?: boolean;
  /** Servir los estáticos del cliente web cuando exista apps/web/dist. */
  serveWeb?: boolean;
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
      { serveClient: false },
    );
    io.on('connection', (socket) => {
      app.log.info({ socketId: socket.id }, 'socket connected');
      socket.on('disconnect', (reason) => {
        app.log.info({ socketId: socket.id, reason }, 'socket disconnected');
      });
    });
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
