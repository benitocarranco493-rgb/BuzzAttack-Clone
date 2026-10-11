# instructions.md — "Buzz Home" (nombre provisional)

> Game show multijugador para jugar en casa, inspirado en la experiencia presencial **BuzzAttack** (Fever, Madrid).
> Documento de especificación para que un agente de IA desarrolle la aplicación completa.
> Investigación realizada el 11 de octubre de 2026.

---

## 0. Cómo usar este documento (leer primero)

1. Lee el documento entero antes de escribir código. Ejecuta las fases de la sección 18 **en orden**.
2. Etiquetas de fiabilidad:
   - **[VERIFICADO]** → procede de fuentes públicas citadas en la sección 2 y en las referencias.
   - **[ASUNCIÓN]** → decisión de diseño propia porque la información pública no existe o es ambigua. Implementa el valor como **configurable** (ver `config/*.ts`), no lo hardcodees.
3. No inventes requisitos. Si algo no está especificado y bloquea el trabajo, elige la opción más simple, anótala en `DECISIONS.md` y continúa.
4. Antes de fijar versiones de paquetes ejecuta `npm view <paquete> version` y usa versiones estables actuales. Los enlaces de documentación de la sección 20 son las URL canónicas de cada tecnología; consúltalos en lugar de fiarte de memoria sobre APIs.
5. Idioma de la interfaz y del contenido por defecto: **español (es-ES)**, con arquitectura i18n preparada para inglés.
6. Todo el código en **TypeScript estricto** (`"strict": true`).

---

## 1. Objetivo del producto

Una web app que permita a un grupo de **2–12 personas** jugar en el salón de casa una partida de ~60 minutos con el formato de BuzzAttack:

- Una **pantalla principal (Host)**: la tele o el portátil conectado a la tele. Hace de plató: muestra preguntas, marcadores, ruleta y presentador.
- Cada jugador usa su **móvil como podio/pulsador** (sin hardware, sin instalar nada: se entra escaneando un QR).
- Una partida = **5 juegos principales + minijuegos arcade + ruleta**, con un **presentador IA** que narra.
- Todo funciona en **red local (LAN)** sin cuentas ni registro. Cero dependencias de servicios de pago para jugar.

**Fuera de alcance:** venta de entradas, cuentas de usuario, pagos, moderación pública, matchmaking online, apps nativas.

---

## 2. Investigación: qué es BuzzAttack realmente

### 2.1 Datos generales [VERIFICADO]

| Aspecto | Dato | Fuente |
|---|---|---|
| Qué es | Game show inmersivo en vivo; plató retro con podios, luces y pantallas | madrid.buzzattack.games (FAQ) |
| Origen | Fever Original; producido con Bombastik e Inventive Productions (equipo de Boom Lab) | madrid.buzzattack.games; londonxlondon.com |
| Duración | 60 minutos | web oficial |
| Estructura | **5 juegos principales + varios minijuegos exprés sorpresa + ruleta de multiplicadores** | Fever / web oficial |
| Jugadores | Mínimo 4, hasta 12 por sesión. 6 podios por sala; **a partir de 7 jugadores se comparten podios** (equipos de 1 a 3 personas) | Fever (gift card), FAQ oficial |
| Modalidad | Equipos o individual | madridinforma.es |
| Posición | Se juega **de pie** detrás de podios | FAQ oficial |
| Presentador | **Voz de IA**, guion pregrabado (no reacciona a lo que pasa en sala) | FAQ oficial; Immersive Rumours |
| Idiomas | Español e inglés | web oficial |
| Registros de tono | Dos versiones: **clásica** y **"gamberra"/Rowdy** (humor negro, guiños picantes) | madridinforma.es; Fever Londres |
| Luces | **Sin luces estroboscópicas** (sí brillantes/parpadeantes) | FAQ oficial |
| Inspiración declarada | La ruleta de la suerte, ¿Quién quiere ser millonario?, El precio justo, Jeopardy!, Cifras y Letras | web oficial; okdiario.com; Gacetín Madrid |
| Habilidades evaluadas | Trivia, lógica, agudeza visual, oído musical, memoria, reflejos, estrategia en equipo | web oficial |

### 2.2 Flujo de una sesión [VERIFICADO, reseña de la sede de Londres]

1. **Backstage / recepción** con estética de plató; los jugadores se registran en una **tablet**.
2. Cada jugador (o equipo) elige **3 categorías de especialista** de una lista grande (ej.: "Películas de los 2000", "Pop", "Bandas de rock", "Casas de moda francesas", "Minecraft y Roblox", "Vida prehistórica"). La sesión acaba con **12 categorías** en total.
3. Vídeo introductorio pregrabado y voz del presentador IA.
4. Serie de rondas de preguntas + minijuegos; **entre rondas principales gira una ruleta** en el centro del plató.
5. Marcador final y coronación del equipo ganador.

Las preguntas y reglas se muestran en **pantallas centrales**; los jugadores responden con botones de su podio.

### 2.3 Rondas principales documentadas [VERIFICADO — nombres de la sede de Londres; la sede de Madrid usa el mismo motor con contenido/traducción propios]

| Ronda | Mecánica |
|---|---|
| **Quiz Time, Old Bean** | Cultura general (geografía, cine, música, idiomas), test, más rápido = más puntos |
| **Pick & Mix Quiz** | Los equipos eligen preguntas de dificultad creciente de las categorías de especialista de todos |
| **Wipeout** | Racha de aciertos acumula puntos; **un fallo los pierde todos** |
| **Noughts and Crosses** | Tres en raya por equipos contra otros equipos |
| **Read the Room** | Votar lo que crees que será la respuesta **más popular de la sala** (ignorar tu opinión) |

Regla común: aciertas → puntos; **el más rápido en bloquear respuesta puntúa más**.

