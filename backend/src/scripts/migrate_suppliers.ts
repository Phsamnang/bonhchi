import { pool } from '../config/db.js';

async function migrate() {
  try {
    // 1. Add supplier_id to products if not exists
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='products' AND column_name='supplier_id'
        ) THEN
          ALTER TABLE products ADD COLUMN supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    console.log('✅ Added supplier_id column to products');

    // 2. Fetch suppliers to match by name
    const { rows: shops } = await pool.query('SELECT id, name FROM suppliers');
    console.log('Found suppliers count:', shops.length);

    const meatShop = shops.find((s: any) => s.name.includes('សាច់'));
    const vegShop = shops.find((s: any) => s.name.includes('បន្លែ'));
    const groceryShop = shops.find((s: any) => s.name.includes('គ្រឿងទេស'));
    const riceShop = shops.find((s: any) => s.name.includes('អង្ករ'));
    const iceShop = shops.find((s: any) => s.name.includes('ទឹកកក'));
    const drinkShop = shops.find((s: any) => s.name.includes('ភេសជ្ជៈ'));

    if (meatShop) {
      await pool.query("UPDATE products SET supplier_id = $1 WHERE name IN ('សាច់ជ្រូក', 'សាច់មាន់')", [meatShop.id]);
    }
    if (vegShop) {
      await pool.query("UPDATE products SET supplier_id = $1 WHERE name IN ('បន្លែស្រស់')", [vegShop.id]);
    }
    if (groceryShop) {
      await pool.query("UPDATE products SET supplier_id = $1 WHERE name IN ('ប្រេងឆា', 'ទឹកត្រី', 'ស៊ុតមាន់')", [groceryShop.id]);
    }

    if (riceShop) {
      await pool.query(`
        INSERT INTO products (name, default_unit, default_currency, default_unit_price, supplier_id)
        SELECT 'អង្ករផ្កាម្លិះ', 'បាវ', 'USD', 28.00, $1
        WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'អង្ករផ្កាម្លិះ')
      `, [riceShop.id]);
      await pool.query(`
        INSERT INTO products (name, default_unit, default_currency, default_unit_price, supplier_id)
        SELECT 'អង្ករនាងមិញ', 'គីឡូ', 'KHR', 2400, $1
        WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'អង្ករនាងមិញ')
      `, [riceShop.id]);
    }

    if (iceShop) {
      await pool.query(`
        INSERT INTO products (name, default_unit, default_currency, default_unit_price, supplier_id)
        SELECT 'ទឹកកកអនាម័យ (បាវ)', 'បាវ', 'KHR', 6000, $1
        WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'ទឹកកកអនាម័យ (បាវ)')
      `, [iceShop.id]);
    }

    if (meatShop) {
      await pool.query(`
        INSERT INTO products (name, default_unit, default_currency, default_unit_price, supplier_id)
        SELECT 'ឆ្អឹងជំនីរជ្រូក', 'គីឡូ', 'USD', 5.50, $1
        WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'ឆ្អឹងជំនីរជ្រូក')
      `, [meatShop.id]);
    }

    if (vegShop) {
      await pool.query(`
        INSERT INTO products (name, default_unit, default_currency, default_unit_price, supplier_id)
        SELECT 'ការ៉ុត & ដំឡូងបារាំង', 'គីឡូ', 'KHR', 4500, $1
        WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'ការ៉ុត & ដំឡូងបារាំង')
      `, [vegShop.id]);
      await pool.query(`
        INSERT INTO products (name, default_unit, default_currency, default_unit_price, supplier_id)
        SELECT 'ខ្ទឹមបារាំង', 'គីឡូ', 'KHR', 3500, $1
        WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'ខ្ទឹមបារាំង')
      `, [vegShop.id]);
    }

    if (drinkShop) {
      await pool.query(`
        INSERT INTO products (name, default_unit, default_currency, default_unit_price, supplier_id)
        SELECT 'ទឹកក្រូច កូកាកូឡា (កេស)', 'កេស', 'USD', 12.50, $1
        WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'ទឹកក្រូច កូកាកូឡា (កេស)')
      `, [drinkShop.id]);
      await pool.query(`
        INSERT INTO products (name, default_unit, default_currency, default_unit_price, supplier_id)
        SELECT 'ទឹកសុទ្ធ វីតាឡាល់ (កេស)', 'កេស', 'USD', 4.00, $1
        WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'ទឹកសុទ្ធ វីតាឡាល់ (កេស)')
      `, [drinkShop.id]);
    }

    console.log('✅ Products linked to suppliers successfully');
    process.exit(0);
  } catch (e) {
    console.error('Migration error:', e);
    process.exit(1);
  }
}

migrate();
