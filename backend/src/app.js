import express from 'express';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import pinoHttp from 'pino-http';
import logger from './config/logger.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/error.js';
import router from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(express.json());
  app.use(corsMiddleware);

  // Serve frontend static files
  app.use(express.static(path.join(__dirname, '../../frontend')));

  app.use('/', router);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/ready', (_req, res) => res.json({ status: 'ok' }));

  app.use(errorHandler);

  return app;
}
