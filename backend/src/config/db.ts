import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/bonchi_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

let isConnected = false;

// Attempt initial connection test
pool.connect()
  .then(client => {
    isConnected = true;
    console.log('✅ PostgreSQL Database connected successfully (PostgREST-compatible).');
    client.release();
  })
  .catch(err => {
    isConnected = false;
    console.warn(`⚠️ PostgreSQL connection not established: ${err.message}.`);
    console.warn('ℹ️ Running in hybrid mode: Local mock state active for endpoints until PostgreSQL is online.');
  });

export const query = async (text: string, params?: any[]) => {
  if (!isConnected) {
    throw new Error('Database is offline. Using fallback data.');
  }
  return pool.query(text, params);
};

export const isDbConnected = () => isConnected;
