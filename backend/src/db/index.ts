import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../lib/config.js';
import * as schema from './schema/index.js';
import { logger } from '../lib/logger.js';

const { Pool, types } = pg;

// Parse DATE (OID 1082) as YYYY-MM-DD string to avoid unexpected local/UTC date offset
types.setTypeParser(1082, (val: string) => val);

const isProduction = process.env.NODE_ENV === 'production';
const hasSslInUrl = config.databaseUrl.includes('sslmode=require') || config.databaseUrl.includes('ssl=true');
const isLocalhost = config.databaseUrl.includes('localhost') || config.databaseUrl.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: (hasSslInUrl || (isProduction && !isLocalhost)) ? { rejectUnauthorized: false } : undefined,
  options: '-c timezone=Asia/Phnom_Penh',
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
    const tzRes = await client.query("SELECT current_setting('timezone') as tz");
    const activeTz = tzRes.rows[0]?.tz || 'Asia/Phnom_Penh';
    client.release();
    logger.info(`✅ PostgreSQL connected successfully (Drizzle ORM active, timezone: ${activeTz})`);
    return true;
  } catch (err: any) {
    logger.warn(`⚠️ PostgreSQL connection not established: ${err.message}`);
    return false;
  }
}
