import 'dotenv/config';
import { createApp } from './src/app.js';
import { env } from './src/config/env.js';
import logger from './src/config/logger.js';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Server started');
});
