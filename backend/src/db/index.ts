import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../lib/config.js';
import * as schema from './schema/index.js';
import { logger } from '../lib/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle database client', err);
});

export const db = drizzle(pool, { schema });

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    client.release();
    logger.info('✅ PostgreSQL connected successfully (Drizzle ORM active)');
    return true;
  } catch (err: any) {
    logger.warn(`⚠️ PostgreSQL connection not established: ${err.message}`);
    return false;
  }
}
