import { Router, Request, Response } from 'express';
import { pool } from '../config/db.js';
import { MarketTripPayload, SmallExpensePayload } from '../types/index.js';

const router = Router();

// 1. Get all invoices with filtering from PostgreSQL
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, type, supplier } = req.query;
    let sql = `
      SELECT 
        id,
        invoice_no,
        invoice_date as date,
        invoice_time as time,
        type,
        expense_kind,
        supplier_name,
        category_name as category,
        wallet_code,
        CAST(total_usd AS FLOAT) as total_usd,
        CAST(total_khr AS BIGINT) as total_khr,
        CAST(paid_usd AS FLOAT) as paid_usd,
        CAST(paid_khr AS BIGINT) as paid_khr,
        status,
        void_reason,
        receipt_url,
        created_at
      FROM invoices
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    if (type) {
      params.push(type);
      sql += ` AND type = $${params.length}`;
    }
    if (supplier) {
      params.push(`%${supplier}%`);
      sql += ` AND supplier_name ILIKE $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    const { rows } = await pool.query(sql, params);
    res.json({
      total: rows.length,
      invoices: rows
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error fetching invoices', message: err.message });
  }
});

// 2. Get single invoice details with items
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const invRes = await pool.query('SELECT * FROM invoices WHERE id::text = $1 OR invoice_no = $1', [req.params.id]);
    if (!invRes.rows.length) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const invoice = invRes.rows[0];

    const itemsRes = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC', [invoice.id]);
    res.json({
      ...invoice,
      items: itemsRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error fetching invoice', message: err.message });
  }
});

