import { describe, expect, it } from 'vitest';

import { MAX_PLAYERS, ROOM_TTL_MS, type Category } from '@buzz/shared';

import { RoomManager } from './RoomManager.js';

const categories: Category[] = [
  { id: 'cine', label: 'Cine' },
  { id: 'geo', label: 'Geografía' },
  { id: 'pop', label: 'Pop' },
  { id: 'deporte', label: 'Deporte' },
];

function makeManager(
  overrides: { now?: () => number; randomCode?: () => number } = {},
): RoomManager {
  return new RoomManager({ categories, ...overrides });
}

function createOwner(rooms: RoomManager): string {
  const result = rooms.createRoom('host-socket-1');
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('room creation debería funcionar');
  return result.data.code;
}

describe('RoomManager — crear y unir', () => {
  it('crea una sala con código de 4 letras y token de anfitrión', () => {
    const rooms = makeManager();
    const result = rooms.createRoom('host-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.code).toMatch(/^[A-HJ-NP-Z]{4}$/);
    expect(result.data.hostToken.length).toBeGreaterThan(0);
    expect(rooms.roomCount).toBe(1);
  });

  it('une jugadores repartiéndolos en podios distintos (1-3 por podio)', () => {
    const rooms = makeManager();
    const code = createOwner(rooms);
    for (let i = 0; i < 7; i++) {
      const result = rooms.joinPlayer({ code, nickname: `Jugador ${i}`, socketId: `s${i}` });
      expect(result.ok).toBe(true);
    }
    const state = rooms.getState(code);
    expect(state).toBeDefined();
    if (!state) return;
    const sizes = state.teams.map((team) => team.playerIds.length);
    expect(sizes).toEqual([2, 1, 1, 1, 1, 1]);
  });

  it('rechaza la sala número 13 (máximo 12 jugadores)', () => {
    const rooms = makeManager();
    const code = createOwner(rooms);
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const result = rooms.joinPlayer({ code, nickname: `J${i}`, socketId: `s${i}` });
      expect(result.ok).toBe(true);
    }
    const extra = rooms.joinPlayer({ code, nickname: 'Extra', socketId: 's-x' });
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.error.code).toBe('room_full');
  });

  it('rechaza unirse a una sala inexistente', () => {
    const rooms = makeManager();
    const result = rooms.joinPlayer({ code: 'ZZZZ', nickname: 'Ana', socketId: 's1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('room_not_found');
  });
});

describe('RoomManager — reconexión', () => {
  it('reconecta un jugador con su token sin duplicarlo', () => {
    const rooms = makeManager();
    const code = createOwner(rooms);
    const joined = rooms.joinPlayer({ code, nickname: 'Ana', socketId: 's1' });
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;

    const stateBefore = rooms.getState(code);
    expect(stateBefore?.players).toHaveLength(1);

    const rejoined = rooms.rejoinPlayer({
      code,
      playerToken: joined.data.playerToken,
      socketId: 's2',
    });
    expect(rejoined.ok).toBe(true);
    if (!rejoined.ok) return;
    expect(rejoined.data.playerId).toBe(joined.data.playerId);
    expect(rejoined.data.rejoined).toBe(true);

    const stateAfter = rooms.getState(code);
    expect(stateAfter?.players).toHaveLength(1);
    expect(stateAfter?.players[0]?.connected).toBe(true);
  });

  it('marca como desconectado al jugador cuando se cae su socket', () => {
    const rooms = makeManager();
    const code = createOwner(rooms);
    const joined = rooms.joinPlayer({ code, nickname: 'Ana', socketId: 's1' });
    if (!joined.ok) return;

    const result = rooms.handleSocketDisconnect('s1');
    expect(result.roomCode).toBe(code);
    const state = rooms.getState(code);
    expect(state?.players[0]?.connected).toBe(false);
  });

  it('rechaza tokens inválidos', () => {
    const rooms = makeManager();
    const code = createOwner(rooms);
    const result = rooms.rejoinPlayer({ code, playerToken: 'no-existe', socketId: 's1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_token');
  });

  it('permite al anfitrión recuperar su sala tras recargar', () => {
    const rooms = makeManager();
    const created = rooms.createRoom('host-socket-1');
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    rooms.handleSocketDisconnect('host-socket-1');

    const rejoined = rooms.hostRejoin({
      code: created.data.code,
      hostToken: created.data.hostToken,
      socketId: 'host-socket-2',
    });
    expect(rejoined.ok).toBe(true);

    // Un host con token erróneo no puede recuperarla
    const bad = rooms.hostRejoin({
      code: created.data.code,
      hostToken: 'token-erroneo',
      socketId: 'host-socket-3',
    });
    expect(bad.ok).toBe(false);
  });
});
describe('RoomManager — equipos y categorías', () => {
  it('cambia de equipo respetando el límite de 3 jugadores', () => {
    const rooms = makeManager();
    const code = createOwner(rooms);
    const a = rooms.joinPlayer({ code, nickname: 'A', socketId: 'sA' });
    const b = rooms.joinPlayer({ code, nickname: 'B', socketId: 'sB' });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    // A se mueve al podio 3 (vacío)
    const moved = rooms.chooseTeam({ code, playerId: a.data.playerId, teamId: 'team-3' });
    expect(moved.ok).toBe(true);
    let state = rooms.getState(code);
    expect(state?.teams.find((team) => team.id === 'team-3')?.playerIds).toEqual([a.data.playerId]);

    // Llenar el equipo 3 y comprobar que rechaza al 4º
    const c = rooms.joinPlayer({ code, nickname: 'C', socketId: 'sC' });
    const d = rooms.joinPlayer({ code, nickname: 'D', socketId: 'sD' });
    if (!c.ok || !d.ok) return;
    expect(rooms.chooseTeam({ code, playerId: c.data.playerId, teamId: 'team-3' }).ok).toBe(true);
    expect(rooms.chooseTeam({ code, playerId: d.data.playerId, teamId: 'team-3' }).ok).toBe(true);
    const overflow = rooms.chooseTeam({ code, playerId: b.data.playerId, teamId: 'team-3' });
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.error.code).toBe('team_full');

    // Renombrar el equipo del que lo pide (A sigue en team-3)
    const rename = rooms.chooseTeam({ code, playerId: a.data.playerId, newTeamName: 'Los Rojos' });
    expect(rename.ok).toBe(true);
    state = rooms.getState(code);
    expect(state?.teams.find((team) => team.id === 'team-3')?.name).toBe('Los Rojos');
  });

  it('valida la elección de 3 categorías (dup, desconocida y no implementar si ya empezó)', () => {
    const rooms = makeManager();
    const code = createOwner(rooms);
    const joined = rooms.joinPlayer({ code, nickname: 'Ana', socketId: 's1' });
    if (!joined.ok) return;

    const ok = rooms.pickCategories({
      code,
      playerId: joined.data.playerId,
      categoryIds: ['cine', 'geo', 'pop'],
    });
    expect(ok.ok).toBe(true);

    const dup = rooms.pickCategories({
      code,
      playerId: joined.data.playerId,
      categoryIds: ['cine', 'cine', 'geo'],
    });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error.code).toBe('invalid_categories');

    const unknown = rooms.pickCategories({
      code,
      playerId: joined.data.playerId,
      categoryIds: ['cine', 'geo', 'no-existe'],
    });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.error.code).toBe('invalid_categories');
  });
});

