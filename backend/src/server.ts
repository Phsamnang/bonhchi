import { createApp } from './app.js';
import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { testConnection } from './db/index.js';

const app = createApp();

async function startServer() {
  await testConnection();

  app.listen(config.port, () => {
    logger.info(`🚀 Bonchi API Server running at http://localhost:${config.port}`);
    logger.info(`📡 API endpoints mounted at http://localhost:${config.port}/api/v1`);
  });
}

startServer().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
