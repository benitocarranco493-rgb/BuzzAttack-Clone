import type { Phase, Team } from './types.js';

/** Nombres de eventos (contrato mínimo, sección 7 de instructions.md). */
export const EVENTS = {
  'room:create': 'room:create',
  'room:join': 'room:join',
  'room:rejoin': 'room:rejoin',
  'team:choose': 'team:choose',
  'categories:pick': 'categories:pick',
  'game:start': 'game:start',
  'game:pause': 'game:pause',
  'game:resume': 'game:resume',
  'game:skip': 'game:skip',
  'game:next': 'game:next',
  'answer:submit': 'answer:submit',
  buzz: 'buzz',
  tap: 'tap',
  vote: 'vote',
  'simon:press': 'simon:press',
  'time:ping': 'time:ping',
  'time:pong': 'time:pong',
  'state:sync': 'state:sync',
  'question:show': 'question:show',
  'question:reveal': 'question:reveal',
  'wheel:spin': 'wheel:spin',
  'narrator:say': 'narrator:say',
  'scoreboard:update': 'scoreboard:update',
  'game:error': 'game:error',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export interface ServerErrorPayload {
  code: string;
  message: string;
}

/** Resultado de un evento con ack: o bien éxito con datos, o error tipado. */
export type Ack<T> = { ok: true; data: T } | { ok: false; error: ServerErrorPayload };

export interface RoomCreateAckData {
  code: string;
}
export interface RoomJoinAckData {
  playerToken: string;
}

/** Datos de jugador públicos (nunca se envía su token ni respuestas privadas). */
export interface PublicPlayer {
  id: string;
  nickname: string;
  teamId: string;
  connected: boolean;
}

/** Estado público completo de la sala (state:sync). */
export interface StateSyncPayload {
  roomCode: string;
  phase: Phase;
  paused: boolean;
  players: PublicPlayer[];
  teams: Team[];
}

export interface RoomCreatePayload {
  config?: Record<string, unknown>;
}
export interface RoomJoinPayload {
  code: string;
  nickname: string;
}
export interface RoomRejoinPayload {
  code: string;
  playerToken: string;
}
export interface TeamChoosePayload {
  teamId?: string;
  newTeamName?: string;
}
export interface CategoriesPickPayload {
  categoryIds: string[];
}
export interface AnswerSubmitPayload {
  questionId: string;
  optionIndex: number;
}
export interface BuzzPayload {
  questionId: string;
}
export interface TapPayload {
  gameId: string;
  position?: { x: number; y: number };
  /** Solo telemetría; el servidor usa su propio reloj. */
  clientTs?: number;
}
export interface VotePayload {
  promptId: string;
  optionIndex: number;
}
export interface SimonPressPayload {
  gameId: string;
  buttonIndex: number;
}
export interface TimePingPayload {
  sentAtServerMs: number;
}
export interface TimePongPayload {
  clientSentAtMs: number;
  receivedAtClientMs: number;
}
export interface QuestionShowPayload {
  questionId: string;
  startsAtServerMs: number;
  durationMs: number;
  /** Solo las opciones (sin correctIndex). */
  optionsPublic: string[];
}
export interface QuestionRevealPayload {
  questionId: string;
  correctIndex: number;
  perTeamDelta: Record<string, number>;
  explanation?: string;
}
export interface WheelSpinPayload {
  spinId: string;
  targetWedgeId: string;
  targetAngleDeg: number;
  durationMs: number;
  forTeamId: string;
}
export interface NarratorSayPayload {
  text: string;
  tone: 'classic' | 'rowdy' | 'neutral';
  ssmlHint?: string;
}

/** Eventos entrantes (cliente → servidor). */
export interface ClientToServerEvents {
  'room:create': (payload: RoomCreatePayload, ack: (res: Ack<RoomCreateAckData>) => void) => void;
  'room:join': (payload: RoomJoinPayload, ack: (res: Ack<RoomJoinAckData>) => void) => void;
  'room:rejoin': (payload: RoomRejoinPayload, ack: (res: Ack<RoomJoinAckData>) => void) => void;
  'team:choose': (payload: TeamChoosePayload) => void;
  'categories:pick': (payload: CategoriesPickPayload) => void;
  'game:start': () => void;
  'game:pause': () => void;
  'game:resume': () => void;
  'game:skip': () => void;
  'game:next': () => void;
  'answer:submit': (payload: AnswerSubmitPayload) => void;
  buzz: (payload: BuzzPayload) => void;
  tap: (payload: TapPayload) => void;
  vote: (payload: VotePayload) => void;
  'simon:press': (payload: SimonPressPayload) => void;
  'time:pong': (payload: TimePongPayload) => void;
}

/** Eventos salientes (servidor → cliente). */
export interface ServerToClientEvents {
  'state:sync': (payload: StateSyncPayload) => void;
  'question:show': (payload: QuestionShowPayload) => void;
  'question:reveal': (payload: QuestionRevealPayload) => void;
  'wheel:spin': (payload: WheelSpinPayload) => void;
  'narrator:say': (payload: NarratorSayPayload) => void;
  'scoreboard:update': (payload: Team[]) => void;
  'time:ping': (payload: TimePingPayload) => void;
  'game:error': (payload: ServerErrorPayload) => void;
}

/** Eventos entre servidores (no se usan en v1; tipo vacío equivalente al default de Socket.IO). */
export type InterServerEvents = Record<string, never>;

/** Metadatos que el servidor guarda por socket del cliente. */
export interface SocketData {
  playerId?: string;
  roomCode?: string;
  isHost?: boolean;
}
