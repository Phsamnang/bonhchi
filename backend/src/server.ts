// Set process-wide timezone before imports
process.env.TZ = 'Asia/Phnom_Penh';

import { createApp } from './app.js';
import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { testConnection } from './db/index.js';
import { getPhnomPenhDateTime } from './lib/timezone.js';

const app = createApp();

async function startServer() {
  await testConnection();

  app.listen(config.port, () => {
    logger.info(`🚀 Bonchi API Server running at http://localhost:${config.port}`);
    logger.info(`📡 API endpoints mounted at http://localhost:${config.port}/api/v1`);
    logger.info(`🕒 Timezone: Asia/Phnom_Penh (Current time: ${getPhnomPenhDateTime()})`);
  });
}

startServer().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