### 2.4 Rondas específicas de Madrid [VERIFICADO en prensa, sin reglas detalladas]

- **Reconocer canciones y videoclips** (oído musical).
- **"El precio justo"**: adivinar precios de productos del súper.
- **Cultura general** (capitales, etc.).
- **Pruebas de velocidad con "botón rojo"**: hay que evitar "disparar el botón a lo loco" (implica penalización por pulsar mal).

### 2.5 Minijuegos arcade [VERIFICADO — Londres; se juegan en los podios]

| Minijuego | Mecánica |
|---|---|
| **Top Card** | Elegir lo más rápido posible la carta de mayor valor |
| **Odd One Out** | Elegir lo más rápido posible la carta/elemento diferente |
| **Bash the Alien** | Tipo "machacar topos": puntos por cada alienígena golpeado |
| **Simon Says** | Repetir una secuencia de pulsaciones cada vez más larga |

### 2.6 Ruleta [VERIFICADO con matices contradictorios entre fuentes]

- Fever: *"antes de cada minijuego se gira la ruleta para definir el **multiplicador de puntos** de la ronda"*.
- okdiario: si superas el reto arcade, **giras la ruleta, que puede modificar tu puntuación "para bien o para mal"**.
- Immersive Rumours (Londres): cuadrantes mayoritariamente de **recompensa** (puntos extra, **robar puntos a otros equipos**) pero con castigos (**perder la mitad de los puntos**). **Crítica:** la lógica de quién tiene más giros era poco clara y desequilibraba el marcador.

→ La app implementa **ambos modos** (multiplicador previo y recompensa/castigo posterior) con una ruleta genérica configurable (sección 11).

### 2.7 Críticas de reseñas que debemos **mejorar** [VERIFICADO]

1. Preguntas demasiado fáciles → el ganador lo decide la velocidad. **Mejora:** niveles de dificultad reales y banco amplio.
2. Demasiada suerte (ruleta). **Mejora:** ruleta equilibrada + giros equitativos (sección 11).
3. Presentador IA rígido, sin reacción. **Mejora:** frases de reacción dinámicas según eventos (sección 14).
4. Poca sensación de "tele" (sin cámaras). **Mejora:** marcador estilo broadcast, repeticiones de la ruleta, cortinillas, cámara de reacciones opcional (v2).

### 2.8 Lo que NO es público (y por tanto es [ASUNCIÓN])

Valores exactos de puntuación, composición de la ruleta, número de preguntas por ronda, tiempos por pregunta, lista completa y reglas de las 5 rondas de Madrid, guion del presentador. Todo esto se define abajo como configuración editable.

> **Aviso de nombres:** "Buzz!" (Sony PlayStation, con mandos físicos) es otro producto distinto. No confundir ni reutilizar sus assets.

---

## 3. Alcance

### MVP (v1.0) — "jugable y redondo"
- Salas con código + QR, unión desde móvil, equipos, reconexión.
- Selección de categorías de especialista.
- 5 rondas principales (set Londres, sección 9) + 4 minijuegos (sección 10) + ruleta (sección 11).
- Guion de sesión de 60 min configurable.
- Presentador con voz (Web Speech API) y efectos de sonido.
- Banco de ≥ 300 preguntas en español, validado.
- Marcador final y resumen de partida.
- Modo "clásico" y modo "gamberro" (este último opt-in, +18).

### v1.1
- Rondas extra "Pack Madrid": `name_that_tune`, `fair_price`, `buzz_in`.
- Panel `/admin` para editar/importar preguntas.
- Historial de partidas (SQLite).
- Generador de preguntas con la API de Claude (script).

### v2 (opcional)
- Ronda `numbers_round` (estilo Cifras y Letras).
- Modo remoto (videollamada: preguntas también en el móvil).
- Cámara de reacciones, presentador con frases generadas por LLM en vivo.

---

## 4. Arquitectura

```
┌─────────────────────┐        WebSocket (Socket.IO)        ┌──────────────────────┐
│  HOST  (TV/portátil)│◄───────────────────────────────────►│                      │
│  /host              │                                     │   Servidor Node.js   │
│  Plató, preguntas,  │                                     │   (autoritativo)     │
│  ruleta, marcadores │                                     │  - Salas en memoria  │
└─────────────────────┘                                     │  - Motor de rondas   │
┌─────────────────────┐                                     │  - Puntuación        │
│ JUGADORES (móviles) │◄───────────────────────────────────►│  - RNG ruleta        │
│  /play              │                                     │  - Sirve estáticos   │
│  Podio: botones A-D │                                     └──────────┬───────────┘
└─────────────────────┘                                                │
┌─────────────────────┐                                     content/*.json (preguntas,
│ DIRECTOR (opcional) │◄──────────────────────────────────  rondas, ruleta, guiones)
│  /host?director=1   │
└─────────────────────┘
```

Principios:
- **Servidor autoritativo.** Los clientes solo envían intenciones (`answer`, `tap`, `vote`); el servidor valida, puntúa y emite el estado. Nunca confíes en puntuaciones o tiempos del cliente.
- **Las preguntas se muestran en el Host**, no en el móvil (fiel a la experiencia: los jugadores miran la pantalla central). El móvil solo muestra botones de respuesta/controles. Flag `showQuestionOnPhone` (por defecto `false`) para juego remoto.
- **Máquina de estados** explícita para el flujo de partida (sección 8). Recomendado: **XState v5** en servidor; alternativa válida: reducer propio con `phase` + timers.
- **Estado en memoria** en v1.0 (una partida a la vez por sala; varias salas simultáneas posibles). Persistencia SQLite solo en v1.1 para historial.
- Rol **Director**: en casa nadie "es la IA", así que alguien debe poder pausar/saltar/avanzar. Se resuelve con una barra de control en `/host` (auto-oculta, atajos de teclado) o una ruta `/host?director=1` abierta en un móvil/portátil aparte.

