import { APP_NAME } from '@buzz/shared';

import { buildApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const { app } = await buildApp();

const shutdown = (signal: NodeJS.Signals): void => {
  app.log.info({ signal }, 'shutting down');
  void app.close().then(() => process.exit(0));
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

try {
  await app.listen({ port, host });
  app.log.info(`Servidor de ${APP_NAME} escuchando en http://${host}:${port}/`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
