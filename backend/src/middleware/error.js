import logger from '../config/logger.js';

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';

  if (status >= 500) {
    logger.error({ err }, 'Unhandled error');
  }

  res.status(status).json({
    error: {
      code,
      message: err.message || 'Internal server error',
      details: err.details || {},
    },
  });
}