---

## 5. Stack recomendado

| Capa | Elección | Motivo |
|---|---|---|
| Lenguaje | TypeScript (strict) | Tipos compartidos cliente/servidor |
| Gestor | pnpm workspaces (monorepo) | Compartir `packages/shared` |
| Servidor | Node.js LTS + **Fastify** + **Socket.IO** | Tiempo real con reconexión y rooms nativas |
| Cliente | **Vite + React 18/19 + React Router** | Rápido de desarrollar y servir |
| Estilos | **Tailwind CSS** + CSS variables de tema | Iteración rápida del look "plató" |
| Animación | **Motion** (antes Framer Motion) + Canvas/SVG para la ruleta | Transiciones y ruleta suave |
| Validación | **Zod** | Esquemas compartidos para eventos y contenido |
| Estado servidor | **XState v5** (recomendado) | Flujo de fases + timers testeable |
| Estado cliente | Zustand o Context | Simple |
| Audio | **Howler.js** (SFX/música) + Web Audio API (tonos de Simon) | Fiable en móviles |
| Voz | **Web Speech API – SpeechSynthesis** | Gratis, sin backend |
| QR | `qrcode` / `qrcode.react` | Código de sala |
| Tests | **Vitest** (unidad) + **Playwright** (e2e multi-contexto) | Cobertura de lógica y flujo |
| Lint | ESLint + Prettier | — |
| Contenedor | Docker + docker-compose | Despliegue doméstico |

---

## 6. Estructura del repositorio

```
buzz-home/
├─ package.json                # workspaces
├─ pnpm-workspace.yaml
├─ README.md   DECISIONS.md   instructions.md
├─ .env.example
├─ docker-compose.yml  Dockerfile
├─ apps/
│  ├─ server/
│  │  └─ src/
│  │     ├─ index.ts                 # Fastify + Socket.IO + estáticos
│  │     ├─ rooms/RoomManager.ts     # crear/unir/limpiar salas, códigos
│  │     ├─ game/
│  │     │  ├─ gameMachine.ts        # XState: fases de la partida
│  │     │  ├─ scoring.ts            # puntuación pura (testeable)
│  │     │  ├─ wheel.ts              # RNG + resolución de efectos
│  │     │  ├─ rounds/               # un módulo por ronda
│  │     │  │  ├─ quizTime.ts  pickAndMix.ts  wipeout.ts
│  │     │  │  ├─ noughtsCrosses.ts  readTheRoom.ts
│  │     │  │  └─ (pack madrid) nameThatTune.ts fairPrice.ts buzzIn.ts
│  │     │  └─ minigames/
│  │     │     └─ topCard.ts oddOneOut.ts bashAlien.ts simonSays.ts
│  │     ├─ content/ContentStore.ts  # carga/valida JSON, evita repetidas
│  │     ├─ host/narrator.ts         # selección de frases del presentador
│  │     └─ sockets/handlers.ts      # eventos
│  └─ web/
│     └─ src/
│        ├─ routes/ host/ play/ admin/
│        ├─ components/ (Podium, Scoreboard, Wheel, QuestionCard, Countdown…)
│        ├─ audio/ speech/ i18n/ theme/
│        └─ main.tsx
├─ packages/
│  └─ shared/src/
│     ├─ types.ts events.ts schemas.ts constants.ts
├─ content/
│  ├─ es/ questions/*.json  categories.json  readTheRoom.json
│  │      fairPrice.json  music.json  narrator.classic.json  narrator.rowdy.json
│  ├─ en/ (misma estructura, opcional)
│  ├─ config/ show.default.json  scoring.json  wheels.json
│  └─ media/  (audio/imagenes propios del usuario; NO versionar material con copyright)
└─ scripts/
   ├─ validate-content.ts
   └─ generate-questions.ts   # v1.1, usa API de Claude
```

---

## 7. Modelo de datos (referencia; ajustar con Zod)

```ts
// packages/shared/src/types.ts
export type RoomCode = string; // 4 letras mayúsculas sin I/O/0/1

export interface Player {
  id: string;            // uuid
  token: string;         // para reconexión (localStorage)
  nickname: string;      // 2-14 chars, filtro de insultos opcional
  teamId: string;
  connected: boolean;
  specialistCategoryIds: string[]; // exactamente 3
}

export interface Team {
  id: string;
  name: string;
  color: string;         // de una paleta accesible
  podium: number;        // 1..6 (visual)
  playerIds: string[];   // 1..3 (como en el original)
  score: number;
  spinsTaken: number;
}

export type Difficulty = 1 | 2 | 3;

export interface Question {
  id: string;
  lang: 'es' | 'en';
  categoryId: string;
  difficulty: Difficulty;
  type: 'mcq';
  text: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation?: string;
  source?: string;        // 'manual' | 'opentdb' | 'llm'
  verified: boolean;      // false si lo generó un LLM y nadie lo ha revisado
  media?: { kind: 'image' | 'audio'; src: string };
}

export interface Category { id: string; label: string; emoji?: string; tags?: string[] }

export type Phase =
  | 'lobby' | 'registration' | 'intro'
  | 'roundIntro' | 'question' | 'reveal' | 'roundSummary'
  | 'minigameIntro' | 'minigamePlay' | 'minigameResult'
  | 'wheel' | 'finalResults' | 'paused' | 'ended';

export interface ShowScriptStep {
  kind: 'round' | 'minigame' | 'wheel' | 'break';
  id: string;                     // 'quizTime' | 'topCard' | ...
  params?: Record<string, unknown>;
}

export interface WheelWedge {
  id: string;
  label: string;
  weight: number;                  // nº de cuñas iguales que ocupa (para dibujar)
  effect:
    | { type: 'multiplier'; value: number }              // x0.5, x2, x3…
    | { type: 'addPoints'; value: number }
    | { type: 'losePoints'; value: number }
    | { type: 'losePercent'; value: number }             // 0.5 = pierde la mitad
    | { type: 'stealPoints'; value: number; from: 'leader' | 'chosen' | 'random' }
    | { type: 'giftPoints'; value: number; to: 'last' | 'chosen' }
    | { type: 'nothing' };
}
```

