import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import pinoHttp from 'pino-http';
import logger from './config/logger.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/error.js';
import { getDb } from './db/connection.js';
import router from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(express.json());
  app.use(corsMiddleware);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/ready', (_req, res) => {
    try {
      getDb().prepare('SELECT 1').get();
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  app.use('/', router);

  // Serve frontend static files — after API routes
  app.use(express.static(path.join(__dirname, '../../frontend')));

  app.use(errorHandler);

  return app;
}
