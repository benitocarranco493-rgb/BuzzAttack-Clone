# DECISIONS.md

Registro de decisiones de diseño (contexto → decisión → alternativas descartadas).
Se actualiza cuando una decisión cambia el comportamiento o el "cómo se trabaja".

---

## 2026-10-12 — Fase 0: decisiones de andamiaje

### 1. Nombre y marca

- **Contexto:** `instructions.md` §19 prohíbe usar la marca "BuzzAttack". El nombre es provisional.
- **Decisión:** "Buzz Home", en `APP_NAME` de `packages/shared/src/constants.ts` (configurable).
- **Alternativas:** sin nombre, "Room Quiz". Descartadas por claridad del README.

### 2. `packages/shared` como paquete fuente (sin build propio)

- **Contexto:** el servidor y la web necesitan compartir tipos/esquemas; un `dist/` añade un paso
  de compilación y posibles carreras en desarrollo.
- **Decisión:** `main`/`types`/`exports` apuntan a `src/index.ts`. `tsx` (servidor) y Vite (web)
  transpilan el TypeScript directamente. `pnpm build` de `shared` = `tsc --noEmit`.
- **Alternativas:** compilación a `dist/` con composite/project references (más pasos y estados
  intermedios); bundles con tsup (dependencia extra sin beneficio real para una LAN).
- **Riesgo:** puede ser frágil si alguna herramienta espera `dist/`; mitigación: `exports` explícito.

### 3. El servidor se ejecuta con `tsx` también en producción

- **Contexto:** no hay un build "de servidor" necesario porque todos los paquetes son fuente.
- **Decisión:** scripts `dev` = `tsx watch`, `start` = `tsx`, `build` = `tsc --noEmit`.
  El arranque en producción usa `pnpm --filter @buzz/server start` (hasta el 12-10-2026 desde Docker; ver decisión 9).
- **Alternativas:** emitir `dist/` con tsc y resolver `@buzz/shared` en runtime
  (rompía la resolución del paquete fuente); esbuild/tsup como paso extra. Descartadas.
- **Nota:** el arranque en frío es algo más lento; irrelevante en LAN doméstica.

### 4. TypeScript 5.9.3 en lugar de 7.0.2

- **Contexto:** la `latest` de TS es 7.x (compilador nativo), pero `typescript-eslint` 8.71.1
  declara peer `typescript >=4.8.4 <6.1.0`.
- **Decisión:** fijar `typescript@5.9.3` (último 5.x). Revisar cuando el ecosistema soporte TS 7.
- **Alternativas:** TS 7 con `tsc --noEmit` pero sin lint; descartada porque el lint es obligatorio.

### 5. Convención de imports

- **Contexto:** ESM en Node 24 + tsx + Vite admiten resoluciones distintas.
- **Decisión:** en `apps/server` y `packages/shared` imports con extensión `.js` (estándar ESM,
  compatible con tsx, Vite y `moduleResolution: Bundler`). En `apps/web`, imports sin extensión
  (convención Vite).
- **Alternativas:** extensionless en todo (frágil en tsx); `.ts` explícito (requiere
  `allowImportingTsExtensions` y rompe en algunos empaquetadores).

### 6. Helmet y CORS en Fase 0

- **Contexto:** AGENTS exige cabeceras de seguridad y CORS restrictivo.
- **Decisión:** Helmet activo con `contentSecurityPolicy: false` de momento (SPA servida por
  Fastify; revisar/activar CSP antes de exponer la app a internet). CORS solo si se define
  `CORS_ORIGIN` (por defecto mismo origen; en desarrollo Vite usa proxy).
- **Alternativas:** CSP completa desde el inicio (rompe scripts/estilos inline de Vite en dev).

### 7. `validate:content` desde la Fase 0

- **Contexto:** AGENTS pide el comando y `instructions.md` §18 lo sitúa en la Fase 6.
- **Decisión:** implementar ya la parte que depende solo de `packages/shared` (esquemas,
  IDs únicos, opciones únicas, mínimos d1/d2/d3). Sin `content/` aún, avisa y sale con éxito.
- **Alternativas:** script vacío hasta la Fase 6 (peor señal en CI).

### 8. Versiones exactas

- **Contexto:** AGENTS §3 pide versiones exactas (`save-exact`).
- **Decisión:** todas las dependencias están fijadas sin `^`. Verificadas con `npm view` el 12-10-2026.

### 9. Despliegue en Vercel; se retira Docker

- **Contexto:** `instructions.md` §16 proponía Docker/compose para producción casera. El usuario
  decidió desplegar la app en **vercel.app** y retirar Docker si no era necesario.
