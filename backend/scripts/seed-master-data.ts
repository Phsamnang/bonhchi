/**
 * Seed suppliers and their products (master data) for testing — 50+ products per supplier.
 *
 *   npx tsx scripts/seed-master-data.ts          # add missing suppliers / products
 *   npx tsx scripts/seed-master-data.ts --clean  # remove what this script added
 *
 * Targets whatever DATABASE_URL in backend/.env points at.
 * Idempotent: suppliers are matched by name; a product is skipped when any supplier already has
 * a product with that name (one product → one supplier). Existing rows are never changed.
 * The catalog lives in scripts/data/master-catalog.ts.
 */
import 'dotenv/config';
import pg from 'pg';
import { CATALOG } from './data/master-catalog.js';

const MIN_PER_SUPPLIER = 51;

const norm = (s: string) => s.trim().toLowerCase();

function checkCatalog() {
  // The same product must not be listed under two suppliers
  const owner = new Map<string, string>();
  for (const s of CATALOG) {
    for (const [name] of s.items) {
      const prev = owner.get(norm(name));
      if (prev && prev !== s.name) throw new Error(`"${name}" is listed under both ${prev} and ${s.name}`);
      owner.set(norm(name), s.name);
    }
  }
  for (const s of CATALOG) {
    const unique = new Set(s.items.map((i) => norm(i[0])));
    if (unique.size !== s.items.length) {
      const seen = new Set<string>();
      const dups = s.items.map((i) => i[0]).filter((n) => (seen.has(norm(n)) ? true : (seen.add(norm(n)), false)));
      throw new Error(`Duplicate product names for ${s.name}: ${dups.join(', ')}`);
    }
    if (unique.size < MIN_PER_SUPPLIER) {
      throw new Error(`${s.name} has only ${unique.size} products in the catalog (need ${MIN_PER_SUPPLIER}+)`);
    }
  }
}

async function main() {
  checkCatalog();
  const host = (process.env.DATABASE_URL || '').replace(/^.*@/, '').replace(/[/?].*$/, '');
  console.log(`Database: ${host}`);

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (process.argv.includes('--clean')) {
      let products = 0;
      for (const s of CATALOG) {
        const res = await client.query(
          `DELETE FROM products p
            USING suppliers s
            WHERE p.supplier_id = s.id
              AND lower(trim(s.name)) = lower(trim($1))
              AND lower(trim(p.name)) = ANY($2::text[])
              AND NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.product_id = p.id)`,
          [s.name, s.items.map((i) => norm(i[0]))]
        );
        products += res.rowCount ?? 0;
      }
      // Catalog suppliers left with no products and no invoices (and no details someone typed in)
      const sup = await client.query(
        `DELETE FROM suppliers s
          WHERE lower(trim(s.name)) = ANY($1::text[])
            AND s.note IS NULL AND s.contact_phone IS NULL
            AND NOT EXISTS (SELECT 1 FROM products p WHERE p.supplier_id = s.id)
            AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.supplier_id = s.id)
            AND NOT EXISTS (SELECT 1 FROM invoices i WHERE lower(trim(i.supplier_name)) = lower(trim(s.name)))`,
        [CATALOG.map((c) => norm(c.name))]
      );
      await client.query('COMMIT');
      console.log(`Removed ${products} products and ${sup.rowCount} suppliers.`);
      return;
    }

    const cats = await client.query(`SELECT id, name_en FROM categories WHERE type = 'expense'`);
    const catId = new Map<string, number>(cats.rows.map((r) => [r.name_en, Number(r.id)]));

    let newSuppliers = 0;
    let newProducts = 0;
    for (const s of CATALOG) {
      const found = await client.query(
        `SELECT id FROM suppliers WHERE lower(trim(name)) = lower(trim($1)) ORDER BY id LIMIT 1`,
        [s.name]
      );
      let supplierId: number = found.rows[0]?.id;
      if (!supplierId) {
        const ins = await client.query(
          `INSERT INTO suppliers (name, market_location, is_active) VALUES ($1, $2, true) RETURNING id`,
          [s.name, s.location]
        );
        supplierId = ins.rows[0].id;
        newSuppliers += 1;
      }

      // Skip names any supplier already sells, so one product never ends up under two suppliers
      const existing = await client.query(`SELECT lower(trim(name)) AS n FROM products WHERE is_active`);
      const have = new Set<string>(existing.rows.map((r) => r.n));
      const add = s.items.filter((i) => !have.has(norm(i[0])));
      if (add.length) {
        await client.query(
          `INSERT INTO products (name, default_unit, default_currency, default_unit_price, category_id, supplier_id, is_active)
           SELECT n, u, c, p, $5::bigint, $6::bigint, true
             FROM unnest($1::text[], $2::text[], $3::text[], $4::numeric[]) AS t(n, u, c, p)`,
          [add.map((i) => i[0]), add.map((i) => i[1]), add.map((i) => i[3]), add.map((i) => i[2]),
           catId.get(s.category) ?? null, supplierId]
        );
      }
      newProducts += add.length;
    }

    await client.query('COMMIT');
    console.log(`Added ${newSuppliers} suppliers and ${newProducts} products.`);

    const summary = await client.query(
      `SELECT s.name, s.market_location, COUNT(p.id)::int AS products
         FROM suppliers s LEFT JOIN products p ON p.supplier_id = s.id AND p.is_active
        GROUP BY s.id ORDER BY s.id`
    );
    console.table(summary.rows);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
