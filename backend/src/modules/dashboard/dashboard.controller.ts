import { Request, Response } from 'express';
import { pool } from '../../db/index.js';

export class DashboardController {
  async getSummary(req: Request, res: Response) {
    const role = req.user?.app_role || 'staff';

    try {
      let walletSql = 'SELECT id, code, name_km, name_en, type, category, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE is_active = true';
      const walletParams: any[] = [];

      if (role === 'staff') {
        walletSql += ' AND code = $1';
        walletParams.push('petty');
      }
      walletSql += ' ORDER BY created_at ASC';

      const walletsRes = await pool.query(walletSql, walletParams);
      const visibleWallets = walletsRes.rows;

      let cashUsd = 0;
      let cashKhr = 0;
      let bankUsd = 0;
      let bankKhr = 0;
      let totalUsd = 0;
      let totalKhr = 0;

      for (const w of visibleWallets) {
        totalUsd += w.usd;
        totalKhr += Number(w.khr);
        if (w.category === 'cash') {
          cashUsd += w.usd;
          cashKhr += Number(w.khr);
        } else if (w.category === 'bank') {
          bankUsd += w.usd;
          bankKhr += Number(w.khr);
        }
      }

      const invTotalsRes = await pool.query(`
        SELECT 
          type,
          COALESCE(SUM(total_usd), 0) AS usd,
          COALESCE(SUM(total_khr), 0) AS khr
        FROM invoices
        WHERE invoice_date = CURRENT_DATE AND status != 'void'
        GROUP BY type;
      `);

      let incomeUsd = 0;
      let incomeKhr = 0;
      let expenseUsd = 0;
      let expenseKhr = 0;

      for (const row of invTotalsRes.rows) {
        if (row.type === 'income') {
          incomeUsd = Number(row.usd);
          incomeKhr = Number(row.khr);
        } else if (row.type === 'expense') {
          expenseUsd = Number(row.usd);
          expenseKhr = Number(row.khr);
        }
      }

      const staffSpendRes = await pool.query(`
        SELECT 
          COALESCE(SUM(total_usd), 0) AS usd,
          COALESCE(SUM(total_khr), 0) AS khr
        FROM invoices
        WHERE invoice_date = CURRENT_DATE AND status != 'void' AND type = 'expense' AND wallet_code = 'petty';
      `);
      const staffUsd = Number(staffSpendRes.rows[0]?.usd || 0);
      const staffKhr = Number(staffSpendRes.rows[0]?.khr || 0);

      const recentTxRes = await pool.query(`
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
          receipt_url,
          created_at
        FROM invoices
        ORDER BY created_at DESC
        LIMIT 10;
      `);

      const countCheckRes = await pool.query(`
        SELECT id FROM wallet_counts WHERE count_date = CURRENT_DATE LIMIT 1;
      `);
      const countCompleted = countCheckRes.rows.length > 0;

      res.json({
        date: new Date().toISOString().split('T')[0],
        date_km: 'ច័ន្ទ 5 តុលា 2026',
        role,
        closing_count_completed: countCompleted,
        closing_time: '21:00',
        income_today: { usd: incomeUsd, khr: incomeKhr },
        expense_today: { usd: expenseUsd, khr: expenseKhr },
        staff_spend_today: { usd: staffUsd, khr: staffKhr },
        liquidity: {
          total: { usd: Number(totalUsd.toFixed(2)), khr: totalKhr },
          cash: { usd: Number(cashUsd.toFixed(2)), khr: cashKhr },
          bank: { usd: Number(bankUsd.toFixed(2)), khr: bankKhr },
        },
        wallets: visibleWallets,
        recent_transactions: recentTxRes.rows,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Database error fetching dashboard summary', message: err.message });
    }
  }
}

export const dashboardController = new DashboardController();
