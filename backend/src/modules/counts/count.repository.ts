import { pool } from '../../db/index.js';

export class CountRepository {
  async getExpectedDrawerAmount() {
    const res = await pool.query(
      "SELECT CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE code = 'drawer'"
    );
    return res.rows[0] || { usd: 0, khr: 0 };
  }

  async getWalletForCount(walletId?: string | number) {
    const res = await pool.query(
      "SELECT id, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE id::text = $1 OR code = $1",
      [walletId || 'drawer']
    );
    return res.rows[0] || (await pool.query("SELECT id, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE code = 'drawer'")).rows[0];
  }

  async createCountRecord(data: {
    wallet_id: number;
    currency: string;
    system_amount: number;
    counted_amount: number;
    tolerance_threshold: number;
    denominations_breakdown: any;
    reason_for_gap?: string | null;
    userId?: number;
  }) {
    const res = await pool.query(
      `INSERT INTO wallet_counts (
        wallet_id, currency, count_date, system_amount, counted_amount, tolerance_threshold, denominations_breakdown, reason_for_gap, is_blind_count, counted_by
       ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, true, $8)
       RETURNING *`,
      [
        data.wallet_id,
        data.currency,
        data.system_amount,
        data.counted_amount,
        data.tolerance_threshold,
        JSON.stringify(data.denominations_breakdown),
        data.reason_for_gap || null,
        data.userId || null,
      ]
    );
    return res.rows[0];
  }

  async getHistory(limit = 30) {
    const res = await pool.query(`
      SELECT 
        wc.id,
        w.code as wallet_code,
        w.name_km as wallet_name,
        wc.currency,
        wc.count_date,
        CAST(wc.system_amount AS FLOAT) as system_amount,
        CAST(wc.counted_amount AS FLOAT) as counted_amount,
        CAST(wc.difference AS FLOAT) as difference,
        wc.tolerance_threshold,
        wc.denominations_breakdown,
        wc.reason_for_gap,
        wc.created_at
      FROM wallet_counts wc
      JOIN wallets w ON wc.wallet_id = w.id
      ORDER BY wc.created_at DESC
      LIMIT $1;
    `, [limit]);
    return res.rows;
  }
}

export const countRepository = new CountRepository();
