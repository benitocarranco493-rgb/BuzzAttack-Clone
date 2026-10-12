/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del servidor de juego (por defecto: mismo origen; en dev pasa por el proxy de Vite). */
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
