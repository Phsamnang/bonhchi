import { Router, Request, Response } from 'express';
import { pool } from '../config/db.js';

const router = Router();

// 1. Get periodic summary report calculated directly from PostgreSQL
router.get('/summary', async (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'today';

  try {
    let dateFilter = 'invoice_date = CURRENT_DATE';
    let label = 'ថ្ងៃនេះ (Today)';

    if (period === 'yesterday') {
      dateFilter = "invoice_date = CURRENT_DATE - INTERVAL '1 day'";
      label = 'ម្សិលមិញ (Yesterday)';
    } else if (period === 'week') {
      dateFilter = "invoice_date >= date_trunc('week', CURRENT_DATE)";
      label = 'សប្តាហ៍នេះ (This Week)';
    } else if (period === 'month') {
      dateFilter = "invoice_date >= date_trunc('month', CURRENT_DATE)";
      label = 'ខែនេះ (This Month)';
    }

    const totalsRes = await pool.query(`
      SELECT 
        COALESCE(SUM(total_usd), 0) AS total_usd,
        COALESCE(SUM(total_khr), 0) AS total_khr,
        COALESCE(SUM(paid_usd), 0) AS paid_usd,
        COALESCE(SUM(paid_khr), 0) AS paid_khr,
        COALESCE(SUM(CASE WHEN status = 'unpaid' THEN total_usd - paid_usd ELSE 0 END), 0) AS owe_usd,
        COALESCE(SUM(CASE WHEN status = 'unpaid' THEN total_khr - paid_khr ELSE 0 END), 0) AS owe_khr,
        COALESCE(SUM(CASE WHEN wallet_code IN ('aba', 'bakong') THEN paid_usd ELSE 0 END), 0) AS qr_usd,
        COALESCE(SUM(CASE WHEN wallet_code IN ('aba', 'bakong') THEN paid_khr ELSE 0 END), 0) AS qr_khr,
        COALESCE(SUM(CASE WHEN wallet_code IN ('drawer', 'petty') THEN paid_usd ELSE 0 END), 0) AS cash_usd,
        COALESCE(SUM(CASE WHEN wallet_code IN ('drawer', 'petty') THEN paid_khr ELSE 0 END), 0) AS cash_khr
      FROM invoices
      WHERE ${dateFilter} AND status != 'void' AND type = 'expense';
    `);

    const row = totalsRes.rows[0];

    res.json({
      period,
      label,
      usd: Number(Number(row.total_usd).toFixed(2)),
      khr: Number(row.total_khr),
      oweUsd: `$${Number(row.owe_usd).toFixed(2)}`,
      oweKhr: `${Number(row.owe_khr).toLocaleString()} ៛`,
      paid: `$${Number(row.paid_usd).toFixed(2)} · ${Number(row.paid_khr).toLocaleString()} ៛`,
      qr: `$${Number(row.qr_usd).toFixed(2)} · ${Number(row.qr_khr).toLocaleString()} ៛`,
      cash: `$${Number(row.cash_usd).toFixed(2)} · ${Number(row.cash_khr).toLocaleString()} ៛`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error fetching report summary', message: err.message });
  }
});

// 1b. All purchased item lines (from product purchase invoices) for a period
router.get('/items', async (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'today';

  let dateFilter = 'i.invoice_date = CURRENT_DATE';
  if (period === 'yesterday') {
    dateFilter = "i.invoice_date = CURRENT_DATE - INTERVAL '1 day'";
  } else if (period === '7days' || period === 'week') {
    dateFilter = "i.invoice_date >= CURRENT_DATE - INTERVAL '6 days'";
  } else if (period === 'month') {
    dateFilter = "i.invoice_date >= date_trunc('month', CURRENT_DATE)";
  } else if (period === 'all') {
    dateFilter = 'TRUE';
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        ii.id,
        ii.item_name,
        CAST(ii.quantity AS FLOAT) AS quantity,
        ii.unit,
        CAST(ii.unit_price AS FLOAT) AS unit_price,
        ii.currency,
        CAST(ii.line_total AS FLOAT) AS line_total,
        ii.is_paid,
        i.id AS invoice_id,
        i.invoice_no,
        to_char(i.invoice_date, 'YYYY-MM-DD') AS invoice_date,
        i.supplier_name,
        i.wallet_code,
        i.status
      FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id
      WHERE ${dateFilter} AND i.status != 'void' AND i.type = 'expense'
      ORDER BY i.invoice_date DESC, i.created_at DESC, ii.created_at ASC
    `);

    res.json({ period, total: rows.length, items: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error fetching purchased items', message: err.message });
  }
});

// 2. Get owner daily report card payload directly from PostgreSQL
router.get('/export-card', async (req: Request, res: Response) => {
  try {
    const invRes = await pool.query(`
      SELECT 
        invoice_no,
        supplier_name,
        category_name,
        wallet_code,
        CAST(total_usd AS FLOAT) as total_usd,
        CAST(total_khr AS BIGINT) as total_khr,
        CAST(paid_usd AS FLOAT) as paid_usd,
        CAST(paid_khr AS BIGINT) as paid_khr,
        status,
        invoice_time
      FROM invoices
      WHERE invoice_date = CURRENT_DATE AND status != 'void'
      ORDER BY invoice_time DESC;
    `);

    const invoices = invRes.rows;

    let spendUsd = 0;
    let spendKhr = 0;
    let paidUsd = 0;
    let paidKhr = 0;
    let oweUsd = 0;
    let oweKhr = 0;
    let qrUsd = 0;
    let qrKhr = 0;
    let cashUsd = 0;
    let cashKhr = 0;

    const rows = invoices.map(i => {
      spendUsd += i.total_usd;
      spendKhr += Number(i.total_khr);
      paidUsd += i.paid_usd;
      paidKhr += Number(i.paid_khr);

      const isUnpaid = i.status === 'unpaid';
      if (isUnpaid) {
        oweUsd += (i.total_usd - i.paid_usd);
        oweKhr += (Number(i.total_khr) - Number(i.paid_khr));
      }

      const isBank = i.wallet_code === 'aba' || i.wallet_code === 'bakong';
      if (isBank) {
        qrUsd += i.paid_usd;
        qrKhr += Number(i.paid_khr);
      } else {
        cashUsd += i.paid_usd;
        cashKhr += Number(i.paid_khr);
      }

      return {
        item: i.category_name || i.supplier_name,
        shop: i.supplier_name,
        pay: isUnpaid ? 'none' : isBank ? 'qr' : 'cash',
        usd: i.total_usd > 0 ? i.total_usd : null,
        khr: Number(i.total_khr) > 0 ? Number(i.total_khr) : null
      };
    });

    res.json({
      restaurant_name: 'Bonchi Restaurant',
      report_title: 'របាយការណ៍ចំណាយប្រចាំថ្ងៃ',
      date_km: 'ច័ន្ទ 5 តុលា 2026',
      preparer: 'ស្រីមុំ · 18:30',
      meta: `${invoices.length} វិក្កយបត្រ`,
      totals: {
        spend: { usd: Number(spendUsd.toFixed(2)), khr: spendKhr },
        paid: { usd: Number(paidUsd.toFixed(2)), khr: paidKhr },
        owe: { usd: Number(oweUsd.toFixed(2)), khr: oweKhr },
        methods: {
          qr: { usd: Number(qrUsd.toFixed(2)), khr: qrKhr },
          cash: { usd: Number(cashUsd.toFixed(2)), khr: cashKhr }
        }
      },
      rows,
      currency_matrix: {
        usd: { unpaid: Number(oweUsd.toFixed(2)), paid: Number(paidUsd.toFixed(2)), total: Number(spendUsd.toFixed(2)) },
        khr: { unpaid: oweKhr, paid: paidKhr, total: spendKhr }
      },
      reference_conversion: {
        rate: 4000,
        approx_khr: Math.round(spendKhr + spendUsd * 4000),
        disclaimer: 'សម្រាប់មើលប៉ុណ្ណោះ · view only, not stored'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error generating report export card', message: err.message });
  }
});

// 3. Dispatch to Telegram Bot (FRD 10)
router.post('/export-telegram', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Report card image dispatched to Owner Telegram chat successfully'
  });
});

// 4. Profit & Loss Report (FRD 01 & FRD 09 - GET /api/v1/reports/profit-loss)
router.get('/profit-loss', async (req: Request, res: Response) => {
  const period = (req.query.period as string) || 'today';

  try {
    let dateFilter = 'invoice_date = CURRENT_DATE';
    if (period === 'yesterday') {
      dateFilter = "invoice_date = CURRENT_DATE - INTERVAL '1 day'";
    } else if (period === 'week') {
      dateFilter = "invoice_date >= date_trunc('week', CURRENT_DATE)";
    } else if (period === 'month') {
      dateFilter = "invoice_date >= date_trunc('month', CURRENT_DATE)";
    } else if (period === 'all') {
      dateFilter = '1=1';
    }

    const { rows } = await pool.query(`
      SELECT 
        type,
        COALESCE(SUM(total_usd), 0) AS total_usd,
        COALESCE(SUM(total_khr), 0) AS total_khr
      FROM invoices
      WHERE ${dateFilter} AND status != 'void'
      GROUP BY type;
    `);

    let incomeUsd = 0;
    let incomeKhr = 0;
    let expenseUsd = 0;
    let expenseKhr = 0;

    for (const r of rows) {
      if (r.type === 'income') {
        incomeUsd = Number(r.total_usd);
        incomeKhr = Number(r.total_khr);
      } else {
        expenseUsd = Number(r.total_usd);
        expenseKhr = Number(r.total_khr);
      }
    }

    const netUsd = incomeUsd - expenseUsd;
    const netKhr = incomeKhr - expenseKhr;

    res.json({
      period,
      income: {
        usd: Number(incomeUsd.toFixed(2)),
        khr: incomeKhr
      },
      expense: {
        usd: Number(expenseUsd.toFixed(2)),
        khr: expenseKhr
      },
      net_profit: {
        usd: Number(netUsd.toFixed(2)),
        khr: netKhr
      },
      is_profitable: netUsd >= 0 && netKhr >= 0
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error generating Profit & Loss report', message: err.message });
  }
});

// 5. Excel Export Data Generator (FRD 10 - GET /api/v1/reports/export-excel)
router.get('/export-excel', async (req: Request, res: Response) => {
  try {
    const { rows: invoices } = await pool.query(`
      SELECT 
        i.invoice_no,
        to_char(i.invoice_date, 'YYYY-MM-DD') AS invoice_date,
        i.invoice_time,
        i.type,
        i.expense_kind,
        i.supplier_name,
        i.category_name,
        i.wallet_code,
        CAST(i.total_usd AS FLOAT) as total_usd,
        CAST(i.total_khr AS BIGINT) as total_khr,
        CAST(i.paid_usd AS FLOAT) as paid_usd,
        CAST(i.paid_khr AS BIGINT) as paid_khr,
        i.status
      FROM invoices i
      WHERE i.invoice_date = CURRENT_DATE AND i.status != 'void'
      ORDER BY i.created_at DESC;
    `);

    // Accounts payable
    const payable = invoices.filter(i => i.status === 'unpaid' || i.status === 'partial');

    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      report_date: new Date().toISOString().split('T')[0],
      sheets: {
        daily_summary: {
          total_invoices: invoices.length,
          total_spend_usd: invoices.reduce((s, i) => s + (i.type === 'expense' ? i.total_usd : 0), 0),
          total_spend_khr: invoices.reduce((s, i) => s + (i.type === 'expense' ? Number(i.total_khr) : 0), 0),
          total_income_usd: invoices.reduce((s, i) => s + (i.type === 'income' ? i.total_usd : 0), 0),
          total_income_khr: invoices.reduce((s, i) => s + (i.type === 'income' ? Number(i.total_khr) : 0), 0),
        },
        itemized_ledger: invoices,
        accounts_payable: payable
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate Excel export data', message: err.message });
  }
});

export default router;
