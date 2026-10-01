import { createApp } from './app.js';
import { config } from '@vetvision/config';
import { logger } from './logger.js';

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info(`🚀 VetVision AI API server running on port ${config.PORT} [${config.NODE_ENV}]`);
  logger.info(`👉 API Health Endpoint: http://localhost:${config.PORT}/api/v1/health`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Initiating graceful shutdown...');
  server.close(() => {
    logger.info('Server closed gracefully');
    process.exit(0);
  });
});
