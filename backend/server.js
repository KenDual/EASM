import 'dotenv/config';
import { createApp } from './src/app.js';
import { env } from './src/config/env.js';
import logger from './src/config/logger.js';
import { getDb } from './src/db/connection.js';
import { runMigrations } from './src/db/migrate.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

async function waitForDb() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      getDb().prepare('SELECT 1').get();
      logger.info('Database connection established');
      return;
    } catch (err) {
      logger.warn({ attempt, err: err.message }, 'DB connection failed, retrying...');
      if (attempt === MAX_RETRIES) throw new Error('Cannot connect to database after retries');
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

async function start() {
  await waitForDb();

  if (env.AUTO_MIGRATE) {
    runMigrations();
  }

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'Server started');
  });
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
