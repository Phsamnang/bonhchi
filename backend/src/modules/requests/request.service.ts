import { requestRepository } from './request.repository.js';
import { pool } from '../../db/index.js';

export class RequestService {
  async getAll(status?: string) {
    return requestRepository.findAll(status);
  }

  async create(body: {
    amount: number;
    currency: 'USD' | 'KHR';
    reason: string;
    category_id?: number;
    requested_by?: number;
  }) {
    let requesterId: number = Number(body.requested_by) || 0;
    if (!requesterId) {
      const uRes = await pool.query("SELECT id FROM users WHERE role = 'manager' LIMIT 1");
      requesterId = Number(uRes.rows[0]?.id) || 2;
    }

    let catId: number = Number(body.category_id) || 0;
    if (!catId) {
      const cRes = await pool.query("SELECT id FROM categories WHERE type = 'expense' LIMIT 1");
      catId = Number(cRes.rows[0]?.id) || 1;
    }

    const req = await requestRepository.create({
      requested_by: requesterId,
      amount: body.amount,
      currency: body.currency,
      category_id: catId,
      reason: body.reason,
    });

    return { success: true, money_request: req };
  }

  async approve(id: string | number, disburseWalletId?: string | number, approverId?: number) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const reqRes = await client.query('SELECT * FROM money_requests WHERE id::text = $1 FOR UPDATE', [id]);
      if (!reqRes.rows.length) throw new Error('Money request not found');
      const moneyReq = reqRes.rows[0];

      if (moneyReq.status !== 'pending') {
        throw new Error(`Cannot approve request with status '${moneyReq.status}'`);
      }

      const fromWalletRes = await client.query(
        'SELECT id, code, name_km, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE (id::text = $1 OR code = $1) FOR UPDATE',
        [disburseWalletId || 'drawer']
      );
      if (!fromWalletRes.rows.length) throw new Error('Disbursement wallet not found');
      const fromWallet = fromWalletRes.rows[0];

      const mgrWalletRes = await client.query("SELECT id, code, name_km FROM wallets WHERE code = 'mgr' FOR UPDATE");
      const mgrWallet = mgrWalletRes.rows[0];

      const amount = Number(moneyReq.amount);
      const isUSD = moneyReq.currency === 'USD';

      if (isUSD) {
        await client.query('UPDATE wallets SET current_usd = current_usd - $1 WHERE id = $2', [amount, fromWallet.id]);
        await client.query('UPDATE wallets SET current_usd = current_usd + $1 WHERE id = $2', [amount, mgrWallet.id]);
      } else {
        await client.query('UPDATE wallets SET current_khr = current_khr - $1 WHERE id = $2', [amount, fromWallet.id]);
        await client.query('UPDATE wallets SET current_khr = current_khr + $1 WHERE id = $2', [amount, mgrWallet.id]);
      }

      await client.query(
        `INSERT INTO transfers (transfer_date, from_wallet_id, to_wallet_id, amount, currency, note, request_id, created_by)
         VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6, $7)`,
        [fromWallet.id, mgrWallet.id, amount, moneyReq.currency, `Disbursed for Money Request #${moneyReq.id}: ${moneyReq.reason}`, moneyReq.id, approverId || null]
      );

      const updatedRes = await client.query(
        `UPDATE money_requests
         SET status = 'approved', approved_by = $1, approved_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [approverId || 1, moneyReq.id]
      );

      await client.query('COMMIT');
      return {
        success: true,
        message: `Money request approved. ${amount} ${moneyReq.currency} transferred from ${fromWallet.name_km} to Manager Advance`,
        money_request: updatedRes.rows[0],
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async reject(id: string | number, reason: string) {
    const res = await pool.query(
      `UPDATE money_requests 
       SET status = 'rejected', rejection_reason = $1 
       WHERE id::text = $2 AND status = 'pending' 
       RETURNING *`,
      [reason || 'No reason provided', id]
    );
    if (!res.rows.length) throw new Error('Money request not found or not pending');
    return { success: true, money_request: res.rows[0] };
  }

  async distribute(id: string | number, body: { recipient_name: string; amount: number; currency?: string; note?: string }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const reqRes = await client.query('SELECT * FROM money_requests WHERE id::text = $1 FOR UPDATE', [id]);
      if (!reqRes.rows.length) throw new Error('Money request not found');
      const moneyReq = reqRes.rows[0];

      const distAmount = Number(body.amount);
      const curr = body.currency || moneyReq.currency;

      const distRes = await client.query(
        `INSERT INTO request_distributions (request_id, recipient_name, amount, currency, note)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [moneyReq.id, body.recipient_name, distAmount, curr, body.note || null]
      );

      // Check remaining balance to see if request is fully settled
      const sumRes = await client.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM request_distributions WHERE request_id = $1',
        [moneyReq.id]
      );
      const totalDist = Number(sumRes.rows[0].total);

      if (totalDist >= Number(moneyReq.amount)) {
        await client.query("UPDATE money_requests SET status = 'settled' WHERE id = $1", [moneyReq.id]);
      }

      await client.query('COMMIT');
      return {
        success: true,
        distribution: distRes.rows[0],
        total_distributed: totalDist,
        settled: totalDist >= Number(moneyReq.amount),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export const requestService = new RequestService();
