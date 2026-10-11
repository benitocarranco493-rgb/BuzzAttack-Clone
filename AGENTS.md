# AGENTS.md — Buzz Home

Guía de trabajo para agentes de IA que desarrollan este repositorio. Complementa a `instructions.md` (qué construir); este archivo define **cómo trabajar**. Si hay conflicto: la petición explícita del usuario en el chat > el `AGENTS.md` más cercano al archivo editado > `instructions.md` > este archivo raíz.

---

## 1. Principios

1. **Entiende antes de tocar.** Lee `instructions.md` (sección relevante), el código vecino y los tests existentes antes de editar.
2. **Cambios pequeños y verificables.** Un objetivo por commit. Si una tarea necesita más de ~400 líneas modificadas, divídela.
3. **No inventes.** Si algo no está especificado, elige la opción más simple, regístrala en `DECISIONS.md` (fecha, contexto, decisión, alternativas) y sigue. No bloquees por dudas menores; pregunta solo si hay riesgo de rehacer mucho trabajo.
4. **Lo marcado [ASUNCIÓN] en `instructions.md` debe ser configurable**, nunca un número mágico en el código.
5. **Verifica lo que afirmas.** No digas "funciona" sin haber ejecutado tests/typecheck/lint. Si no puedes ejecutarlo, dilo explícitamente.
6. **Honestidad ante fallos.** Si un test falla o dejas algo a medias, indícalo con claridad en el resumen final; nunca ocultes, comentes ni desactives tests para ponerlos en verde.
7. **Simplicidad primero.** Prefiere código aburrido y legible. No añadas dependencias, abstracciones ni patrones "por si acaso".

---

## 2. Comandos (crear en la Fase 0 si no existen)

```bash
pnpm install                 # instalar dependencias
pnpm dev                     # servidor (3000) + web (Vite, --host para móviles)
pnpm build                   # compilación de producción
pnpm typecheck               # tsc --noEmit en todos los paquetes
pnpm lint                    # ESLint + Prettier --check
pnpm test                    # Vitest (unidad), todos los paquetes
pnpm test:e2e                # Playwright (multi-contexto, timers acelerados)
pnpm validate:content        # valida preguntas y configuración con Zod
pnpm --filter @buzz/server test        # un solo paquete
pnpm vitest run -t "nombre del test"   # un test concreto
```

**Antes de dar una tarea por terminada, ejecuta:** `pnpm typecheck && pnpm lint && pnpm test` (y `pnpm validate:content` si tocaste `content/`; `pnpm test:e2e` si tocaste flujo de partida o sockets). Todo debe pasar.

---

## 3. Entorno y herramientas

- Node.js LTS actual, **pnpm** (no mezclar con npm/yarn). Fija la versión en `.nvmrc` y `engines`.
- Antes de añadir un paquete: comprueba la versión estable con `npm view <pkg> version`, revisa su mantenimiento y licencia, y **fija versiones exactas** (`save-exact`). Evita paquetes publicados hace menos de 2 semanas.
- Mantén `pnpm-lock.yaml` en el repositorio. No edites el lockfile a mano.
- No instales herramientas globales ni modifiques archivos fuera del repositorio.
- Consulta la documentación oficial (enlaces en `instructions.md`, sección 20) en vez de confiar en memoria sobre APIs que cambian (Socket.IO, XState, Vite, Tailwind, Motion, Playwright).

---

## 4. Arquitectura: reglas que no se rompen

1. **Servidor autoritativo.** Puntuación, tiempos, resultado de la ruleta, validación de respuestas y validez de taps se calculan **solo en el servidor**. El cliente envía intenciones (`answer:submit`, `tap`, `vote`…) y pinta el estado recibido.
2. **Reloj del servidor.** Usa `receivedAtServerMs` para puntuar. `clientTs` es solo telemetría.
3. **Lógica de juego = funciones puras.** `scoring.ts`, `wheel.ts` y la lógica de cada ronda deben ser puras (entrada → salida) y recibir su configuración por parámetro. Los efectos (sockets, timers, I/O) viven en capas finas alrededor.
4. **Contratos compartidos.** Tipos y esquemas Zod de eventos y contenido viven en `packages/shared`. Valida **todo** payload entrante en el servidor (`schema.safeParse`); descarta y registra lo inválido, nunca lances excepciones por entrada de cliente.
5. **Máquina de estados explícita** para fases de partida (XState u otro reducer): sin `if` dispersos sobre el estado; transiciones y timers en un solo lugar y testeables con reloj falso.
6. **Estado público vs. privado.** Nunca envíes al host o a los móviles datos que no deban ver (p. ej. qué opción eligió cada equipo antes del `reveal`, o `correctIndex` antes de tiempo).
7. **Configuración por datos.** Guion de sesión, ruletas, puntuaciones y narrador se cargan de `content/`. Añadir una ronda o cambiar un valor no debe requerir tocar el motor.
8. **Sin estado global mutable oculto.** El `RoomManager` es el único dueño de las salas; cada sala encapsula su estado.
9. **Idempotencia y reconexión.** Cualquier evento puede llegar duplicado o tras reconectar; los handlers deben tolerarlo.

