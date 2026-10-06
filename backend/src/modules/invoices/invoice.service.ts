import { invoiceRepository } from './invoice.repository.js';
import { pool } from '../../db/index.js';

export interface MarketTripItemPayload {
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  currency: 'USD' | 'KHR';
  is_paid?: boolean;
}

export interface MarketTripShopPayload {
  supplier_id?: number | string;
  supplier_name: string;
  wallet_id?: number | string;
  receipt_url?: string;
  items: MarketTripItemPayload[];
}

export interface MarketTripPayload {
  trip_date: string;
  wallet_id: string | number;
  is_paid?: boolean;
  shops: MarketTripShopPayload[];
}

export interface SmallExpensePayload {
  date: string;
  amount: number;
  currency: 'USD' | 'KHR';
  category_name: string;
  wallet_code?: string;
  receipt_url?: string;
}

export class InvoiceService {
  async getInvoices(filter?: { status?: string; type?: string; supplier?: string }) {
    const rows = await invoiceRepository.findAll(filter);
    return {
      total: rows.length,
      invoices: rows,
    };
  }

  async getInvoiceById(id: string | number) {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    return invoice;
  }

  async recordMarketTrip(body: MarketTripPayload, userId?: number) {
    if (!body.shops || !body.shops.length) {
      throw new Error('At least one shop with items is required');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const walletCache = new Map<string, any>();
      const resolveWallet = async (ref: string | number | undefined) => {
        if (!ref) return null;
        const key = String(ref);
        if (walletCache.has(key)) return walletCache.get(key);
        const walletRes = await client.query(
          'SELECT id, code, name_km FROM wallets WHERE id::text = $1 OR code = $1 FOR UPDATE',
          [key]
        );
        const wallet = walletRes.rows[0];
        if (wallet) walletCache.set(key, wallet);
        return wallet || null;
      };

      const createdInvoices = [];
      const deductions = new Map<string, { usd: number; khr: number }>();

      for (const shop of body.shops) {
        if (!shop.items || !shop.items.length) continue;

        const wallet = await resolveWallet(shop.wallet_id || body.wallet_id);
        const walletCode = wallet ? wallet.code : null;

        let totalUsd = 0;
        let totalKhr = 0;
        let shopPaidUsd = 0;
        let shopPaidKhr = 0;

        for (const it of shop.items) {
          const lineTotal = Number(it.quantity) * Number(it.unit_price);
          // Default unpaid (false) when is_paid is not specified
          const isItemPaid = it.is_paid !== undefined ? Boolean(it.is_paid) : (body.is_paid !== undefined ? Boolean(body.is_paid) : false);

          if (it.currency === 'USD') {
            totalUsd += lineTotal;
            if (isItemPaid) shopPaidUsd += lineTotal;
          } else {
            totalKhr += lineTotal;
            if (isItemPaid) shopPaidKhr += lineTotal;
          }
        }

        let invoiceStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
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
          `INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_name, category_name, wallet_code, total_usd, total_khr, paid_usd, paid_khr, status, receipt_url, created_by)
           VALUES ($1, $2, CURRENT_TIME, 'expense', 'product', $3, 'គ្រឿងផ្សំ', $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING *`,
          [
            invNo,
            body.trip_date || new Date().toISOString().split('T')[0],
            shop.supplier_name,
            walletCode,
            totalUsd,
            totalKhr,
            shopPaidUsd,
            shopPaidKhr,
            invoiceStatus,
            shop.receipt_url || null,
            userId || null,
          ]
        );
        const newInvoice = invRes.rows[0];

        for (const it of shop.items) {
          const lineTotal = Number(it.quantity) * Number(it.unit_price);
          const isItemPaid = it.is_paid !== undefined ? Boolean(it.is_paid) : (body.is_paid !== undefined ? Boolean(body.is_paid) : false);

          await client.query(
            `INSERT INTO invoice_items (invoice_id, item_name, quantity, unit, unit_price, currency, line_total, is_paid)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [newInvoice.id, it.product_name, it.quantity, it.unit, it.unit_price, it.currency, lineTotal, isItemPaid]
          );
        }

        if (wallet && (shopPaidUsd > 0 || shopPaidKhr > 0)) {
          const d = deductions.get(String(wallet.id)) || { usd: 0, khr: 0 };
          d.usd += shopPaidUsd;
          d.khr += shopPaidKhr;
          deductions.set(String(wallet.id), d);
        }

        createdInvoices.push(newInvoice);
      }

      // Deduct balance for paid portion only
      for (const [walletId, d] of deductions) {
        if (d.usd <= 0 && d.khr <= 0) continue;
        await client.query(
          'UPDATE wallets SET current_usd = GREATEST(0, current_usd - $1), current_khr = GREATEST(0, current_khr - $2) WHERE id::text = $3',
          [d.usd, d.khr, walletId]
        );
      }

      await client.query('COMMIT');
      return {
        success: true,
        invoices_created: createdInvoices.length,
        invoices: createdInvoices,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async recordSmallExpense(body: SmallExpensePayload, userId?: number) {
    if (!body.amount || !body.category_name) {
      throw new Error('Amount and category are required');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const walletRes = await client.query(
        'SELECT id, code, name_km, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE code = $1 FOR UPDATE',
        [body.wallet_code || 'petty']
      );
      const wallet = walletRes.rows[0];
      if (!wallet) throw new Error('Wallet not found');

      const isUSD = body.currency === 'USD';
      const totalUsd = isUSD ? body.amount : 0;
      const totalKhr = isUSD ? 0 : body.amount;
      const invNo = `#${Math.floor(1000 + Math.random() * 9000)}`;

      const insertRes = await client.query(
        `INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_name, category_name, wallet_code, total_usd, total_khr, paid_usd, paid_khr, status, receipt_url, created_by)
         VALUES ($1, $2, CURRENT_TIME, 'expense', 'small', $3, $4, $5, $6, $7, $8, $9, 'paid', $10, $11)
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
          body.receipt_url || null,
          userId || null,
        ]
      );
      const newInvoice = insertRes.rows[0];

      if (isUSD) {
        await client.query('UPDATE wallets SET current_usd = GREATEST(0, current_usd - $1) WHERE id = $2', [body.amount, wallet.id]);
      } else {
        await client.query('UPDATE wallets SET current_khr = GREATEST(0, current_khr - $1) WHERE id = $2', [body.amount, wallet.id]);
      }

      await client.query('COMMIT');
      return { success: true, invoice: newInvoice };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async voidInvoice(id: string | number, reason: string, userId?: number) {
    if (!reason || !reason.trim()) {
      throw new Error('Void reason is mandatory');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const invRes = await client.query(
        'SELECT * FROM invoices WHERE id::text = $1 OR invoice_no = $1 FOR UPDATE',
        [id]
      );
      if (!invRes.rows.length) throw new Error('Invoice not found');
      const invoice = invRes.rows[0];

      if (invoice.status === 'void') throw new Error('Invoice is already voided');

      // Refund wallet for paid amounts
      if (invoice.paid_usd > 0 || invoice.paid_khr > 0) {
        await client.query(
          'UPDATE wallets SET current_usd = current_usd + $1, current_khr = current_khr + $2 WHERE code = $3',
          [Number(invoice.paid_usd) || 0, Number(invoice.paid_khr) || 0, invoice.wallet_code]
        );
      }

      const updateRes = await client.query(
        `UPDATE invoices 
         SET status = 'void', void_reason = $1, voided_by = $2, voided_at = NOW(), updated_at = NOW() 
         WHERE id = $3 RETURNING *`,
        [reason, userId || null, invoice.id]
      );

      await client.query('COMMIT');
      return { success: true, invoice: updateRes.rows[0] };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async toggleItemPaid(invoiceId: string | number, itemId: string | number) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const itemRes = await client.query(
        'SELECT * FROM invoice_items WHERE id = $1 AND invoice_id::text = (SELECT id::text FROM invoices WHERE id::text = $2 OR invoice_no = $2) FOR UPDATE',
        [itemId, invoiceId]
      );
      if (!itemRes.rows.length) throw new Error('Invoice item not found');
      const item = itemRes.rows[0];

      const newIsPaid = !item.is_paid;
      await client.query('UPDATE invoice_items SET is_paid = $1 WHERE id = $2', [newIsPaid, item.id]);

      // Recalculate invoice totals and status
      const itemsRes = await client.query(
        'SELECT line_total, currency, is_paid FROM invoice_items WHERE invoice_id = $1',
        [item.invoice_id]
      );

      let paidUsd = 0;
      let paidKhr = 0;
      let totalUsd = 0;
      let totalKhr = 0;

      for (const row of itemsRes.rows) {
        const line = Number(row.line_total) || 0;
        if (row.currency === 'USD') {
          totalUsd += line;
          if (row.is_paid) paidUsd += line;
        } else {
          totalKhr += line;
          if (row.is_paid) paidKhr += line;
        }
      }

      let status = 'unpaid';
      const hasUnpaid = paidUsd < totalUsd || paidKhr < totalKhr;
      const hasPaid = paidUsd > 0 || paidKhr > 0;

      if (!hasPaid) status = 'unpaid';
      else if (hasUnpaid) status = 'partial';
      else status = 'paid';

      const updateRes = await client.query(
        `UPDATE invoices 
         SET paid_usd = $1, paid_khr = $2, status = $3, updated_at = NOW() 
         WHERE id = $4 RETURNING *`,
        [paidUsd, paidKhr, status, item.invoice_id]
      );

      await client.query('COMMIT');
      return { success: true, item: { ...item, is_paid: newIsPaid }, invoice: updateRes.rows[0] };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async payInvoice(id: string | number, walletRef: string | number, userId?: number) {
    if (!walletRef) {
      throw new Error('Wallet must be selected to make payment');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const invRes = await client.query(
        'SELECT * FROM invoices WHERE id::text = $1 OR invoice_no = $1 FOR UPDATE',
        [id]
      );
      if (!invRes.rows.length) throw new Error('Invoice not found');
      const invoice = invRes.rows[0];

      if (invoice.status === 'paid') {
        throw new Error('Invoice is already fully paid');
      }
      if (invoice.status === 'void') {
        throw new Error('Cannot pay a voided invoice');
      }

      // Find and lock target wallet to deduct from
      const walletRes = await client.query(
        'SELECT id, code, name_km, category, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE id::text = $1 OR code = $1 FOR UPDATE',
        [walletRef]
      );
      if (!walletRes.rows.length) throw new Error(`Wallet '${walletRef}' not found`);
      const wallet = walletRes.rows[0];

      const totalUsd = Number(invoice.total_usd) || 0;
      const totalKhr = Number(invoice.total_khr) || 0;
      const currentPaidUsd = Number(invoice.paid_usd) || 0;
      const currentPaidKhr = Number(invoice.paid_khr) || 0;

      const toPayUsd = Math.max(0, totalUsd - currentPaidUsd);
      const toPayKhr = Math.max(0, totalKhr - currentPaidKhr);

      // Deduct balance from chosen wallet
      await client.query(
        'UPDATE wallets SET current_usd = GREATEST(0, current_usd - $1), current_khr = GREATEST(0, current_khr - $2) WHERE id = $3',
        [toPayUsd, toPayKhr, wallet.id]
      );

      // Record in invoice_payments
      if (toPayUsd > 0) {
        await client.query(
          `INSERT INTO invoice_payments (invoice_id, wallet_id, amount, currency, method, created_by)
           VALUES ($1, $2, $3, 'USD', $4, $5)`,
          [invoice.id, wallet.id, toPayUsd, wallet.category === 'bank' ? 'bank_transfer' : 'cash', userId || null]
        );
      }
      if (toPayKhr > 0) {
        await client.query(
          `INSERT INTO invoice_payments (invoice_id, wallet_id, amount, currency, method, created_by)
           VALUES ($1, $2, $3, 'KHR', $4, $5)`,
          [invoice.id, wallet.id, toPayKhr, wallet.category === 'bank' ? 'bank_transfer' : 'cash', userId || null]
        );
      }

      // Mark all line items as paid
      await client.query(
        'UPDATE invoice_items SET is_paid = true WHERE invoice_id = $1',
        [invoice.id]
      );

      // Update invoice to paid status with chosen wallet_code
      const updatedInvRes = await client.query(
        `UPDATE invoices
         SET status = 'paid',
             paid_usd = total_usd,
             paid_khr = total_khr,
             wallet_code = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [wallet.code, invoice.id]
      );

      await client.query('COMMIT');
      return {
        success: true,
        message: `Invoice #${invoice.invoice_no} marked as paid from wallet ${wallet.name_km}`,
        invoice: updatedInvRes.rows[0],
        wallet: {
          id: wallet.id,
          code: wallet.code,
          name_km: wallet.name_km,
        },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export const invoiceService = new InvoiceService();
