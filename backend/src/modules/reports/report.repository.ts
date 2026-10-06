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
      ORDER BY i.invoice_date DESC, i.created_at DESC, ii.created_at ASC
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
}

export const reportRepository = new ReportRepository();
