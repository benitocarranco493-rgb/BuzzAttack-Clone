import { TEAM_MAX_PLAYERS, type Team } from '@buzz/shared';
import type { ReactNode } from 'react';

import { t } from '../i18n';

export interface TeamsGridProps {
  teams: readonly Team[];
  /** Id del podio resaltado (p. ej. el del jugador actual). */
  highlightedTeamId?: string | undefined;
  /** Si se define, los podios se pueden tocar para elegir. */
  onSelectTeam?: (teamId: string) => void;
  /** Muestra el botón de renombrar en los podios del jugador actual. */
  renameSlot?: ReactNode;
}

/**
 * Rejilla de los 6 podios. Cada botón combina color + número + nombre
 * (accesibilidad: nunca solo color, AGENTS §7).
 */
export function TeamsGrid({ teams, highlightedTeamId, onSelectTeam, renameSlot }: TeamsGridProps) {
  return (
    <ul className="teams-grid">
      {teams.map((team, index) => {
        const count = team.playerIds.length;
        const isFull = count >= TEAM_MAX_PLAYERS;
        const isMine = team.id === highlightedTeamId;
        const disabled = onSelectTeam !== undefined && isFull && !isMine;
        return (
          <li key={team.id} className="team-card">
            {onSelectTeam ? (
              <button
                type="button"
                className={`team-button${isMine ? ' team-button--mine' : ''}`}
                style={{ borderLeftColor: team.color }}
                onClick={() => {
                  onSelectTeam(team.id);
                }}
                disabled={disabled}
                aria-pressed={isMine}
                aria-label={`${team.name} — ${t('play.teamPlayers', {
                  count,
                  max: TEAM_MAX_PLAYERS,
                })}`}
              >
                <span className="team-podium" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="team-name">{team.name}</span>
                <span className="team-count">
                  {t('play.teamPlayers', { count, max: TEAM_MAX_PLAYERS })}
                </span>
                {isFull && !isMine ? (
                  <span className="team-badge">{t('play.teamFull')}</span>
                ) : null}
              </button>
            ) : (
              <div className="team-card__static" style={{ borderLeftColor: team.color }}>
                <span className="team-podium" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="team-name">{team.name}</span>
                <span className="team-count">
                  {t('play.teamPlayers', { count, max: TEAM_MAX_PLAYERS })}
                </span>
              </div>
            )}
            {isMine && renameSlot ? <div className="team-rename">{renameSlot}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}
