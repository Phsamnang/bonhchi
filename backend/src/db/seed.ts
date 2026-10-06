import { pool } from './index.js';
import { logger } from '../lib/logger.js';

export async function seedDatabase() {
  const client = await pool.connect();
  try {
    logger.info('🌱 Starting database seed...');
    await client.query('BEGIN');

    // 1. Wallets
    await client.query(`
      INSERT INTO wallets (code, name_km, name_en, type, category, opening_usd, opening_khr, current_usd, current_khr) VALUES
        ('drawer', 'ថតលុយ', 'Cash drawer', 'cash_drawer', 'cash', 186.00, 420000, 186.00, 420000),
        ('petty', 'លុយចាយប្រចាំថ្ងៃ', 'Petty cash', 'petty_cash', 'cash', 40.00, 95000, 40.00, 95000),
        ('aba', 'ABA', 'ABA Bank', 'bank', 'bank', 1240.55, 2450000, 1240.55, 2450000),
        ('bakong', 'បាគង KHQR', 'Bakong / KHQR', 'bank', 'bank', 350.00, 850000, 350.00, 850000),
        ('mgr', 'លុយអ្នកគ្រប់គ្រង', 'Manager advance', 'manager_advance', 'advance', 0.00, 0, 0.00, 0)
      ON CONFLICT (code) DO NOTHING;
    `);

    // 2. Categories
    await client.query(`
      INSERT INTO categories (name_km, name_en, type, icon) VALUES
        ('គ្រឿងផ្សំ', 'Ingredients', 'expense', 'cart'),
        ('ទឹកកក', 'Ice', 'expense', 'ice'),
        ('ហ្គាស', 'Gas', 'expense', 'flame'),
        ('បុគ្គលិក', 'Staff', 'expense', 'user'),
        ('ជួសជុល', 'Repairs', 'expense', 'wrench'),
        ('ចំណូលលក់', 'Sales Income', 'income', 'income')
      ON CONFLICT DO NOTHING;
    `);

    // 3. Suppliers
    await client.query(`
      INSERT INTO suppliers (name, market_location, contact_phone) VALUES
        ('ហាងសាច់ ផ្សារថ្មី', 'ផ្សារថ្មី', '012 345 678'),
        ('ហាងអង្ករ មីងស្រី', 'ផ្សារថ្មី', '098 765 432'),
        ('ហាងបន្លែ ផ្សារដើមគរ', 'ផ្សារដើមគរ', '011 223 344'),
        ('ហាងគ្រឿងទេស បងណារី', 'ផ្សារថ្មី', '077 889 900'),
        ('ហាងទឹកកក សុខលី', 'ផ្សារថ្មី', '015 667 788'),
        ('ហាងភេសជ្ជៈ ដារ៉ា', 'ផ្សារថ្មី', '089 112 233')
      ON CONFLICT DO NOTHING;
    `);

    // 4. Products
    await client.query(`
      INSERT INTO products (name, default_unit, default_currency, default_unit_price) VALUES
        ('ប្រេងឆា', 'ដប', 'USD', 6.00),
        ('បន្លែស្រស់', 'គីឡូ', 'KHR', 3000),
        ('ស៊ុតមាន់', 'គ្រាប់', 'KHR', 500),
        ('ទឹកត្រី', 'ដប', 'USD', 1.25),
        ('សាច់ជ្រូក', 'គីឡូ', 'USD', 4.75),
        ('សាច់មាន់', 'គីឡូ', 'USD', 3.50)
      ON CONFLICT DO NOTHING;
    `);

    // 5. Default Users (Password: bonchi2026)
    await client.query(`
      INSERT INTO users (username, name, phone, password_hash, role) VALUES
        ('owner', 'Lok Bong (Owner)', '012999001', '$2b$10$fnTYczk0J.r5vwincO8sVucm5rv9TGsUioW2MzNgrK1sbBju1uCfW', 'owner'),
        ('manager', 'Sokha (Manager)', '012999002', '$2b$10$fnTYczk0J.r5vwincO8sVucm5rv9TGsUioW2MzNgrK1sbBju1uCfW', 'manager'),
        ('staff', 'Srey Mom (Staff)', '012999003', '$2b$10$fnTYczk0J.r5vwincO8sVucm5rv9TGsUioW2MzNgrK1sbBju1uCfW', 'staff')
      ON CONFLICT (username) DO NOTHING;
    `);

    await client.query('COMMIT');
    logger.info('✅ Database seeded successfully!');
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error('❌ Failed seeding database:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
