import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../lib/config.js';
import * as schema from './schema/index.js';
import { logger } from '../lib/logger.js';

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';
const hasSslInUrl = config.databaseUrl.includes('sslmode=require') || config.databaseUrl.includes('ssl=true');
const isLocalhost = config.databaseUrl.includes('localhost') || config.databaseUrl.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: (hasSslInUrl || (isProduction && !isLocalhost)) ? { rejectUnauthorized: false } : undefined,
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