// 3. Batch Market Trip purchase creation with PostgreSQL transaction
router.post('/market-trip', async (req: Request, res: Response) => {
  const body = req.body as MarketTripPayload;
  if (!body.shops || !body.shops.length) {
    return res.status(400).json({ error: 'At least one shop with items is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Resolve (and lock) wallets — each shop may be paid from a different wallet
    const walletCache = new Map<string, any>();
    const resolveWallet = async (ref: string | number | undefined) => {
      const key = String(ref || body.wallet_id || 'petty');
      if (walletCache.has(key)) return walletCache.get(key);
      const walletRes = await client.query(
        'SELECT id, code, name_km FROM wallets WHERE id::text = $1 OR code = $1 FOR UPDATE',
        [key]
      );
      const wallet = walletRes.rows[0] || (await client.query("SELECT id, code, name_km FROM wallets WHERE code = 'petty' FOR UPDATE")).rows[0];
      if (!wallet) throw new Error(`Wallet not found: ${key}`);
      walletCache.set(key, wallet);
      return wallet;
    };

    const createdInvoices = [];
    // Paid totals to deduct, grouped by wallet id
    const deductions = new Map<string, { usd: number; khr: number }>();

    for (const shop of body.shops) {
      if (!shop.items || !shop.items.length) continue;

      const wallet = await resolveWallet(shop.wallet_id);

      let totalUsd = 0;
      let totalKhr = 0;
      let shopPaidUsd = 0;
      let shopPaidKhr = 0;

      for (const it of shop.items) {
        const lineTotal = Number(it.quantity) * Number(it.unit_price);
        const isItemPaid = it.is_paid !== undefined ? Boolean(it.is_paid) : (body.is_paid !== undefined ? Boolean(body.is_paid) : true);

        if (it.currency === 'USD') {
          totalUsd += lineTotal;
          if (isItemPaid) shopPaidUsd += lineTotal;
        } else {
          totalKhr += lineTotal;
          if (isItemPaid) shopPaidKhr += lineTotal;
        }
      }

      // Determine invoice status based on paid amounts
      let invoiceStatus: 'paid' | 'partial' | 'unpaid' = 'paid';
      const hasUnpaidPortion = shopPaidUsd < totalUsd || shopPaidKhr < totalKhr;
      const hasPaidPortion = shopPaidUsd > 0 || shopPaidKhr > 0;

      if (!hasPaidPortion) {
        invoiceStatus = 'unpaid';
      } else if (hasUnpaidPortion) {
        invoiceStatus = 'partial';
      } else {
        invoiceStatus = 'paid';
      }

      const invNo = `#${Math.floor(1000 + Math.random() * 9000)}`;
      const invRes = await client.query(
        `INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_name, category_name, wallet_code, total_usd, total_khr, paid_usd, paid_khr, status, receipt_url)
         VALUES ($1, $2, CURRENT_TIME, 'expense', 'product', $3, 'គ្រឿងផ្សំ', $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          invNo,
          body.trip_date || new Date().toISOString().split('T')[0],
          shop.supplier_name,
          wallet.code,
          totalUsd,
          totalKhr,
          shopPaidUsd,
          shopPaidKhr,
          invoiceStatus,
          shop.receipt_url || null
        ]
      );
      const newInvoice = invRes.rows[0];

      // Insert line items with is_paid field
      for (const it of shop.items) {
        const lineTotal = Number(it.quantity) * Number(it.unit_price);
        const isItemPaid = it.is_paid !== undefined ? Boolean(it.is_paid) : (body.is_paid !== undefined ? Boolean(body.is_paid) : true);

        await client.query(
          `INSERT INTO invoice_items (invoice_id, item_name, quantity, unit, unit_price, currency, line_total, is_paid)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [newInvoice.id, it.product_name, it.quantity, it.unit, it.unit_price, it.currency, lineTotal, isItemPaid]
        );
      }

      const d = deductions.get(String(wallet.id)) || { usd: 0, khr: 0 };
      d.usd += shopPaidUsd;
      d.khr += shopPaidKhr;
      deductions.set(String(wallet.id), d);

      createdInvoices.push(newInvoice);
    }

    // Deduct each wallet's balance for whatever was actually paid from it
    for (const [walletId, d] of deductions) {
      if (d.usd <= 0 && d.khr <= 0) continue;
      await client.query(
        'UPDATE wallets SET current_usd = GREATEST(0, current_usd - $1), current_khr = GREATEST(0, current_khr - $2) WHERE id::text = $3',
        [d.usd, d.khr, walletId]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      invoices_created: createdInvoices.length,
      invoices: createdInvoices
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Market trip recording failed', message: err.message });
  } finally {
    client.release();
  }
});

// 4. Quick small expense creation with PostgreSQL
router.post('/small-expense', async (req: Request, res: Response) => {
  const body = req.body as SmallExpensePayload;
  if (!body.amount || !body.category_name) {
    return res.status(400).json({ error: 'Amount and category are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const walletRes = await client.query(
      'SELECT id, code, name_km, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE code = $1 FOR UPDATE',
      [body.wallet_code || 'petty']
    );
    const wallet = walletRes.rows[0];

    const isUSD = body.currency === 'USD';
    const totalUsd = isUSD ? body.amount : 0;
    const totalKhr = isUSD ? 0 : body.amount;
    const invNo = `#${Math.floor(1000 + Math.random() * 9000)}`;

    const insertRes = await client.query(
      `INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_name, category_name, wallet_code, total_usd, total_khr, paid_usd, paid_khr, status, receipt_url)
       VALUES ($1, $2, CURRENT_TIME, 'expense', 'small', $3, $4, $5, $6, $7, $8, $9, 'paid', $10)
       RETURNING *`,
      [
        invNo,
        body.date || new Date().toISOString().split('T')[0],
        body.category_name,
        body.category_name,
        wallet.code,
        totalUsd,
        totalKhr,
        totalUsd,
        totalKhr,
        body.receipt_url || null
      ]
    );
    const newInvoice = insertRes.rows[0];

    // Deduct wallet balance
    if (isUSD) {
      await client.query('UPDATE wallets SET current_usd = GREATEST(0, current_usd - $1) WHERE id = $2', [totalUsd, wallet.id]);
    } else {
      await client.query('UPDATE wallets SET current_khr = GREATEST(0, current_khr - $1) WHERE id = $2', [totalKhr, wallet.id]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      invoice: newInvoice
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Small expense recording failed', message: err.message });
  } finally {
    client.release();
  }
});

// 5. Soft-void an invoice with PostgreSQL
router.post('/:id/void', async (req: Request, res: Response) => {
  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'Void reason is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invRes = await client.query(
      'SELECT * FROM invoices WHERE (id::text = $1 OR invoice_no = $1) FOR UPDATE',
      [req.params.id]
    );
    if (!invRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const invoice = invRes.rows[0];

    if (invoice.status === 'void') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invoice is already voided' });
    }

    // Mark as void
    const updateRes = await client.query(
      `UPDATE invoices 
       SET status = 'void', void_reason = $1, voided_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [reason, invoice.id]
    );
    const updatedInvoice = updateRes.rows[0];

    // Refund wallet if invoice was paid
    if (invoice.paid_usd > 0 || invoice.paid_khr > 0) {
      await client.query(
        'UPDATE wallets SET current_usd = current_usd + $1, current_khr = current_khr + $2 WHERE code = $3',
        [invoice.paid_usd, invoice.paid_khr, invoice.wallet_code]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Invoice soft-voided successfully in PostgreSQL',
      invoice: updatedInvoice
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Invoice void failed', message: err.message });
  } finally {
    client.release();
  }
});

export default router;
