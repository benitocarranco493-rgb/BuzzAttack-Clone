import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from './app.js';

const openApps: FastifyInstance[] = [];

async function makeTestApp(): Promise<FastifyInstance> {
  const { app } = await buildApp({ logger: false, serveWeb: false, withSockets: true });
  openApps.push(app);
  return app;
}

afterEach(async () => {
  await Promise.all(openApps.splice(0).map((app) => app.close()));
});

describe('buildApp', () => {
  it('expone el endpoint de salud /api/health', async () => {
    const app = await makeTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ status: 'ok' });
  });

  it('devuelve JSON para rutas /api desconocidas', async () => {
    const app = await makeTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not_found' });
  });

  it('devuelve JSON para métodos no GET en cualquier ruta', async () => {
    const app = await makeTestApp();
    const res = await app.inject({ method: 'POST', url: '/whatever' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not_found' });
  });
});