### Eventos Socket.IO (contrato mínimo — definir con Zod en `shared/events.ts`)

| Dirección | Evento | Payload |
|---|---|---|
| host→srv | `room:create` | `{ config }` → ack `{ code }` |
| player→srv | `room:join` | `{ code, nickname }` → ack `{ playerToken }` |
| player→srv | `room:rejoin` | `{ code, playerToken }` |
| player→srv | `team:choose` | `{ teamId \| newTeamName }` |
| player→srv | `categories:pick` | `{ categoryIds: [3] }` |
| director→srv | `game:start` / `game:pause` / `game:resume` / `game:skip` / `game:next` | — |
| srv→all | `state:sync` | Estado público completo (en rejoin y cambios de fase) |
| srv→all | `question:show` | `{ questionId, startsAtServerMs, durationMs, optionsPublic }` |
| player→srv | `answer:submit` | `{ questionId, optionIndex }` |
| srv→all | `question:reveal` | `{ correctIndex, perTeamDelta, explanation? }` |
| player→srv | `buzz`, `tap`, `vote`, `simon:press` | según ronda |
| srv→all | `wheel:spin` | `{ spinId, targetWedgeId, targetAngleDeg, durationMs, forTeamId }` |
| srv→all | `narrator:say` | `{ text, tone, ssmlHint? }` |
| srv→all | `scoreboard:update` | `Team[]` ordenado |
| srv→all | `time:ping` / player→srv `time:pong` | sincronización de reloj |

---

## 8. Flujo de partida (máquina de estados)

```
lobby → registration → intro →
  [ roundIntro → (question → reveal)×N → roundSummary ]  ← ronda principal
  [ minigameIntro → minigamePlay → minigameResult → wheel ]  ← minijuego + ruleta
  … repetir según guion … →
finalResults → ended
(paused puede intercalarse en cualquier fase)
```

### Guion por defecto (60 min) [ASUNCIÓN — `content/config/show.default.json`]

| # | Paso | Duración aprox. |
|---|---|---|
| 0 | Lobby + registro (equipos, categorías) | 5 min (fuera del cómputo si se desea) |
| 1 | Intro del presentador | 1 min |
| 2 | **R1 Quiz Time** (10 preguntas) | 7 min |
| 3 | Minijuego **Top Card** + ruleta | 4 min |
| 4 | **R2 Pick & Mix** (8 preguntas) | 8 min |
| 5 | Minijuego **Odd One Out** + ruleta | 4 min |
| 6 | **R3 Wipeout** (10 preguntas) | 6 min |
| 7 | Minijuego **Bash the Alien** + ruleta | 4 min |
| 8 | **R4 Noughts & Crosses** (2 tableros) | 9 min |
| 9 | Minijuego **Simon Says** + ruleta | 4 min |
| 10 | **R5 Read the Room** (6 prompts) | 6 min |
| 11 | Resultados finales y podio | 2 min |

El guion debe ser un JSON de `ShowScriptStep[]` editable; el servidor lo ejecuta sin código específico por partida.

---

## 9. Rondas principales — especificación

Convención común a todas:
- Sincronización: el servidor emite `startsAtServerMs` + `durationMs`; acepta respuestas hasta `deadline + 250 ms` (gracia de red).
- Un equipo con varios jugadores **comparte podio**: la respuesta del equipo es **la primera enviada por cualquier miembro**; las siguientes se ignoran (el móvil muestra "tu equipo ya respondió").
- Fórmula de puntos por defecto (configurable en `scoring.json`) [ASUNCIÓN]:
  `puntos = round( base × dificultad × (0.4 + 0.6 × tiempoRestante / tiempoTotal) )` si acierta; `0` si falla.
  `base = 100`; `dificultad` ∈ {1, 1.25, 1.5}.

### R1 — Quiz Time (`quizTime`)
- 10 preguntas MCQ de cultura general, dificultad creciente (4×d1, 4×d2, 2×d3), 15 s cada una.
- **Host:** pregunta + 4 opciones (A/B/C/D con **forma+color+letra**), cuenta atrás, indicador de "X equipos han respondido", sin revelar quién.
- **Móvil:** 4 botones grandes; tras responder, bloqueo y vibración.
- **Reveal:** opción correcta resaltada, delta de puntos por equipo, mini-ranking cada 5 preguntas.

### R2 — Pick & Mix (`pickAndMix`)
- Pool de categorías = unión de las categorías de especialista elegidas por todos; si hay < 8, completar al azar. Mostrar tablero de 8–12 categorías.
- Cada categoría tiene 3 niveles de dificultad; al elegirla se sirve la siguiente pregunta disponible (d1 → d2 → d3).
- **Turnos** de elección: equipos por orden **ascendente de puntuación** (ayuda al que va por detrás) [ASUNCIÓN]. 8 preguntas en total.
- **Todos** los equipos responden la pregunta elegida (puntuación por velocidad). El equipo que elige gana **+50 %** de puntos si acierta [ASUNCIÓN].

### R3 — Wipeout (`wipeout`)
- 10 preguntas, 12 s. Cada equipo lleva una **racha** y un **bote** de ronda propio.
- Acierto: `racha++`, `bote += 50 × racha` (50, 100, 150…).
- Fallo o no responder: `racha = 0`, **`bote = 0`** (pierde todo lo acumulado en la ronda).
- Al final de la ronda, el bote se suma al marcador. Flag opcional `allowBank` (botón "Plantarse" para asegurar el bote) desactivado por defecto.

