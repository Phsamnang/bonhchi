import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function setupDatabase() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/bonchi_db';
  console.log(`🔌 Connecting to local PostgreSQL at: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log('✅ Connected to local PostgreSQL successfully.');

    const sqlPath = path.resolve(process.cwd(), '../database/init.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Cannot find init.sql at ${sqlPath}`);
    }

    console.log(`📜 Reading schema from: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('⚙️ Executing database initialization (tables, roles, RLS policies, seed data)...');
    await client.query(sql);

    console.log('🎉 Local PostgreSQL database initialized successfully for Bonchi RMS & PostgREST!');
  } catch (err: any) {
    console.error('❌ Database setup error:', err.message);
    console.error('\nTips for Local PostgreSQL:');
    console.error('1. Make sure your local PostgreSQL service is started (e.g. via Windows Services or pgAdmin).');
    console.error('2. Ensure the database "bonchi_db" exists, or create it via: createdb bonchi_db');
    console.error('3. Verify credentials in backend/.env: DATABASE_URL=postgresql://<user>:<password>@localhost:5432/bonchi_db');
  } finally {
    await client.end();
  }
}

setupDatabase();
