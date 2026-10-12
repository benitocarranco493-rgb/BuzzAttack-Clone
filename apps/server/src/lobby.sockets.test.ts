import type { AddressInfo } from 'node:net';

import type { ClientToServerEvents, ServerToClientEvents, StateSyncPayload } from '@buzz/shared';
import { io as createClient, type Socket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from './app.js';

type GameClient = Socket<ServerToClientEvents, ClientToServerEvents>;

const categories = [
  { id: 'cine', label: 'Cine' },
  { id: 'geo', label: 'Geografía' },
  { id: 'pop', label: 'Pop' },
  { id: 'deporte', label: 'Deporte' },
];

let serverUrl: string | undefined;
let closeServer: (() => Promise<void>) | undefined;
const clients: GameClient[] = [];

async function startServer(): Promise<void> {
  const { app } = await buildApp({
    logger: false,
    serveWeb: false,
    withSockets: true,
    categories,
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const port = (app.server.address() as AddressInfo).port;
  serverUrl = `http://127.0.0.1:${port}`;
  closeServer = () => app.close();
}

afterEach(async () => {
  for (const client of clients.splice(0)) {
    client.close();
  }
  if (closeServer) {
    await closeServer();
    closeServer = undefined;
    serverUrl = undefined;
  }
});

function connect(): Promise<GameClient> {
  const client = createClient(serverUrl as string, {
    transports: ['websocket'],
    forceNew: true,
  });
  clients.push(client);
  return new Promise<GameClient>((resolve, reject) => {
    client.once('connect', () => {
      client.off('connect_error');
      resolve(client);
    });
    client.once('connect_error', (error) => reject(error));
  });
}

/** Vigila los `state:sync` de un cliente y permite esperar a que se cumpla un predicado. */
function createStateWatcher(client: GameClient) {
  let latest: StateSyncPayload | null = null;
  const onState = (state: StateSyncPayload): void => {
    latest = state;
  };
  client.on('state:sync', onState);
  return {
    async until(
      predicate: (state: StateSyncPayload) => boolean,
      timeoutMs = 5000,
    ): Promise<StateSyncPayload> {
      if (latest && predicate(latest)) return latest;
      return new Promise<StateSyncPayload>((resolve, reject) => {
        const timer = setTimeout(() => {
          client.off('state:sync', onPredicate);
          reject(new Error('timeout esperando state:sync'));
        }, timeoutMs);
        const onPredicate = (state: StateSyncPayload): void => {
          if (!predicate(state)) return;
          clearTimeout(timer);
          client.off('state:sync', onPredicate);
          resolve(state);
        };
        client.on('state:sync', onPredicate);
      });
    },
    stop: () => client.off('state:sync', onState),
  };
}

describe('flujo de sala por sockets reales', () => {
  it('host crea la sala y dos jugadores la completan hasta game:start', async () => {
    await startServer();
    const host = await connect();
    const hostState = createStateWatcher(host);

    const created = await host.emitWithAck('room:create', {});
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const { code, hostToken } = created.data;

    const playerOne = await connect();
    const joinOne = await playerOne.emitWithAck('room:join', { code, nickname: 'Ana' });
    expect(joinOne.ok).toBe(true);
    const playerTwo = await connect();
    const joinTwo = await playerTwo.emitWithAck('room:join', { code, nickname: 'Beto' });
    expect(joinTwo.ok).toBe(true);
    if (!joinOne.ok || !joinTwo.ok) return;
    expect(joinOne.data.playerId).not.toBe(joinTwo.data.playerId);

    playerOne.emit('team:choose', { newTeamName: 'Los Rojos' });
    playerOne.emit('categories:pick', { categoryIds: ['cine', 'geo', 'pop'] });
    playerTwo.emit('categories:pick', { categoryIds: ['geo', 'pop', 'deporte'] });

    const ready = await hostState.until((state) => state.canStart === true);
    expect(ready.teams.some((team) => team.name === 'Los Rojos')).toBe(true);
    expect(ready.connectedPlayers).toBe(2);
    expect(ready.roomCode).toBe(code);
    expect(ready.availableCategories).toHaveLength(4);

    host.emit('game:start');
    const started = await hostState.until((state) => state.phase === 'intro');
    expect(started.phase).toBe('intro');

    expect(hostToken.length).toBeGreaterThan(0);
    hostState.stop();
  });

  it('un jugador se reconecta con su token y conserva su plaza', async () => {
    await startServer();
    const host = await connect();
    const hostState = createStateWatcher(host);

    const created = await host.emitWithAck('room:create', {});
    if (!created.ok) return;
    const { code } = created.data;

    const playerOne = await connect();
    const joined = await playerOne.emitWithAck('room:join', { code, nickname: 'Ana' });
    if (!joined.ok) return;
    const { playerToken, playerId } = joined.data;

    playerOne.close();
    await hostState.until(
      (state) => state.players.find((player) => player.id === playerId)?.connected === false,
    );

    const playerOneAgain = await connect();
    const rejoined = await playerOneAgain.emitWithAck('room:rejoin', { code, playerToken });
    expect(rejoined.ok).toBe(true);
    if (!rejoined.ok) return;
    expect(rejoined.data.playerId).toBe(playerId);

    await hostState.until(
      (state) => state.players.find((player) => player.id === playerId)?.connected === true,
    );
  });

  it('rechaza tokens de jugador inválidos al reconectar', async () => {
    await startServer();
    const host = await connect();
    const created = await host.emitWithAck('room:create', {});
    if (!created.ok) return;

    const intruder = await connect();
    const join = await intruder.emitWithAck('room:rejoin', {
      code: created.data.code,
      playerToken: 'token-inexistente',
    });
    expect(join.ok).toBe(false);
    if (!join.ok) expect(join.error.code).toBe('invalid_token');
  });
});
