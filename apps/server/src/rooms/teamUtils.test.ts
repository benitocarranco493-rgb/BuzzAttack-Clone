import { describe, expect, it } from 'vitest';

import { createDefaultTeams, pickTeamId } from './RoomManager.js';

describe('createDefaultTeams', () => {
  it('crea 6 podios con nombres, colores y capacidad vacía', () => {
    const teams = createDefaultTeams();
    expect(teams).toHaveLength(6);
    for (const [index, team] of teams.entries()) {
      expect(team.podium).toBe(index + 1);
      expect(team.playerIds).toEqual([]);
      expect(team.score).toBe(0);
      expect(team.spinsTaken).toBe(0);
      expect(team.id).toBe(`team-${index + 1}`);
      expect(team.name).toBe(`Equipo ${index + 1}`);
    }
  });
});

describe('pickTeamId', () => {
  it('elige el podio con menos jugadores y con hueco', () => {
    const teams = createDefaultTeams();
    const sizes = new Map<string, number>([
      ['team-1', 3], // lleno
      ['team-2', 2],
      ['team-3', 1],
      ['team-4', 2],
      ['team-5', 2],
      ['team-6', 3], // lleno
    ]);
    expect(pickTeamId(teams, sizes)).toBe('team-3');
  });

  it('devuelve undefined cuando todos los podios están llenos', () => {
    const teams = createDefaultTeams();
    const sizes = new Map(teams.map((team) => [team.id, 3]));
    expect(pickTeamId(teams, sizes)).toBeUndefined();
  });

  it('reparte los primeros 6 jugadores en podios distintos', () => {
    const teams = createDefaultTeams();
    const sizes = new Map<string, number>();
    const assigned: string[] = [];
    for (let i = 0; i < 6; i++) {
      const teamId = pickTeamId(teams, sizes);
      expect(teamId).toBeDefined();
      sizes.set(teamId!, (sizes.get(teamId!) ?? 0) + 1);
      assigned.push(teamId!);
    }
    expect(new Set(assigned).size).toBe(6);
  });
});
