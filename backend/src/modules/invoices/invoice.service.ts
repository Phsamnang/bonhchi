import { invoiceRepository } from './invoice.repository.js';
import { pool } from '../../db/index.js';
import { getPhnomPenhDate } from '../../lib/timezone.js';

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
  wallet_id?: string | number;
  receipt_url?: string;
}

export interface MoneyInPayload {
  date?: string;
  time?: string;
  table_name?: string;
  wallet_code?: string;
  wallet_id?: string | number;
  usd_wallet_id?: string | number;
  khr_wallet_id?: string | number;
  amount_usd?: number;
  amount_khr?: number;
  source_name?: string;
  category_name?: string;
  reference_no?: string;
  note?: string;
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
            body.trip_date || getPhnomPenhDate(),
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
        const wRes = await client.query('SELECT id, currency FROM wallets WHERE id::text = $1', [walletId]);
        if (wRes.rows.length) {
          const cur = wRes.rows[0].currency;
          const amt = cur === 'USD' ? d.usd : d.khr;
          if (amt > 0) {
            await client.query(
              'UPDATE wallets SET current_balance = GREATEST(0, current_balance - $1) WHERE id = $2',
              [amt, wRes.rows[0].id]
            );
          }
        }
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

      let walletRes;
      const walletRef = body.wallet_id || body.wallet_code;
      const numId = Number(walletRef);
      if (!isNaN(numId) && numId > 0 && String(walletRef).trim().match(/^\d+$/)) {
        walletRes = await client.query(
          'SELECT id, code, name_km, category, currency, CAST(current_balance AS FLOAT) as balance FROM wallets WHERE id = $1 FOR UPDATE',
          [numId]
        );
      } else if (walletRef) {
        walletRes = await client.query(
          'SELECT id, code, name_km, category, currency, CAST(current_balance AS FLOAT) as balance FROM wallets WHERE id::text = $1 OR code = $1 FOR UPDATE',
          [String(walletRef)]
        );
      }
      if (!walletRes || !walletRes.rows.length) {
        walletRes = await client.query(
          'SELECT id, code, name_km, category, currency, CAST(current_balance AS FLOAT) as balance FROM wallets WHERE is_active = true AND currency = $1 ORDER BY (category = \'cash\') DESC, id ASC LIMIT 1 FOR UPDATE',
          [body.currency === 'USD' ? 'USD' : 'KHR']
        );
        if (!walletRes.rows.length) {
          walletRes = await client.query(
            'SELECT id, code, name_km, category, currency, CAST(current_balance AS FLOAT) as balance FROM wallets WHERE is_active = true ORDER BY (category = \'cash\') DESC, id ASC LIMIT 1 FOR UPDATE'
          );
        }
      }
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
          body.date || getPhnomPenhDate(),
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

      await client.query('UPDATE wallets SET current_balance = GREATEST(0, current_balance - $1) WHERE id = $2', [body.amount, wallet.id]);

