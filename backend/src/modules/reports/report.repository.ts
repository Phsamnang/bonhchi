import { pool } from '../../db/index.js';

export class ReportRepository {
  async getSummary(dateFilter: string) {
    const res = await pool.query(`
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
    return res.rows[0];
  }

  async getPurchasedItems(dateFilter: string) {
    const res = await pool.query(`
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
      -- id tie-breakers: invoices saved in one transaction (a market trip) share created_at
      ORDER BY i.invoice_date DESC, i.created_at DESC, i.id DESC, ii.created_at ASC, ii.id ASC
    `);
    return res.rows;
  }

  async getExportCardInvoices() {
    const res = await pool.query(`
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
    return res.rows;
  }

  /**
   * Income vs expense per calendar day between two SQL date expressions (inclusive).
   * Days without any invoice are still returned (as zeros). Amounts are invoice totals,
   * the same basis the dashboard uses; product purchases and small expenses are split out.
   */
  async getDailyCashflow(startExpr: string, endExpr: string) {
    const res = await pool.query(`
      WITH days AS (
        SELECT d::date AS day FROM generate_series((${startExpr})::date, (${endExpr})::date, INTERVAL '1 day') d
      )
      SELECT
        to_char(days.day, 'YYYY-MM-DD') AS date,
        CAST(COALESCE(SUM(i.total_usd) FILTER (WHERE i.type = 'income'), 0) AS FLOAT) AS income_usd,
        CAST(COALESCE(SUM(i.total_khr) FILTER (WHERE i.type = 'income'), 0) AS FLOAT) AS income_khr,
        CAST(COALESCE(SUM(i.total_usd) FILTER (WHERE i.type = 'expense' AND i.expense_kind = 'product'), 0) AS FLOAT) AS purchase_usd,
        CAST(COALESCE(SUM(i.total_khr) FILTER (WHERE i.type = 'expense' AND i.expense_kind = 'product'), 0) AS FLOAT) AS purchase_khr,
        CAST(COALESCE(SUM(i.total_usd) FILTER (WHERE i.type = 'expense' AND i.expense_kind IS DISTINCT FROM 'product'), 0) AS FLOAT) AS other_usd,
        CAST(COALESCE(SUM(i.total_khr) FILTER (WHERE i.type = 'expense' AND i.expense_kind IS DISTINCT FROM 'product'), 0) AS FLOAT) AS other_khr,
        CAST(COUNT(i.id) FILTER (WHERE i.type = 'income') AS INT) AS income_count,
        CAST(COUNT(i.id) FILTER (WHERE i.type = 'expense') AS INT) AS expense_count
      FROM days
      LEFT JOIN invoices i ON i.invoice_date = days.day AND i.status != 'void'
      GROUP BY days.day
      ORDER BY days.day;
    `);
    return res.rows;
  }
}

export const reportRepository = new ReportRepository();
