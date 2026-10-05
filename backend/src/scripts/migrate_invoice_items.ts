import { pool } from '../config/db.js';

async function migrateInvoiceItems() {
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'invoice_items' AND column_name = 'is_paid'
        ) THEN
          ALTER TABLE invoice_items ADD COLUMN is_paid BOOLEAN NOT NULL DEFAULT true;
        END IF;
      END $$;
    `);
    console.log('✅ Added is_paid column to invoice_items');
    process.exit(0);
  } catch (err: any) {
    console.error('Error migrating invoice_items:', err);
    process.exit(1);
  }
}

migrateInvoiceItems();
