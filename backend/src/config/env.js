import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_PATH: z.string().default('./mini_asm.db'),
  AUTO_MIGRATE: z.coerce.boolean().default(true),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
});

export const env = schema.parse(process.env);
