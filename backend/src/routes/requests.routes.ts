import { Router, Request, Response } from 'express';
import { pool } from '../config/db.js';

const router = Router();

// 1. Get all money requests with distributions (FRD 11)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
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

    // Fetch distributions for each request
    for (const r of rows) {
      const distRes = await pool.query(
        'SELECT id, recipient_name, amount, currency, given_at, note FROM request_distributions WHERE request_id = $1 ORDER BY given_at ASC',
        [r.id]
      );
      r.distributions = distRes.rows;
      r.total_distributed = distRes.rows.reduce((sum: number, d: any) => sum + Number(d.amount), 0);
      r.remaining_balance = Number(r.amount) - r.total_distributed;
    }

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Database error fetching money requests', message: err.message });
  }
});

// 2. Create Money Request (FRD 11 - POST /api/v1/money-requests)
router.post('/', async (req: Request, res: Response) => {
  const { amount, currency, category_id, reason, requested_by } = req.body;

  if (!amount || !currency || !reason) {
    return res.status(400).json({ error: 'amount, currency, and reason are required' });
  }

  try {
    // Default to manager user (id: 2) if not specified in request
    let requesterId = requested_by;
    if (!requesterId) {
      const uRes = await pool.query("SELECT id FROM users WHERE role = 'manager' LIMIT 1");
      requesterId = uRes.rows[0]?.id || 2;
    }

    let catId = category_id;
    if (!catId) {
      const cRes = await pool.query("SELECT id FROM categories WHERE type = 'expense' LIMIT 1");
      catId = cRes.rows[0]?.id || 1;
    }

    const insertRes = await pool.query(
      `INSERT INTO money_requests (requested_by, amount, currency, category_id, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [requesterId, amount, currency, catId, reason]
    );

    res.status(201).json({
      success: true,
      money_request: insertRes.rows[0]
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create money request', message: err.message });
  }
});

// 3. Approve Money Request (FRD 11 - POST /api/v1/money-requests/:id/approve)
router.post('/:id/approve', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { disburse_from_wallet_id } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reqRes = await client.query('SELECT * FROM money_requests WHERE id::text = $1 FOR UPDATE', [id]);
    if (!reqRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Money request not found' });
    }
    const moneyReq = reqRes.rows[0];

    if (moneyReq.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot approve request with status '${moneyReq.status}'` });
    }

    // Identify disbursement source wallet (drawer or petty)
    const fromWalletRes = await client.query(
      'SELECT id, code, name_km, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE (id::text = $1 OR code = $1) FOR UPDATE',
      [disburse_from_wallet_id || 'drawer']
    );
    if (!fromWalletRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Disbursement wallet not found' });
    }
    const fromWallet = fromWalletRes.rows[0];

    // Identify Manager Advance wallet ('mgr')
    const mgrWalletRes = await client.query("SELECT id, code, name_km FROM wallets WHERE code = 'mgr' FOR UPDATE");
    const mgrWallet = mgrWalletRes.rows[0];

    const amount = Number(moneyReq.amount);
    const isUSD = moneyReq.currency === 'USD';

    // Deduct source and top up Manager Advance wallet
    if (isUSD) {
      await client.query('UPDATE wallets SET current_usd = current_usd - $1 WHERE id = $2', [amount, fromWallet.id]);
      await client.query('UPDATE wallets SET current_usd = current_usd + $1 WHERE id = $2', [amount, mgrWallet.id]);
    } else {
      await client.query('UPDATE wallets SET current_khr = current_khr - $1 WHERE id = $2', [amount, fromWallet.id]);
      await client.query('UPDATE wallets SET current_khr = current_khr + $1 WHERE id = $2', [amount, mgrWallet.id]);
    }

    // Insert auto-transfer record linked to money request
    await client.query(
      `INSERT INTO transfers (transfer_date, from_wallet_id, to_wallet_id, amount, currency, note, request_id)
       VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6)`,
      [fromWallet.id, mgrWallet.id, amount, moneyReq.currency, `Disbursed for Money Request #${moneyReq.id}: ${moneyReq.reason}`, moneyReq.id]
    );

    // Update money_requests status to approved
    const ownerRes = await client.query("SELECT id FROM users WHERE role = 'owner' LIMIT 1");
    const ownerId = ownerRes.rows[0]?.id || 1;

    const updatedRes = await client.query(
      `UPDATE money_requests
       SET status = 'approved', approved_by = $1, approved_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [ownerId, moneyReq.id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Money request approved. ${amount} ${moneyReq.currency} transferred from ${fromWallet.name_km} to Manager Advance`,
      money_request: updatedRes.rows[0]
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to approve money request', message: err.message });
  } finally {
    client.release();
  }
});

// 4. Distribute Cash to Staff / Contractor (FRD 11 - POST /api/v1/money-requests/:id/distribute)
router.post('/:id/distribute', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { recipient_name, amount, currency, note } = req.body;

  if (!recipient_name || !amount) {
    return res.status(400).json({ error: 'recipient_name and amount are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reqRes = await client.query('SELECT * FROM money_requests WHERE id::text = $1 FOR UPDATE', [id]);
    if (!reqRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Money request not found' });
    }
    const moneyReq = reqRes.rows[0];

    const distAmount = Number(amount);
    const curr = currency || moneyReq.currency;

    // Insert distribution line
    const distRes = await client.query(
      `INSERT INTO request_distributions (request_id, recipient_name, amount, currency, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [moneyReq.id, recipient_name, distAmount, curr, note || null]
    );

    // Calculate total distributed so far
    const sumRes = await client.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM request_distributions WHERE request_id = $1',
      [moneyReq.id]
    );
    const totalDistributed = Number(sumRes.rows[0].total);

    // If fully distributed, mark settled
    if (totalDistributed >= Number(moneyReq.amount)) {
      await client.query("UPDATE money_requests SET status = 'settled' WHERE id = $1", [moneyReq.id]);
    }

    // Deduct distributed amount from Manager Advance wallet
    if (curr === 'USD') {
      await client.query("UPDATE wallets SET current_usd = GREATEST(0, current_usd - $1) WHERE code = 'mgr'", [distAmount]);
    } else {
      await client.query("UPDATE wallets SET current_khr = GREATEST(0, current_khr - $1) WHERE code = 'mgr'", [distAmount]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      distribution: distRes.rows[0],
      total_distributed: totalDistributed,
      remaining_balance: Math.max(0, Number(moneyReq.amount) - totalDistributed),
      is_settled: totalDistributed >= Number(moneyReq.amount)
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to record distribution', message: err.message });
  } finally {
    client.release();
  }
});

export default router;
