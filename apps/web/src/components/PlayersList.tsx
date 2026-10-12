import type { PublicPlayer, Team } from '@buzz/shared';

import { t } from '../i18n';

export interface PlayersListProps {
  players: readonly PublicPlayer[];
  teams: readonly Team[];
}

/** Lista compacta de jugadores con su equipo y estado de conexión. */
export function PlayersList({ players, teams }: PlayersListProps) {
  return (
    <ul className="players-list">
      {players.map((player) => {
        const team = teams.find((candidate) => candidate.id === player.teamId);
        return (
          <li
            key={player.id}
            className={`player-chip${player.connected ? '' : ' player-chip--offline'}`}
          >
            <span
              className={`connection-dot${player.connected ? ' connection-dot--on' : ''}`}
              aria-hidden="true"
            />
            <span className="player-name">{player.nickname}</span>
            {team ? (
              <span className="player-team" style={{ color: team.color }}>
                {team.name}
              </span>
            ) : null}
            <span className="sr-only">
              {player.connected ? t('common.connected') : t('common.disconnected')}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