---

## 5. Estilo de código

- **TypeScript `strict`**, sin `any` (usa `unknown` + validación). Prohibido `// @ts-ignore`; si es inevitable, `// @ts-expect-error` con explicación.
- ESM, imports ordenados, sin dependencias circulares. Prefiere `type` para uniones y `interface` para formas de objeto extensibles.
- Nombres descriptivos en **inglés** para código; textos de usuario en **español** vía i18n (`es` por defecto, `en` preparado). Cero cadenas de UI hardcodeadas en componentes.
- Funciones cortas, una responsabilidad. Evita comentarios que repiten el código; comenta **el porqué**.
- Errores: tipados y con contexto. Registra con un logger (p. ej. el de Fastify/pino), no `console.log` suelto.
- Formato: lo decide Prettier; no discutas estilo, ejecuta `pnpm lint --fix`.
- Constantes de juego en `constants.ts` o JSON de `content/config`, no esparcidas.
- Elimina código muerto y `TODO`s sin dueño. Un `TODO` debe incluir qué falta y por qué.

---

## 6. Frontend (host y móvil)

- **Mobile-first en `/play`**: botones ≥ 64 px, `touch-action: manipulation`, sin depender de hover ni de vibración (no funciona en iOS Safari).
- **Host en 16:9** (diseñado a 1920×1080, escalable), legible a 3 metros.
- Componentes presentacionales sin lógica de juego; el estado viene del servidor.
- Rendimiento: animaciones con `transform`/`opacity`, ruleta en Canvas/SVG, evita re-renders por cada tick de cuenta atrás (usa `requestAnimationFrame` o estado aislado).
- Audio: requiere gesto del usuario; incluye botón "Activar sonido". Los fallos de audio/voz **nunca** deben romper la partida (degradar a subtítulos).
- Persistencia cliente solo para `playerToken`, apodo y ajustes, en `localStorage` con `try/catch`.

---

## 7. Accesibilidad (obligatorio, no opcional)

- Respuestas distinguibles por **color + forma + letra**.
- **Sin luces estroboscópicas** (máx. 3 destellos/segundo, WCAG 2.3.1) y respeto a `prefers-reduced-motion`.
- Contraste AA, foco visible, etiquetas ARIA en controles interactivos del móvil, subtítulos del narrador siempre disponibles.
- Aviso de fotosensibilidad en el lobby.
- Lighthouse de accesibilidad ≥ 90 en `/play`.

---

## 8. Testing

- **Unitarias (Vitest) obligatorias** para: puntuación, ruleta (distribución y suelo en 0 puntos), tres en raya, votos de Read the Room, ContentStore (sin repetidas), máquina de estados (guion completo, pausas y desconexiones).
- Usa **reloj falso** (`vi.useFakeTimers`) para todo lo temporal; nada de `sleep` reales en tests unitarios.
- **E2E (Playwright)** con 1 host + ≥ 4 jugadores y timers acelerados mediante flag de test; incluye reconexión y equipo de 3 móviles.
- Regla de bug: **primero un test que lo reproduzca, luego el arreglo**.
- Tests deterministas: inyecta el RNG (semilla) en lugar de usar `Math.random()` directo en lógica de juego.
- No bajes umbrales ni elimines tests para pasar CI. Si un test es incorrecto, corrígelo explicando por qué.

---

## 9. Seguridad y privacidad

- **Nunca** subas secretos al repositorio. `ANTHROPIC_API_KEY` solo en `.env` (ignorado por git), usada **únicamente en el servidor**; mantén `.env.example` actualizado sin valores reales.
- Valida y limita todo input de cliente: longitud de apodos (2–14), códigos de sala, tamaño de mensajes de Socket.IO, **rate limit** (≈10 eventos/s por socket; excepción documentada para `tap`).
- Escapa/sanea apodos y nombres de equipo al renderizar; nunca uses `dangerouslySetInnerHTML` con datos de usuarios.
- CORS restrictivo, cabeceras de seguridad (p. ej. `@fastify/helmet`), y límite de creación de salas por IP.
- Sin analytics ni telemetría externa, sin cookies de terceros. Datos personales: solo apodos efímeros en memoria.
- Dependencias: `pnpm audit` antes de cada release; actualiza con criterio, no a ciegas.
- Contenido generado por LLM: tratarlo como **no confiable** (validar con Zod, `verified:false`, revisión humana) y sin ejecutar nunca nada que provenga de él.

---

## 10. Contenido