### R4 — Noughts and Crosses (`noughtsCrosses`)
- Tablero 3×3; cada casilla = una pregunta (categoría visible, dificultad variable).
- **Dos bandos.** Si hay exactamente 2 equipos, son los bandos. Si hay más, se forman 2 alianzas alternando equipos por ranking (1.º y 3.º vs 2.º y 4.º…) [ASUNCIÓN].
- Turno alterno: el bando elige casilla; **responde el primer miembro que bloquee respuesta**. Acierto → casilla suya (X u O). Fallo → la casilla queda libre y pasa el turno.
- Gana el bando con 3 en línea. Premio: **300 pts** a cada equipo del bando ganador; empate (tablero lleno): **100 pts** a todos.
- Se juegan **2 tableros** intercambiando quién empieza.

### R5 — Read the Room (`readTheRoom`)
- 6 prompts de opinión **sin respuesta correcta** (ej.: "¿Cuál es el plato más típico de domingo?"), con 4–6 opciones.
- Cada equipo vota **la opción que cree que elegirá la mayoría de la sala**.
- Puntos [ASUNCIÓN]: opción más votada → **150**; segunda → **75**; empate de primeras plazas → todos 150.
- Reveal con barras animadas de porcentaje de votos.

### Pack Madrid (v1.1) — rondas adicionales documentadas en prensa