      await client.query('COMMIT');
      return { success: true, invoice: newInvoice };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async recordIncome(body: MoneyInPayload, userId?: number) {
    const usd = Number(body.amount_usd) || 0;
    const khr = Number(body.amount_khr) || 0;
    if (usd <= 0 && khr <= 0) {
      throw new Error('At least one amount (USD or KHR) must be greater than 0');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Helper to fetch a wallet by id or code
      const fetchWallet = async (ref: string | number | undefined) => {
        if (!ref) return null;
        const numId = Number(ref);
        if (!isNaN(numId) && numId > 0 && String(ref).trim().match(/^\d+$/)) {
          const r = await client.query(
            'SELECT id, code, name_km, category, currency, CAST(current_balance AS FLOAT) as balance FROM wallets WHERE id = $1 FOR UPDATE',
            [numId]
          );
          return r.rows[0] || null;
        }
        const r = await client.query(
          'SELECT id, code, name_km, category, currency, CAST(current_balance AS FLOAT) as balance FROM wallets WHERE id::text = $1 OR code = $1 FOR UPDATE',
          [String(ref)]
        );
        return r.rows[0] || null;
      };

      // Helper to find partner wallet for a given currency within the same bank/drawer
      const findPartnerWallet = async (baseWallet: any, targetCurrency: 'USD' | 'KHR') => {
        if (!baseWallet) return null;
        if (baseWallet.currency === targetCurrency) return baseWallet;

        const cleanKm = (baseWallet.name_km || '').replace(/\s*[\(\[].*?[\)\]]/gi, '').trim();
        const r = await client.query(
          `SELECT id, code, name_km, category, currency, CAST(current_balance AS FLOAT) as balance 
           FROM wallets 
           WHERE is_active = true 
             AND currency = $1 
             AND category = $2 
             AND (
               TRIM(REGEXP_REPLACE(name_km, '\\s*[\\(\\[].*?[\\)\\]]', '', 'g')) = $3
               OR code ILIKE $4
             )
           ORDER BY id ASC LIMIT 1 FOR UPDATE`,
          [
            targetCurrency, 
            baseWallet.category, 
            cleanKm, 
            targetCurrency === 'KHR' ? `${baseWallet.code.replace(/_usd$/i, '')}%khr%` : `${baseWallet.code.replace(/_khr$/i, '')}%`
          ]
        );
        if (r.rows[0]) return r.rows[0];

        const fallback = await client.query(
          `SELECT id, code, name_km, category, currency, CAST(current_balance AS FLOAT) as balance 
           FROM wallets 
           WHERE is_active = true AND currency = $1 AND category = $2 
           ORDER BY id ASC LIMIT 1 FOR UPDATE`,
          [targetCurrency, baseWallet.category]
        );
        return fallback.rows[0] || null;
      };

      // 1. Resolve USD wallet
      let usdWallet = null;
      if (usd > 0 && body.usd_wallet_id) {
        usdWallet = await fetchWallet(body.usd_wallet_id);
      }

      // 2. Resolve KHR wallet
      let khrWallet = null;
      if (khr > 0 && body.khr_wallet_id) {
        khrWallet = await fetchWallet(body.khr_wallet_id);
      }

      // 3. Resolve base wallet from wallet_id or wallet_code
      let baseWallet = await fetchWallet(body.wallet_id || body.wallet_code);
      if (!baseWallet && (usdWallet || khrWallet)) {
        baseWallet = usdWallet || khrWallet;
      }
      if (!baseWallet) {
        const def = await client.query(
          'SELECT id, code, name_km, category, currency, CAST(current_balance AS FLOAT) as balance FROM wallets WHERE is_active = true ORDER BY (category = \'cash\') DESC, id ASC LIMIT 1 FOR UPDATE'
        );
        baseWallet = def.rows[0];
      }
      if (!baseWallet) throw new Error('Target wallet not found');

      // Automatically pair companion wallets if not explicitly provided
      if (usd > 0 && !usdWallet) {
        usdWallet = await findPartnerWallet(baseWallet, 'USD');
      }
      if (khr > 0 && !khrWallet) {
        khrWallet = await findPartnerWallet(baseWallet, 'KHR');
      }

      // Primary wallet to record on the invoice
      const primaryWallet = (usd > 0 && usdWallet) || (khr > 0 && khrWallet) || baseWallet;

      const invNo = `#IN-${Math.floor(1000 + Math.random() * 9000)}`;
      const tableName = body.table_name ? body.table_name.trim() : null;
      const sourceName = tableName
        ? (body.source_name && body.source_name !== 'ចំណូលលក់' && body.source_name !== tableName ? `${tableName} · ${body.source_name}` : tableName)
        : (body.source_name || 'បិទវេនលក់ (POS Sales)');
      const categoryName = body.category_name || 'ចំណូលលក់';

      let noteText = body.note || '';
      if (body.reference_no) {
        noteText = noteText ? `[Ref: ${body.reference_no}] ${noteText}` : `[Ref: ${body.reference_no}]`;
      }

      const insertRes = await client.query(
        `INSERT INTO invoices (invoice_no, invoice_date, invoice_time, type, expense_kind, supplier_name, category_name, wallet_code, total_usd, total_khr, paid_usd, paid_khr, status, note, receipt_url, created_by, table_name)
         VALUES ($1, $2, COALESCE($3::time, CURRENT_TIME), 'income', NULL, $4, $5, $6, $7, $8, $9, $10, 'paid', $11, $12, $13, $14)
         RETURNING *`,
        [
          invNo,
          body.date || getPhnomPenhDate(),
          body.time || null,
          sourceName,
          categoryName,
          primaryWallet.code,
          usd,
          khr,
          usd,
          khr,
          noteText || null,
          body.receipt_url || null,
          userId || null,
          tableName,
        ]
      );
      const newInvoice = insertRes.rows[0];

      // Record payments in invoice_payments and update wallet balances strictly per currency
      if (usd > 0) {
        const targetUsdId = usdWallet ? usdWallet.id : primaryWallet.id;
        await client.query(
          `INSERT INTO invoice_payments (invoice_id, wallet_id, amount, currency, method, created_by)
           VALUES ($1, $2, $3, 'USD', 'cash', $4)`,
          [newInvoice.id, targetUsdId, usd, userId || null]
        );
        await client.query(
          'UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2',
          [usd, targetUsdId]
        );
      }

      if (khr > 0) {
        const targetKhrId = khrWallet ? khrWallet.id : primaryWallet.id;
        await client.query(
          `INSERT INTO invoice_payments (invoice_id, wallet_id, amount, currency, method, created_by)
           VALUES ($1, $2, $3, 'KHR', 'cash', $4)`,
          [newInvoice.id, targetKhrId, khr, userId || null]
        );
        await client.query(
          'UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2',
          [khr, targetKhrId]
        );
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

      // Adjust wallet balances
      if (invoice.paid_usd > 0 || invoice.paid_khr > 0) {
        const pUsd = Number(invoice.paid_usd) || 0;
        const pKhr = Number(invoice.paid_khr) || 0;
        if (invoice.type === 'income') {
          if (pUsd > 0) {
            await client.query(
              "UPDATE wallets SET current_balance = GREATEST(0, current_balance - $1) WHERE (code = $2 OR is_active = true) AND currency = 'USD' ORDER BY (code = $2) DESC LIMIT 1",
              [pUsd, invoice.wallet_code]
            );
          }
          if (pKhr > 0) {
            await client.query(
              "UPDATE wallets SET current_balance = GREATEST(0, current_balance - $1) WHERE (code = $2 OR is_active = true) AND currency = 'KHR' ORDER BY (code = $2) DESC LIMIT 1",
              [pKhr, invoice.wallet_code]
            );
          }
        } else {
          if (pUsd > 0) {
            await client.query(
              "UPDATE wallets SET current_balance = current_balance + $1 WHERE (code = $2 OR is_active = true) AND currency = 'USD' ORDER BY (code = $2) DESC LIMIT 1",
              [pUsd, invoice.wallet_code]
            );
          }
          if (pKhr > 0) {
            await client.query(
              "UPDATE wallets SET current_balance = current_balance + $1 WHERE (code = $2 OR is_active = true) AND currency = 'KHR' ORDER BY (code = $2) DESC LIMIT 1",
              [pKhr, invoice.wallet_code]
            );
          }
        }
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
      let walletRes;
      const numId = Number(walletRef);
      if (!isNaN(numId) && numId > 0 && String(walletRef).trim().match(/^\d+$/)) {
        walletRes = await client.query(
          'SELECT id, code, name_km, category, currency, CAST(current_balance AS FLOAT) as balance FROM wallets WHERE id = $1 FOR UPDATE',
          [numId]
        );
      } else if (walletRef) {
        walletRes = await client.query(
          'SELECT id, code, name_km, category, currency, CAST(current_balance AS FLOAT) as balance FROM wallets WHERE id::text = $1 OR code = $1 FOR UPDATE',
          [String(walletRef)]
        );
      }
      if (!walletRes || !walletRes.rows.length) {
        walletRes = await client.query(
          'SELECT id, code, name_km, category, currency, CAST(current_balance AS FLOAT) as balance FROM wallets WHERE is_active = true ORDER BY (category = \'cash\') DESC, id ASC LIMIT 1 FOR UPDATE'
        );
      }
      if (!walletRes || !walletRes.rows.length) throw new Error(`Wallet '${walletRef}' not found and no active wallet exists`);
      const wallet = walletRes.rows[0];

      const totalUsd = Number(invoice.total_usd) || 0;
      const totalKhr = Number(invoice.total_khr) || 0;
      const currentPaidUsd = Number(invoice.paid_usd) || 0;
      const currentPaidKhr = Number(invoice.paid_khr) || 0;

      const toPayUsd = Math.max(0, totalUsd - currentPaidUsd);
      const toPayKhr = Math.max(0, totalKhr - currentPaidKhr);

      // Deduct balance from chosen wallet according to its currency
      const deductAmount = wallet.currency === 'USD' ? toPayUsd : toPayKhr;
      if (deductAmount > 0) {
        await client.query(
          'UPDATE wallets SET current_balance = GREATEST(0, current_balance - $1) WHERE id = $2',
          [deductAmount, wallet.id]
        );
      }

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
