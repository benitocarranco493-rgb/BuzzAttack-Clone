import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  ROOM_CODE_LENGTH,
  SPECIALIST_CATEGORY_COUNT,
  type RoomJoinAckData,
} from '@buzz/shared';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { CategoryChips } from '../components/CategoryChips';
import { ErrorBanner } from '../components/ErrorBanner';
import { PlayersList } from '../components/PlayersList';
import { TeamsGrid } from '../components/TeamsGrid';
import { useConnectionStatus, useGameState } from '../hooks/useGameState';
import { t } from '../i18n';
import { ask } from '../lib/ack';
import {
  clearPlayerSession,
  loadPlayerSession,
  savePlayerSession,
  type PlayerSession,
} from '../lib/storage';
import { getGameSocket } from '../socket/gameSocket';

/** Pantalla del móvil: unirse con código, elegir podio y sus 3 categorías. */
export function PlayPage() {
  const socket = getGameSocket();
  const [searchParams] = useSearchParams();
  const { state, error, clearError } = useGameState(socket);
  const connected = useConnectionStatus(socket);
  const [session, setSession] = useState<PlayerSession | null>(() => loadPlayerSession());
  const [busy, setBusy] = useState<boolean>(() => loadPlayerSession() !== null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState(() => (searchParams.get('code') ?? '').toUpperCase());
  const [nicknameInput, setNicknameInput] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [nameDirty, setNameDirty] = useState(false);

  // Reconexión con el token guardado en localStorage.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setBusy(true);
    void ask<RoomJoinAckData>((ack) =>
      socket.emit('room:rejoin', { code: session.code, playerToken: session.playerToken }, ack),
    ).then((res) => {
      if (cancelled) return;
      setBusy(false);
      if (res.ok) return;
      clearPlayerSession();
      setSession(null);
      setLocalError(res.error.code);
    });
    return () => {
      cancelled = true;
    };
  }, [socket, session]);

  const me =
    session && state ? state.players.find((player) => player.id === session.playerId) : undefined;
  const myTeam = state?.teams.find((team) => team.id === me?.teamId);

  // Refleja el estado del servidor en la selección local (la autoridad es el servidor).
  useEffect(() => {
    if (!me) return;
    setSelectedCategoryIds([...me.specialistCategoryIds]);
  }, [me]);
  useEffect(() => {
    if (!myTeam || nameDirty) return;
    setTeamNameInput(myTeam.name);
  }, [myTeam, nameDirty]);

  function handleJoin(event: FormEvent): void {
    event.preventDefault();
    const code = codeInput.trim().toUpperCase();
    const nickname = nicknameInput.trim();
    if (code.length !== ROOM_CODE_LENGTH) {
      setLocalError('invalid_room_code');
      return;
    }
    if (nickname.length < NICKNAME_MIN_LENGTH || nickname.length > NICKNAME_MAX_LENGTH) {
      setLocalError('invalid_nickname');
      return;
    }
    setLocalError(null);
    setBusy(true);
    void ask<RoomJoinAckData>((ack) => socket.emit('room:join', { code, nickname }, ack)).then(
      (res) => {
        setBusy(false);
        if (!res.ok) {
          setLocalError(res.error.code);
          return;
        }
        savePlayerSession({
          code,
          playerToken: res.data.playerToken,
          playerId: res.data.playerId,
          nickname,
        });
        setSession({
          code,
          playerToken: res.data.playerToken,
          playerId: res.data.playerId,
          nickname,
        });
      },
    );
  }

  function handleToggleCategory(categoryId: string): void {
    setSelectedCategoryIds((current) => {
      if (current.includes(categoryId)) {
        return current.filter((id) => id !== categoryId);
      }
      if (current.length >= SPECIALIST_CATEGORY_COUNT) return current; // ya hay 3
      return [...current, categoryId];
    });
  }

  const dismissError = useCallback((): void => {
    setLocalError(null);
    clearError();
  }, [clearError]);

  const bannerCode = localError ?? error?.code ?? null;

  if (!session) {
    return (
      <main className="app-shell">
        <h1 className="app-title app-title--small">{t('play.title')}</h1>
        <ErrorBanner code={bannerCode} onDismiss={dismissError} />
        <form className="join-form" onSubmit={handleJoin}>
          <label className="field-label" htmlFor="room-code">
            {t('play.codeLabel')}
          </label>
          <input
            id="room-code"
            className="input input--code"
            value={codeInput}
            onChange={(event) => {
              setCodeInput(event.target.value.toUpperCase());
            }}
            placeholder={t('play.codePlaceholder')}
            maxLength={ROOM_CODE_LENGTH}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <label className="field-label" htmlFor="nickname">
            {t('play.nicknameLabel')}
          </label>
          <input
            id="nickname"
            className="input"
            value={nicknameInput}
            onChange={(event) => {
              setNicknameInput(event.target.value);
            }}
            placeholder={t('play.nicknamePlaceholder')}
            maxLength={NICKNAME_MAX_LENGTH}
            autoComplete="off"
          />
          <button type="submit" className="btn btn--primary" disabled={busy || !connected}>
            {busy ? t('play.joining') : t('play.join')}
          </button>
        </form>
        {!connected ? <p className="status">{t('common.disconnected')}</p> : null}
      </main>
    );
  }

  if (!state) {
    return (
      <main className="app-shell">
        <h1 className="app-title app-title--small">{t('play.title')}</h1>
        <ErrorBanner code={bannerCode} onDismiss={dismissError} />
        <p className="status" role="status">
          {busy || !connected ? t('play.reconnecting') : t('common.waitingHost')}
        </p>
      </main>
    );
  }

  const savedCount = me?.specialistCategoryIds.length ?? 0;
  const exactlyThree = selectedCategoryIds.length === SPECIALIST_CATEGORY_COUNT;
  const started = state.phase !== 'lobby';

  const renameForm = myTeam ? (
    <form
      className="rename-form"
      onSubmit={(event) => {
        event.preventDefault();
        const name = teamNameInput.trim();
        if (!name) return;
        socket.emit('team:choose', { newTeamName: name });
        setNameDirty(false);
      }}
    >
      <label className="sr-only" htmlFor="team-name">
        {t('play.renameTeam')}
      </label>
      <input
        id="team-name"
        className="input input--compact"
        value={teamNameInput}
        onChange={(event) => {
          setTeamNameInput(event.target.value);
          setNameDirty(true);
        }}
        placeholder={t('play.namePlaceholder')}
        maxLength={20}
        autoComplete="off"
      />
      <button type="submit" className="btn btn--ghost btn--compact">
        {t('play.saveName')}
      </button>
    </form>
  ) : undefined;

  return (
    <main className="lobby-shell lobby-shell--mobile">
      <header className="lobby-header">
        <span className="lobby-header__status">
          <span
            className={`connection-dot${connected ? ' connection-dot--on' : ''}`}
            aria-hidden="true"
          />
          {connected ? t('common.connected') : t('common.disconnected')}
        </span>
        <h1 className="app-title app-title--small">
          {t('play.lobbyTitle', { code: state.roomCode })}
        </h1>
        <p className="status">{session.nickname}</p>
      </header>

      <ErrorBanner code={bannerCode} onDismiss={dismissError} />

      <section aria-label={t('play.teamsTitle')}>
        <h2>{t('play.teamsTitle')}</h2>
        <TeamsGrid
          teams={state.teams}
          highlightedTeamId={me?.teamId}
          onSelectTeam={(teamId) => {
            socket.emit('team:choose', { teamId });
          }}
          renameSlot={renameForm}
        />
      </section>

      <section aria-label={t('play.categoriesTitle')}>
        <h2>{t('play.categoriesTitle')}</h2>
        <p className="status">{t('play.categoriesHint')}</p>
        <p className="status" role="status">
          {savedCount === SPECIALIST_CATEGORY_COUNT
            ? t('play.categoriesSaved')
            : t('play.categoriesSelected', { count: selectedCategoryIds.length })}
        </p>
        <CategoryChips
          categories={state.availableCategories}
          selectedIds={selectedCategoryIds}
          onToggle={handleToggleCategory}
        />
        <button
          type="button"
          className="btn btn--primary"
          disabled={!exactlyThree}
          onClick={() => {
            socket.emit('categories:pick', { categoryIds: selectedCategoryIds });
          }}
        >
          {t('play.saveCategories')}
        </button>
      </section>

      <section aria-label={t('play.playersTitle')}>
        <h2>{t('play.playersTitle')}</h2>
        <PlayersList players={state.players} teams={state.teams} />
      </section>

      {started ? (
        <p className="status status--success" role="status">
          {t('common.waitingHost')}
        </p>
      ) : null}
    </main>
  );
}
