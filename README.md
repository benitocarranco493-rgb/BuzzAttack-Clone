# Buzz Home

> Game show multijugador para jugar en el salón de casa, inspirado en la experiencia
> presencial de BuzzAttack (Fever, Madrid) **sin usar su marca ni sus assets**.
> Documento técnico completo: [`instructions.md`](./instructions.md).

Una **pantalla principal (Host)** hace de plató (preguntas, marcador, ruleta y narrador IA)
y cada jugador usa su **móvil como podio**. 2–12 jugadores, red local (LAN), sin cuentas.

---

## Estado del proyecto

- ✅ **Fase 0 (andamiaje):** monorepo pnpm, TypeScript estricto, ESLint/Prettier, Vitest,
  `packages/shared` (tipos + Zod + contrato de eventos), servidor Fastify + Socket.IO con
  `/api/health`, cliente Vite + React mínimo, Docker, CI, `validate:content`.
- ⏳ **Fase 1 (salas y lobby):** siguiente.

## Requisitos

- Node.js ≥ 24 (`.nvmrc`) y **pnpm** 12 (`corepack enable`).
- Para jugar desde móviles: mismos PC y móviles en la misma Wi-Fi (sin "aislamiento de clientes")
  y puerto 3000 abierto en el firewall.

## Comandos

```bash
pnpm install         # instalar dependencias
pnpm dev             # servidor (3000) + web (Vite, --host)
pnpm build           # typecheck + build web (estáticos)
pnpm typecheck       # tsc --noEmit en todos los paquetes + scripts
pnpm lint            # ESLint + Prettier --check
pnpm test            # Vitest (unidad)
pnpm validate:content # valida preguntas y configuración con Zod
pnpm --filter @buzz/server test
```

## Estructura

```
apps/server/       Servidor autoritativo: Fastify + Socket.IO + motor de rondas (fases 1+)
apps/web/          Cliente: Host (/host) y móviles (/play), Vite + React
packages/shared/   Tipos TS, esquemas Zod y contrato de eventos (clientes + servidor)
content/           Preguntas y configuración por datos (se crea en la Fase 6)
scripts/           validate-content.ts (y generador de preguntas en v1.1)
```

## Despliegue casero (Docker)

```bash
cp .env.example .env
docker compose up -d --build
# Abre http://<IP-del-PC>:3000/
```

La imagen contiene API, WebSocket y los estáticos del cliente. El servidor autodetecta la IP
local para el QR de la sala (Fase 1). Para jugar con amigos remotos: Cloudflare Tunnel o ngrok
(con HTTPS se habilita además el Screen Wake Lock).

## Arquitectura (reglas que no se rompen)

1. **Servidor autoritativo:** solo el servidor puntúa, valida tiempos y decide el resultado de la ruleta.
2. **Reloj del servidor:** se puntúa con `receivedAtServerMs`; `clientTs` es solo telemetría.
3. **Lógica de juego pura y testeable** en `scoring.ts`, `wheel.ts` y módulos de ronda.
4. **Contratos en `packages/shared`** con Zod; todo payload entrante se valida en el servidor.
5. **Máquina de estados explícita** para las fases de partida (Fase 2, XState o reducer propio).

## Decisiones y notas

- Decisiones tomadas (incluidas las alternativas descartadas): [`DECISIONS.md`](./DECISIONS.md).
- Atribuciones de contenido con licencia: [`CREDITS.md`](./CREDITS.md) (pendiente de contenido).
- Este proyecto es **personal y no comercial**, sin afiliación con Fever ni BuzzAttack.