describe('RoomManager — inicio de partida', () => {
  function readyRoom(): { rooms: RoomManager; code: string } {
    const rooms = makeManager();
    const code = createOwner(rooms);
    for (let i = 0; i < 2; i++) {
      const joined = rooms.joinPlayer({ code, nickname: `J${i}`, socketId: `s${i}` });
      if (joined.ok) {
        rooms.pickCategories({
          code,
          playerId: joined.data.playerId,
          categoryIds: ['cine', 'geo', 'pop'],
        });
      }
    }
    return { rooms, code };
  }

  it('rechaza empezar sin jugadores suficientes', () => {
    const rooms = makeManager();
    const code = createOwner(rooms);
    rooms.joinPlayer({ code, nickname: 'Solo', socketId: 's1' });
    const result = rooms.startGame({ code });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('not_enough_players');
  });

  it('rechaza empezar si falta elegir categorías', () => {
    const rooms = makeManager();
    const code = createOwner(rooms);
    rooms.joinPlayer({ code, nickname: 'SinCat', socketId: 's1' });
    const joined = rooms.joinPlayer({ code, nickname: 'ConCat', socketId: 's2' });
    if (!joined.ok) return;
    rooms.pickCategories({
      code,
      playerId: joined.data.playerId,
      categoryIds: ['cine', 'geo', 'pop'],
    });
    const result = rooms.startGame({ code });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('categories_missing');
  });

  it('empieza cuando hay mínimo jugadores y categorías elegidas', () => {
    const { rooms, code } = readyRoom();
    const result = rooms.startGame({ code });
    expect(result.ok).toBe(true);
    expect(rooms.getState(code)?.phase).toBe('intro');
    expect(rooms.getState(code)?.canStart).toBe(false);

    // Ya empezada: no se admite más gente
    const late = rooms.joinPlayer({ code, nickname: 'Tarde', socketId: 's-late' });
    expect(late.ok).toBe(false);
    if (!late.ok) expect(late.error.code).toBe('already_started');
  });
});

describe('RoomManager — caducidad y estado público', () => {
  it('limpia salas inactivas tras el TTL', () => {
    let timestamp = 1_000_000;
    const rooms = makeManager({ now: () => timestamp });
    const code = createOwner(rooms);
    expect(rooms.roomCount).toBe(1);

    timestamp += ROOM_TTL_MS + 1;
    rooms.cleanupExpired();
    expect(rooms.roomCount).toBe(0);
    expect(rooms.getState(code)).toBeUndefined();
  });

  it('expone canStart cuando todos los conectados tienen categorías', () => {
    const rooms = makeManager();
    const code = createOwner(rooms);
    expect(rooms.getState(code)?.canStart).toBe(false);

    const a = rooms.joinPlayer({ code, nickname: 'A', socketId: 'sA' });
    const b = rooms.joinPlayer({ code, nickname: 'B', socketId: 'sB' });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    rooms.pickCategories({ code, playerId: a.data.playerId, categoryIds: ['cine', 'geo', 'pop'] });
    expect(rooms.getState(code)?.canStart).toBe(false); // B aún no
    rooms.pickCategories({ code, playerId: b.data.playerId, categoryIds: ['cine', 'geo', 'pop'] });
    expect(rooms.getState(code)?.canStart).toBe(true);
  });

  it('el estado público nunca incluye tokens', () => {
    const rooms = makeManager();
    const code = createOwner(rooms);
    rooms.joinPlayer({ code, nickname: 'Ana', socketId: 's1' });
    const serialized = JSON.stringify(rooms.getState(code));
    expect(serialized).not.toContain('token');
    expect(serialized).not.toContain('socketId');
  });
});