- **`nameThatTune`** (oído musical): audio de 15–30 s + 4 opciones (canción/artista). Audio **propio del usuario** en `content/media/music/` o previews legales (ver sección 13.3). Puntuación por velocidad. Opcional: variante "videoclip" mostrando un fotograma.
- **`fairPrice`** (precio justo): imagen + nombre de producto; cada equipo introduce un precio numérico. Gana el más cercano: 300 / 200 / 100 por orden; bonus +100 si el error es ≤ 5 %. Datos en `fairPrice.json` (precio, imagen propia).
- **`buzzIn`** (botón rojo): la pregunta se revela por fases (pistas progresivas); el primero en pulsar responde; **si falla, queda bloqueado para esa pregunta y pierde 25 pts** (penaliza el spam de pulsaciones).
- **`numbersRound`** (v2, Cifras y Letras): 6 números + objetivo; los equipos envían una expresión aritmética; se valida con `mathjs` (https://mathjs.org/docs/); gana la más cercana al objetivo.

---

## 10. Minijuegos arcade — especificación

Todos: duran 45–90 s, juegan **todos los equipos a la vez**, resultado → ranking del minijuego → puntos de minijuego (**1.º 300, 2.º 200, 3.º 100, resto 50**) multiplicados por el multiplicador de ruleta si el modo está activo [ASUNCIÓN]. La entrada es el móvil. Cada minijuego tiene `teamAggregate: 'sum' | 'max'`.

| Minijuego | Entrada en móvil | Reglas | Agregado |
|---|---|---|---|
| **Top Card** | 4 cartas con valores numéricos (opcional: baraja española) | 8 rondas de 4 s. Tocar la de mayor valor. Acierto: `50 + bonus de velocidad (0–50)`. Fallo: `-25` y bloqueo en esa ronda. | sum |
| **Odd One Out** | Cuadrícula 4×4/5×5 de emojis/formas casi idénticas con 1 distinto | 10 rondas de 6 s con dificultad creciente (parejas parecidas 🙂/🙃). Acierto `+60 + bonus`, fallo `-20`. | sum |
| **Bash the Alien** | Cuadrícula 3×3 tipo "topos" | 45 s. Aparecen aliens 0,6–1,2 s en posiciones aleatorias generadas por el **servidor con semilla**; cada acierto `+10`, golpe en hueco `-5`. El servidor valida que el golpe cae dentro de la ventana del alien. | sum |
| **Simon Says** | 4 botones de colores con tonos | El host reproduce la secuencia (misma para todos, luces + tonos Web Audio). Los jugadores la repiten. Etapa n: secuencia de longitud n. Error → eliminado. Puntos = `20 × etapa alcanzada`. | sum |

Notas técnicas:
- Los eventos de `tap` llevan `clientTs` solo para telemetría; **el servidor usa su propio reloj** para validar ventanas.
- Para evitar trampas en Bash the Alien: limitar a ≤ 8 taps/s por jugador y descartar excedentes.
- Tonos de Simon: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API (OscillatorNode). Requiere **gesto del usuario** para desbloquear audio en móvil.

---

## 11. Ruleta

### Componente
- Dibujada en **Canvas 2D o SVG** (https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API), cuñas **iguales** en tamaño; la probabilidad se controla repitiendo cuñas, de modo que **lo que ves es la probabilidad real**.
- **El servidor decide el resultado** (`crypto.randomInt`) y envía `targetWedgeId`, `targetAngleDeg` (con vueltas completas extra) y `durationMs` (4–6 s). El cliente solo anima con easing (cubic-bezier de desaceleración) hasta ese ángulo. Nunca calcules el resultado en el cliente.
- Sonido de "tic-tic" al pasar cada cuña; sin destellos > 3 por segundo.

### Modos (config en `wheels.json`) [ASUNCIÓN para valores]

`wheelMode`:
1. `multiplier-before-minigame`: antes de cada minijuego se gira la ruleta de **multiplicadores** (para todos o para el equipo líder).
2. `reward-after-minigame`: tras el minijuego, los equipos con derecho a giro giran la ruleta de **recompensa/castigo**.
3. `both` (por defecto en el show "completo").

**Ruleta de multiplicadores (20 cuñas):** x1 ×8, x2 ×6, x3 ×2, x0.5 ×4.

**Ruleta de recompensa/castigo (24 cuñas):**
`+100 ×5` · `+250 ×4` · `+500 ×1` · `Roba 200 al líder ×2` · `Roba 150 a un equipo a tu elección ×2` · `Regala 100 al último ×1` · `Nada ×4` · `-100 ×3` · `Pierde la mitad ×1` · `Comodín x2 en el siguiente minijuego ×1`.

### Política de giros (`spinPolicy`) — corrige la queja de reseñas
- Por defecto `'top-half'`: giran los equipos de la **mitad superior del ranking del minijuego** (superar el reto da derecho a girar).
- Garantía de equidad: **todo equipo debe tener al menos `minSpins = 2` giros** a lo largo de la partida; el servidor reasigna giros pendientes al final si hace falta.
- `spinsTaken` visible en el marcador para transparencia.

---

## 12. Puntuación, sincronización y anti-trampas

1. **Reloj:** al conectar, cada cliente calcula `offset` con 5–8 pings (`time:ping/pong`, mediana). Las cuentas atrás se pintan desde `deadlineServerMs - (Date.now() + offset)`. En LAN el error es < 30 ms.
2. **Autoridad:** el servidor guarda `receivedAtServerMs` y puntúa con él. Respuestas duplicadas o tardías se ignoran.
3. **Desempates:** si dos equipos tienen el mismo `receivedAtServerMs` (misma ms), se reparte en orden de recepción del socket.
4. **Anonimato de la respuesta:** el host nunca recibe qué opción eligió cada equipo hasta el `reveal`.
5. **Desconexión:** un jugador desconectado mantiene su plaza 5 min (`room:rejoin` con token). Si todos los miembros de un equipo están desconectados, ese equipo no puntúa pero sigue en la partida.
6. **Rate limiting:** 10 eventos/s por socket (excepto `tap` en Bash the Alien).
7. **Todas las funciones de puntuación son puras** (`scoring.ts`) y reciben `config` + datos → fácilmente testeables.

---

## 13. Banco de preguntas y contenido

### 13.1 Formato
Archivos JSON por categoría en `content/es/questions/<categoryId>.json`, arrays de `Question` (sección 7). Un script `scripts/validate-content.ts` debe comprobar con Zod: 4 opciones únicas, `correctIndex` válido, longitud de texto ≤ 160 caracteres, IDs únicos, dificultad 1–3 y **mínimo por categoría: 10 (d1) / 8 (d2) / 6 (d3)**.

### 13.2 Objetivo de volumen
≥ 300 preguntas para el MVP (≥ 600 recomendado), ≥ 30 categorías. Categorías semilla (inspiradas en las vistas en la sede de Londres y en el estilo español):
`cine-2000s`, `pop-internacional`, `rock`, `musica-espanola-80-90`, `series-tv-espana`, `geografia`, `historia-espana`, `ciencia`, `deporte-futbol`, `gastronomia`, `moda`, `videojuegos`, `minecraft-roblox`, `harry-potter`, `anime-manga`, `cultura-internet-2020s`, `prehistoria-dinosaurios`, `mitologia`, `arte`, `literatura`, `tecnologia`, `cultura-madrid`, `marcas-y-anuncios`, `idiomas`, `refranes`.

### 13.3 Fuentes de contenido (en orden de preferencia)

1. **Banco propio manual** (el más fiable).
2. **Generación con la API de Claude** (script `generate-questions.ts`, solo servidor/local):
   - Clave en variable de entorno `ANTHROPIC_API_KEY`; **nunca en el cliente**. Modelo configurable con `ANTHROPIC_MODEL` (consultar IDs vigentes en https://docs.claude.com).
   - Prompt: pedir **solo JSON** que cumpla el esquema, 4 opciones plausibles, una correcta, dificultad indicada, sin ambigüedad ni preguntas dependientes de la fecha actual.
   - Marcar **todas** como `verified: false` y `source: 'llm'`. **Los LLM pueden inventar datos**: añadir en `/admin` una cola de revisión humana y excluir las no verificadas del modo "torneo" si se desea.
3. **Open Trivia DB** (https://opentdb.com/api_config.php): API gratuita, hasta 50 preguntas por llamada y una categoría por llamada, con *session token* para no repetir. **Solo en inglés** y los datos están bajo **CC BY-SA 4.0** (hay que atribuir y compartir igual). Útil para el locale `en`.
4. **Audio para `nameThatTune`:** preferir archivos propios. Alternativas con previews de 30 s: API de Deezer (https://developers.deezer.com/api) o iTunes Search API; **revisar sus términos de uso** antes de usarlas y no redistribuir los audios.

### 13.4 Reglas de selección
- Evitar repetidas dentro de la partida (`usedIds` por sala) **y** entre partidas recientes (`history.json`, últimas 200).
- Mezclar posición de la respuesta correcta de forma uniforme.
- Prompts de `readTheRoom` y `fairPrice` en archivos separados; mínimo 30 prompts y 60 productos respectivamente.

---

## 14. Presentador IA y audio

### 14.1 Voz
- **SpeechSynthesis** del navegador (https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis): buscar voz `es-ES` con `getVoices()` (cargar con el evento `voiceschanged`). Ofrecer selector de voz y volumen en un panel de ajustes del host. Fallback: mostrar subtítulos siempre (también como accesibilidad).
- Las voces disponibles varían según SO/navegador; no dependas de una concreta.
- Mejora opcional v2: audios pregrabados con TTS neuronal guardados en `content/media/voice/` (el usuario los genera por su cuenta).

### 14.2 Guion y tono
- `narrator.classic.json` y `narrator.rowdy.json` con frases por **evento**: `intro`, `roundIntro:<id>`, `correctFirst`, `allWrong`, `streakBroken`, `bigSteal`, `wheelGood`, `wheelBad`, `closeFinish`, `finalWinner`, etc. Mínimo 4 variantes por evento para evitar repetición.
- **Reactividad** (mejora sobre el original): el narrador elige frase según lo ocurrido (ej.: un equipo pierde su bote entero en Wipeout → frase de burla suave; remontada; empate).
- Modo `rowdy` (humor negro/picante): **opt-in explícito** con confirmación de +18 en el lobby; por defecto `classic`.
- Opcional v1.1+: frases extra generadas por LLM **en el servidor** con latencia baja y *fallback* inmediato a frases del JSON si tarda > 1,5 s.

### 14.3 Sonido
- SFX: acierto, fallo, tic de ruleta, fanfarria de ganador, cuenta atrás, whoosh de cortinilla. **Usar solo sonidos con licencia libre o propios** (p. ej. https://freesound.org con licencia CC0/CC-BY; guardar atribuciones en `CREDITS.md`).
- Música de fondo en bucle con *ducking* automático cuando habla el presentador.
- Botón "Activar sonido" en el host y los móviles (los navegadores bloquean audio sin gesto).

---

## 15. UI / UX y accesibilidad

### Look & feel
Plató retro de TV: fondo oscuro, **neón** (magenta/cian/amarillo), focos, barras de color de "carta de ajuste" en cortinillas, podios al pie con nombre + puntuación de cada equipo. No copiar logos, tipografías propietarias ni imágenes de BuzzAttack. Sugerencia de tipografías libres: **Bungee** (títulos) + **Inter** (texto) de Google Fonts.

### Host (`/host`, 16:9, diseñado a 1920×1080, escalable)
- Lobby: código de sala enorme + QR + lista de equipos/jugadores conectándose.
- Zonas fijas: **pantalla central** (pregunta/juego), **fila de podios** (6, con equipos compartiendo), **banda inferior de narrador** (subtítulos).
- Cortinillas animadas entre rondas; ruleta a pantalla completa con foco y animación de ganador.
- Modo pantalla completa (Fullscreen API) y atajos: `Espacio` siguiente, `P` pausa, `S` saltar, `M` mute, `F` fullscreen.

### Móvil (`/play`)
- Mobile-first, orientación vertical, botones de ≥ 64 px; `touch-action: manipulation`; sin zoom por doble toque.
- Vibración corta al responder (https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API; **no funciona en iOS Safari**, no depender de ella).
- Mantener pantalla encendida con **Screen Wake Lock** (https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API). Requiere **contexto seguro (HTTPS o localhost)**: en LAN por HTTP no estará disponible → documentar en README y añadir fallback (aviso "desactiva el bloqueo automático de pantalla").
- Siempre visible: nombre de equipo, color y puntuación.

### Accesibilidad (obligatorio)
- Las 4 respuestas se distinguen por **color + forma + letra** (daltonismo).
- **Sin luces estroboscópicas**: el original lo garantiza; cumplir WCAG 2.3.1 (máx. 3 destellos por segundo) https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html. Respetar `prefers-reduced-motion`.
- Contraste AA, tamaños de fuente grandes en host (legible a 3 m), subtítulos del narrador siempre activos.
- Aviso de fotosensibilidad en el lobby (el original lo incluye en sus FAQ).

---

## 16. Red, despliegue y entorno doméstico

- **Desarrollo:** `pnpm dev` levanta servidor (puerto 3000) y Vite con `--host` para acceso desde móviles.
- **LAN:** el servidor detecta su IP local (`os.networkInterfaces()`) y la usa para generar el **QR** (`http://192.168.x.x:3000/play?code=ABCD`). Documentar firewall (permitir puerto 3000) y que móviles y host deben estar en la misma Wi-Fi (sin "aislamiento de clientes").
- **Producción casera:** `docker compose up` (imagen Node multi-stage; un solo contenedor sirve API, WebSocket y estáticos).
- **Jugar con amigos remotos / HTTPS:** exponer con **Cloudflare Tunnel** (https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) o ngrok; con HTTPS se habilita Wake Lock. Activar CORS restrictivo y limitar creación de salas.
- **Variables (`.env.example`):** `PORT`, `PUBLIC_BASE_URL`, `DEFAULT_LANG=es`, `ENABLE_ROWDY=false`, `ANTHROPIC_API_KEY` (opcional), `ANTHROPIC_MODEL` (opcional).
- Códigos de sala: 4 letras sin caracteres ambiguos; caducan tras 3 h de inactividad.
- Sin analytics ni telemetría externa. Sin cookies de terceros.

---

## 17. Testing y criterios de aceptación

### Unitarias (Vitest) — obligatorias
- `scoring.ts`: fórmula de velocidad, bote de Wipeout (incluido reset), votos de Read the Room (empates), tres en raya (todas las líneas, empate), ranking y desempates.
- `wheel.ts`: la distribución sobre 100 000 giros se ajusta a los pesos (± 1 %); los efectos (`stealPoints`, `losePercent`) nunca dejan puntuaciones negativas (suelo en 0).
- `ContentStore`: sin repetidas en 200 partidas simuladas; validación de esquemas.
- Máquina de estados: recorre el guion por defecto completo sin quedarse bloqueada, incluyendo desconexiones y pausas.

### E2E (Playwright, múltiples contextos)
- 1 host + 4 jugadores (2 equipos) juegan una partida acelerada (timers a ×10 con flag de test) hasta `finalResults`.
- Un jugador cierra el navegador a mitad de ronda y se reconecta con su token sin perder plaza ni puntos.
- Un equipo con 3 móviles: solo cuenta la primera respuesta.

### Criterios de aceptación del MVP
1. Una partida completa de 4–12 jugadores termina sin intervención técnica.
2. Latencia de respuesta percibida < 200 ms en LAN.
3. Cada ronda y minijuego del guion por defecto funciona y tiene su pantalla de host y móvil.
4. Ningún estado depende del cliente para puntuar.
5. Pasa `lint`, `typecheck`, tests unitarios y e2e en CI.
6. README con "cómo jugar en 3 pasos" y capturas.
7. Auditoría de accesibilidad básica (Lighthouse ≥ 90 en `/play`).

---

## 18. Plan de implementación por fases

Cada fase termina con código funcionando, tests y un commit etiquetado.

**Fase 0 — Andamiaje.** Monorepo, TS estricto, ESLint/Prettier, Vitest, Docker, endpoint de salud, `shared` con tipos y Zod, CI.

**Fase 1 — Salas y lobby.** Crear sala, código, QR, unión móvil, reconexión por token, equipos (1–3), 6 podios, elección de 3 categorías, pantalla de lobby del host.

**Fase 2 — Motor y primera ronda.** Máquina de estados, sincronización de reloj, `ContentStore`, **R1 Quiz Time** completa, marcador, reveal y mini-ranking. Con 100 preguntas de ejemplo.

**Fase 3 — Ruleta y minijuegos.** Componente Wheel (modos multiplicador y recompensa), política de giros, los 4 minijuegos, guion de sesión ejecutable desde JSON.

**Fase 4 — Resto de rondas.** Pick & Mix, Wipeout, Noughts and Crosses, Read the Room. Resultados finales con podio y estadísticas (mejor racha, más rápido, equipo más afortunado en la ruleta).

**Fase 5 — Presentador, audio y pulido.** SpeechSynthesis + subtítulos, narrador reactivo (clásico/gamberro), SFX/música, cortinillas, atajos de director, accesibilidad, ajustes persistentes.

**Fase 6 — Contenido y herramientas.** Ampliar banco a ≥ 300 preguntas, `validate-content`, `generate-questions` con Claude + cola de revisión en `/admin`, historial SQLite.

**Fase 7 — Pack Madrid y empaquetado.** `nameThatTune`, `fairPrice`, `buzzIn`; Docker final; guía de Cloudflare Tunnel; README definitivo.

---

## 19. Aspectos legales y de propiedad intelectual

*(Orientación general; no es asesoramiento jurídico.)*
- Proyecto **personal, no comercial, no afiliado** a Fever, BuzzAttack ni a ningún programa de TV.
- **No usar** el nombre "BuzzAttack", sus logos, vídeos, imágenes, sonidos, guiones ni el texto de su web. Nombre provisional "Buzz Home" configurable (`APP_NAME`).
- No usar nombres comerciales de formatos de TV en la UI ("La ruleta de la suerte", "El precio justo", "Jeopardy!", "Cifras y Letras"); usar nombres genéricos propios (los formatos de juego en sí —ruleta, tres en raya, trivial— son ideas comunes).
- Música, imágenes de productos y vídeos: **solo propios o con licencia libre**; no versionar material con copyright. Mantener `CREDITS.md`.
- Preguntas de Open Trivia DB: CC BY-SA 4.0 (atribución + misma licencia).
- Modo gamberro: aviso +18 explícito; no incluir contenido que degrade a colectivos protegidos.
- Datos personales: solo apodos efímeros en memoria; sin almacenamiento persistente salvo historial local opcional sin datos identificativos.

---

## 20. Referencias

### Fuentes sobre BuzzAttack (consultadas para esta especificación)
- Web oficial Madrid: https://madrid.buzzattack.games/
- Fever – BuzzAttack Madrid Chamberí: https://feverup.com/m/427435/en
- Fever – Gift Card (6 podios, 4–12 jugadores): https://feverup.com/m/487840/en
- Fever – Londres: https://feverup.com/m/661984 · Waitlist Londres: https://feverup.com/m/661982
- Fever – Lille (descripción de multiplicador y minijuegos): https://feverup.com/m/615539/en
- Reseña técnica (rondas, minijuegos, ruleta, críticas): https://www.immersiverumours.com/post/review-buzzattack-london
- Presentación Londres: https://www.londonxlondon.com/buzzattack-immersive-experience/
- Madrid Informa (rondas de Madrid, modos clásico/gamberro, backstage): https://madridinforma.es/un-concurso-de-sobremesa-hecho-realidad-buzzattack-abre-su-plato-en-madrid-para-jugar-como-en-la-tele/
- OKDiario (minijuegos arcade y ruleta): https://okdiario.com/cool/ocio/buzzattack-experiencia-inmersiva-que-te-hara-sentir-como-si-estuvieras-concurso-television-20244040
- Gacetín Madrid (inspiraciones): https://gacetinmadrid.com/2025/09/27/buzzattack-inmersiva-concurso-television-madrid/
- Brisbane (6 podios, presentador IA): https://brisbanetravelguide.com/buzzattack-game-show-experience/

### Documentación técnica (URLs canónicas; verificar versión vigente antes de usar)
- Socket.IO: https://socket.io/docs/v4/
- Fastify: https://fastify.dev/docs/latest/
- Vite: https://vite.dev/guide/
- React: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/docs
- Motion: https://motion.dev/docs
- XState: https://stately.ai/docs
- Zod: https://zod.dev
- Howler.js: https://howlerjs.com
- Vitest: https://vitest.dev · Playwright: https://playwright.dev
- MDN Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- MDN Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- MDN Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- MDN Fullscreen API: https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
- MDN `prefers-reduced-motion`: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- Anthropic / Claude API: https://docs.claude.com
- Open Trivia DB: https://opentdb.com/api_config.php
- mathjs: https://mathjs.org/docs/

---

## 21. Preguntas abiertas (anotar la decisión en `DECISIONS.md`)

1. ¿Nombre definitivo de la app y paleta propia?
2. ¿Se permite el modo gamberro por defecto o siempre opt-in? (Recomendado: opt-in.)
3. ¿Se quiere persistencia de historial/ranking histórico entre partidas (SQLite) ya en MVP?
4. ¿Se usarán audios propios o previews de Deezer/iTunes para `nameThatTune`?
5. ¿Se activará la generación de preguntas con la API de Claude (requiere clave y revisión humana)?
6. ¿Hay límite de jugadores real en casa (4–12 como el original) o se admiten más podios?
