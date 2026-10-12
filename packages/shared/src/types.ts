export type Lang = 'es' | 'en';

/** 4 letras mayúsculas sin I/O (ver ROOM_CODE_ALPHABET en constants.ts). */
export type RoomCode = string;

export interface Player {
  id: string;
  /** Token para reconexión (clientes lo guardan en localStorage). */
  token: string;
  nickname: string;
  teamId: string;
  connected: boolean;
  /** Exactamente SPECIALIST_CATEGORY_COUNT categorías de especialista. */
  specialistCategoryIds: string[];
}

export interface Team {
  id: string;
  name: string;
  /** Color de una paleta accesible. */
  color: string;
  /** Podio visual 1..6. */
  podium: number;
  /** 1..3 jugadores (como en el original, de 7 jugadores en adelante se comparte podio). */
  playerIds: string[];
  score: number;
  spinsTaken: number;
}

export type Difficulty = 1 | 2 | 3;
export type CorrectIndex = 0 | 1 | 2 | 3;
export type QuestionSource = 'manual' | 'opentdb' | 'llm';

export interface QuestionMedia {
  kind: 'image' | 'audio';
  src: string;
}

export interface Question {
  id: string;
  lang: Lang;
  categoryId: string;
  difficulty: Difficulty;
  type: 'mcq';
  text: string;
  options: [string, string, string, string];
  correctIndex: CorrectIndex;
  explanation?: string;
  source?: QuestionSource;
  /** false si lo generó un LLM y nadie lo ha revisado. */
  verified: boolean;
  media?: QuestionMedia;
}

export interface Category {
  id: string;
  label: string;
  emoji?: string;
  tags?: string[];
}

/** Fases posibles de la partida (máquina de estados, sección 8 de instructions.md). */
export type Phase =
  | 'lobby'
  | 'registration'
  | 'intro'
  | 'roundIntro'
  | 'question'
  | 'reveal'
  | 'roundSummary'
  | 'minigameIntro'
  | 'minigamePlay'
  | 'minigameResult'
  | 'wheel'
  | 'finalResults'
  | 'paused'
  | 'ended';

export type ShowScriptStepKind = 'round' | 'minigame' | 'wheel' | 'break';

export interface ShowScriptStep {
  kind: ShowScriptStepKind;
  id: string;
  params?: Record<string, unknown>;
}

export type WheelEffect =
  | { type: 'multiplier'; value: number }
  | { type: 'addPoints'; value: number }
  | { type: 'losePoints'; value: number }
  | { type: 'losePercent'; value: number }
  | { type: 'stealPoints'; value: number; from: 'leader' | 'chosen' | 'random' }
  | { type: 'giftPoints'; value: number; to: 'last' | 'chosen' }
  | { type: 'nothing' };

export interface WheelWedge {
  id: string;
  label: string;
  /** Nº de cuñas iguales que ocupa (lo que ves es la probabilidad real). */
  weight: number;
  effect: WheelEffect;
}

export type WheelMode = 'multiplier-before-minigame' | 'reward-after-minigame' | 'both';
export type SpinPolicy = 'top-half';
