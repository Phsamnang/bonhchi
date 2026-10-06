import { pool } from '../../db/index.js';

export class RequestRepository {
  async findAll(status?: string) {
    let sql = `
      SELECT 
        mr.id,
        mr.amount,
        mr.currency,
        mr.reason,
        mr.status,
        mr.approved_at,
        mr.rejection_reason,
        mr.created_at,
        u.name as requested_by_name,
        u2.name as approved_by_name,
        c.name_km as category_name
      FROM money_requests mr
      LEFT JOIN users u ON mr.requested_by = u.id
      LEFT JOIN users u2 ON mr.approved_by = u2.id
      LEFT JOIN categories c ON mr.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status) {
      params.push(status);
      sql += ` AND mr.status = $${params.length}`;
    }
    sql += ' ORDER BY mr.created_at DESC';

    const { rows } = await pool.query(sql, params);

    for (const r of rows) {
      const distRes = await pool.query(
        'SELECT id, recipient_name, amount, currency, given_at, note FROM request_distributions WHERE request_id = $1 ORDER BY given_at ASC',
        [r.id]
      );
      r.distributions = distRes.rows;
      r.total_distributed = distRes.rows.reduce((sum: number, d: any) => sum + Number(d.amount), 0);
      r.remaining_balance = Number(r.amount) - r.total_distributed;
    }

    return rows;
  }

  async create(data: {
    requested_by: number;
    amount: number;
    currency: string;
    category_id: number;
    reason: string;
  }) {
    const res = await pool.query(
      `INSERT INTO money_requests (requested_by, amount, currency, category_id, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [data.requested_by, data.amount, data.currency, data.category_id, data.reason]
    );
    return res.rows[0];
  }
}

export const requestRepository = new RequestRepository();
