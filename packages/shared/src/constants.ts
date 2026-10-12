/** Nombre mostrado de la app. Configurable (ver instructions.md §19). */
export const APP_NAME = 'Buzz Home';

/** Idioma por defecto de la interfaz y el contenido. */
export const DEFAULT_LANG = 'es';
export const SUPPORTED_LANGS = ['es', 'en'] as const;

/** Códigos de sala: 4 letras mayúsculas sin caracteres ambiguos (I, O). */
export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const ROOM_TTL_MS = 3 * 60 * 60 * 1000;

export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 14;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;
export const PODIUM_COUNT = 6;
export const MAX_TEAMS = PODIUM_COUNT;
export const TEAM_MIN_PLAYERS = 1;
export const TEAM_MAX_PLAYERS = 3;
export const SPECIALIST_CATEGORY_COUNT = 3;

/** Gracia de red aceptada tras el deadline de una respuesta. */
export const SERVER_GRACE_PERIOD_MS = 250;
export const RECONNECT_GRACE_MS = 5 * 60 * 1000;

export const EVENT_RATE_LIMIT_PER_SEC = 10;
export const TAP_RATE_LIMIT_PER_SEC = 8;

export const ANSWER_OPTIONS_COUNT = 4;
export const MIN_QUESTION_TEXT_LENGTH = 1;
export const MAX_QUESTION_TEXT_LENGTH = 160;

/** Duración de la animación de la ruleta. */
export const WHEEL_SPIN_DURATION_MS_MIN = 4000;
export const WHEEL_SPIN_DURATION_MS_MAX = 6000;
