import { Router, Request, Response } from 'express';
import { pool } from '../../db/index.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();

router.post('/import-excel', requireRole(['owner', 'manager']), async (req: Request, res: Response) => {
  const { rows } = req.body;

  if (!rows || !Array.isArray(rows) || !rows.length) {
    return res.status(400).json({
      error: 'Payload must include an array of rows from Excel file',
      format_hint: 'rows: [{ date, vendor, item_name, quantity, unit, unit_price, currency, paid_from }]',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let invoicesCreated = 0;
    let suppliersCreated = 0;
    let productsCreated = 0;
    const errors: string[] = [];

    for (const r of rows) {
      if (!r.vendor || !r.item_name || !r.quantity || !r.unit_price) {
        errors.push(`Row skipped due to missing fields: ${JSON.stringify(r)}`);
        continue;
      }

      let supRes = await client.query('SELECT id FROM suppliers WHERE name = $1', [r.vendor]);
      let supplierId = supRes.rows[0]?.id;
      if (!supplierId) {
        const newSup = await client.query('INSERT INTO suppliers (name) VALUES ($1) RETURNING id', [r.vendor]);
        supplierId = newSup.rows[0].id;
        suppliersCreated++;
      }

      let prodRes = await client.query('SELECT id FROM products WHERE name = $1', [r.item_name]);
      let productId = prodRes.rows[0]?.id;
      if (!productId) {
        const catRes = await client.query("SELECT id FROM categories WHERE type = 'expense' LIMIT 1");
        const catId = catRes.rows[0]?.id || 1;
        const newProd = await client.query(
          'INSERT INTO products (name, default_unit, default_currency, default_unit_price, category_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [r.item_name, r.unit || 'គីឡូ', r.currency || 'USD', r.unit_price, catId]
        );
        productId = newProd.rows[0].id;
        productsCreated++;
      }

      const isUSD = (r.currency || 'USD').toUpperCase() === 'USD';
      const lineTotal = Number(r.quantity) * Number(r.unit_price);
      const totalUsd = isUSD ? lineTotal : 0;
      const totalKhr = isUSD ? 0 : lineTotal;
      const invNo = `#${Math.floor(1000 + Math.random() * 9000)}`;
      const walletCode = r.paid_from || 'petty';

      const invRes = await client.query(
        `INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_id, supplier_name, wallet_code, total_usd, total_khr, paid_usd, paid_khr, status)
         VALUES ($1, $2, CURRENT_TIME, 'expense', 'product', $3, $4, $5, $6, $7, $8, $9, 'paid')
         RETURNING id`,
        [invNo, r.date || new Date().toISOString().split('T')[0], supplierId, r.vendor, walletCode, totalUsd, totalKhr, totalUsd, totalKhr]
      );
      const invId = invRes.rows[0].id;

      await client.query(
        `INSERT INTO invoice_items (invoice_id, product_id, item_name, quantity, unit, unit_price, currency, line_total, is_paid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
        [invId, productId, r.item_name, r.quantity, r.unit || 'គីឡូ', r.unit_price, isUSD ? 'USD' : 'KHR', lineTotal]
      );

      invoicesCreated++;
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      imported_rows: rows.length,
      invoices_created: invoicesCreated,
      suppliers_created: suppliersCreated,
      products_created: productsCreated,
      unresolved_errors: errors,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Excel import failed', message: err.message });
  } finally {
    client.release();
  }
});

export default router;