- Todo contenido nuevo pasa `pnpm validate:content` (4 opciones únicas, `correctIndex` válido, texto ≤ 160 caracteres, IDs únicos, mínimos por categoría y dificultad).
- Preguntas verificables y **no dependientes de la fecha actual** ("¿quién es el actual…?" está prohibido). Evita ambigüedad y respuestas múltiples correctas.
- Marca `verified:false` a todo lo generado por IA hasta que una persona lo revise; no inventes fuentes.
- Registra atribuciones en `CREDITS.md` (sonidos CC-BY, Open Trivia DB CC BY-SA 4.0, etc.).
- **Propiedad intelectual:** no copies logos, textos, imágenes, audios ni vídeos de BuzzAttack/Fever ni de programas de TV. Usa nombres genéricos propios y material propio o con licencia libre. No versiones en git material con copyright (`content/media/` en `.gitignore` salvo recursos libres).
- Modo "gamberro": opt-in explícito (+18), sin contenido que degrade a colectivos protegidos.

---

## 11. Git y flujo de trabajo

- Rama por tarea: `feat/<área>-<descripción>`, `fix/…`, `chore/…`.
- **Commits convencionales** (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`), en imperativo, un cambio lógico por commit, mensaje que explique el porqué.
- No hagas `push --force` sobre ramas compartidas ni reescribas historia publicada. No hagas commit de `node_modules`, builds ni `.env`.
- PR/resumen final: qué cambia, por qué, cómo se probó (comandos ejecutados y resultado), riesgos y pasos pendientes. Enlaza la sección de `instructions.md` implementada.
- Actualiza **README, `DECISIONS.md` y `instructions.md`** si tus cambios alteran el comportamiento o las decisiones documentadas.

---

## 12. Cómo abordar una tarea (checklist)

1. Localiza la fase y sección en `instructions.md`; confirma el criterio de aceptación.
2. Lee el código y tests relacionados; identifica el punto de cambio mínimo.
3. Escribe o ajusta primero los **tests** (lógica pura primero).
4. Implementa en pequeño; ejecuta tests tras cada paso.
5. Revisa el *diff* completo como si fuera de otra persona: nombres, casos límite, errores, accesibilidad, seguridad.
6. Ejecuta `pnpm typecheck && pnpm lint && pnpm test` (+ e2e/validate si procede).
7. Actualiza docs y `DECISIONS.md`.
8. Resume: qué hiciste, qué verificaste, qué queda y cualquier duda abierta.

### Casos límite que siempre debes considerar en juego en tiempo real
- Respuesta duplicada, tardía o de un jugador desconectado.
- Dos respuestas en el mismo milisegundo.
- Equipo con 1, 2 o 3 jugadores; equipo vacío por desconexión.
- Número de equipos impar (alianzas en Tres en raya), 1 solo equipo, 12 jugadores.
- Pausa en mitad de pregunta o de giro de ruleta; reanudación sin perder tiempo restante.
- Puntuaciones que podrían quedar negativas (suelo en 0).
- Pool de preguntas insuficiente para una categoría (rellenar sin repetir y avisar).
- Recarga del navegador del host (restaurar estado desde el servidor).

---

## 13. Qué NO hacer

- No puntuar, sortear la ruleta ni validar tiempos en el cliente.
- No añadir librerías pesadas para problemas triviales.
- No dejar claves, URLs privadas ni datos personales en código o logs.
- No desactivar linters, reglas de TypeScript ni tests para "avanzar".
- No cambiar el contrato de eventos sin actualizar `packages/shared`, ambos lados y los tests.
- No introducir luces estroboscópicas ni animaciones que ignoren `prefers-reduced-motion`.
- No usar el nombre, la marca ni los assets de BuzzAttack/Fever.
- No dar por buena una pregunta generada por IA sin revisión.
- No hacer refactors masivos no solicitados mezclados con una funcionalidad.

---

## 14. Definición de "hecho" (Definition of Done)

- [ ] Cumple el criterio de aceptación de la fase en `instructions.md`.
- [ ] Tests nuevos/actualizados; `typecheck`, `lint`, `test` (y `e2e`/`validate:content` si aplican) en verde.
- [ ] Sin `any`, sin código muerto, sin secretos, sin `console.log` de depuración.
- [ ] Accesibilidad y `prefers-reduced-motion` comprobados en lo que toca la UI.
- [ ] Configurable lo que era [ASUNCIÓN]; textos en i18n.
- [ ] Documentación y `DECISIONS.md` al día.
- [ ] Resumen final honesto con lo verificado y lo pendiente.

---

*Este archivo es documentación viva: si descubres una práctica que habría evitado un error, añádela aquí. En un monorepo se pueden añadir `AGENTS.md` anidados en `apps/server`, `apps/web` o `packages/shared`; el más cercano al archivo editado tiene prioridad.*