- **Decisión:** `apps/web` se publica como sitio **estático** en Vercel (`vercel.json` en la raíz:
  `pnpm --filter @buzz/web build`, `outputDirectory: apps/web/dist`, fallback SPA). Se eliminan
  `Dockerfile`, `docker-compose.yml` y `.dockerignore`. El **servidor autoritativo** de juego se
  mantiene como proceso Node persistente (LAN en casa o VPS + Cloudflare Tunnel para remoto)
  porque los WebSockets de Vercel están en beta pública con límites incompatibles con una partida
  de ~60 min: conexiones máximas de 300 s en Hobby y sin estado compartido entre instancias
  (habría que persistir cada sala en Redis y tolerar caídas de conexión continuas).
- **Alternativas:** conservar Docker; usar la beta de WebSockets de Vercel con estado externo
  (Redis/Upstash) — coste y riesgo altos para el modelo en memoria de `instructions.md` §4.
- **Revisar:** cuando la beta de WebSockets de Vercel madure (límites y estado compartido)
  o si el usuario prefiere una VPS para todo.

---

## 2026-10-12 — Fase 1: salas y lobby

### 10. Cliente de sockets: singleton con reconexión + `ask()` con timeout

- **Contexto:** los eventos con ack de Socket.IO pueden quedarse colgados si el servidor no
  responde; `emitWithAck` sin timeout no falla nunca.
- **Decisión:** `apps/web/src/socket/gameSocket.ts` crea un único `io(...)` con reconexión
  automática (y `VITE_SERVER_URL` opcional para servidor remoto). Los ack usan
  `apps/web/src/lib/ack.ts` (`ask`) que resuelve con error tipado `timeout` a los 5 s.
- **Alternativas:** `socket.timeout().emitWithAck` (firmas más complejas con `exactOptionalPropertyTypes`);
  Context de React para el socket (innecesario con un singleton simple).

### 11. i18n propio mínimo (sin librería)

- **Contexto:** AGENTS §5 exige textos vía i18n (`es` por defecto, `en` preparado) y cero cadenas
  de UI en componentes.
- **Decisión:** diccionario `apps/web/src/i18n/es.ts` + `t(clave, params)` con interpolación;
  `en` declarado como `Partial<Record<Lang,…>>` con fallback automático a `es`.
- **Alternativas:** `i18next`/`react-intl` (dependencias pesadas para ~70 claves en v1).

### 12. Sesiones en `localStorage` con validación defensiva

- **Contexto:** reconexión del host (`hostToken`) y del jugador (`playerToken`) tras recargar;
  AGENTS §6 exige `try/catch`.
- **Decisión:** claves `buzz-home:host-session` / `buzz-home:player-session`; lectura que valida
  cada campo string (JSON corrupto ⇒ se ignora y se vuelve a unir). Borrar sesión en cualquier
  error de token (`invalid_token`, `room_not_found`).

### 13. Localización del `content/` con búsqueda hacia arriba

- **Contexto:** el path fijo `../../../content/es/categories.json` resultaba `apps/content/...`
  (bug real: las salas arrancaban con `availableCategories: []` y `categories:pick` rechazaba).
  Reproducido primero con `categories.test.ts` (AGENTS §8) y corregido con `findCategoriesFile()`
  que sube desde el módulo hasta 6 niveles buscando `content/es/categories.json`.
- **Alternativas:** path fijo corregido a `../../../../` (frágil ante un futuro `dist/` del servidor).

### 14. QR de unión

- **Contexto:** instructions.md §7 pide código + QR para entrar desde el móvil.
- **Decisión:** el host pinta `QRCodeSVG` con `${origin}/play?code=AAAA`; `/play` prelee el
  parámetro en el campo de código. En dev el proxy de Vite (+ `/socket.io`) evita CORS.

---

## Preguntas abiertas del `instructions.md` (§21, depender de decisiones posteriores)

| #   | Pregunta                   | Estado                                                  |
| --- | -------------------------- | ------------------------------------------------------- |
| 1   | Nombre definitivo y paleta | Pendiente (Fase 5, pulido)                              |
| 2   | Modo gamberro opt-in       | Por defecto opt-in y desactivado (`ENABLE_ROWDY=false`) |
| 3   | Historial SQLite en MVP    | No; v1.1                                                |
| 4   | Audios para `nameThatTune` | Pendiente (v1.1)                                        |
| 5   | Generación con Claude      | Opcional; requiere clave y revisión humana              |
| 6   | Límite de jugadores        | 2–12, como el original (configurable)                   |
