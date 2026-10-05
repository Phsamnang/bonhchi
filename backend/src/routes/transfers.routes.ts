import { Router, Request, Response } from 'express';
import { pool } from '../config/db.js';
import { TransferPayload } from '../types/index.js';

const router = Router();

// 1. Get recent transfers history (FRD 06)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        t.id,
        t.transfer_date,
        t.amount,
        t.currency,
        t.note,
        t.request_id,
        t.created_at,
        w1.code as from_code,
        w1.name_km as from_wallet_km,
        w2.code as to_code,
        w2.name_km as to_wallet_km
      FROM transfers t
      JOIN wallets w1 ON t.from_wallet_id = w1.id
      JOIN wallets w2 ON t.to_wallet_id = w2.id
      ORDER BY t.created_at DESC
      LIMIT 50;
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Database error fetching transfers', message: err.message });
  }
});

// 2. Execute Wallet-to-Wallet Transfer (FRD 06 - POST /api/v1/transfers)
router.post('/', async (req: Request, res: Response) => {
  const body = req.body as TransferPayload;
  const { from_wallet_id, to_wallet_id, amount, currency, note } = body;

  if (!from_wallet_id || !to_wallet_id || !amount || !currency) {
    return res.status(400).json({ error: 'from_wallet_id, to_wallet_id, amount, and currency are required' });
  }

  if (from_wallet_id === to_wallet_id) {
    return res.status(400).json({ error: 'Source and destination wallets must be different' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Retrieve source wallet
    const fromRes = await client.query(
      'SELECT id, code, name_km, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE id::text = $1 OR code = $1 FOR UPDATE',
      [from_wallet_id]
    );
    if (!fromRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Source wallet ${from_wallet_id} not found` });
    }
    const fromWallet = fromRes.rows[0];

    // Retrieve target wallet
    const toRes = await client.query(
      'SELECT id, code, name_km, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE id::text = $1 OR code = $1 FOR UPDATE',
      [to_wallet_id]
    );
    if (!toRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Destination wallet ${to_wallet_id} not found` });
    }
    const toWallet = toRes.rows[0];

    const isUSD = currency === 'USD';
    const available = isUSD ? fromWallet.usd : fromWallet.khr;

    if (amount > available) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Transfer amount (${amount} ${currency}) exceeds available balance in ${fromWallet.name_km} (${available} ${currency})`
      });
    }

    // Execute transfer balance update
    if (isUSD) {
      await client.query('UPDATE wallets SET current_usd = current_usd - $1 WHERE id = $2', [amount, fromWallet.id]);
      await client.query('UPDATE wallets SET current_usd = current_usd + $1 WHERE id = $2', [amount, toWallet.id]);
    } else {
      await client.query('UPDATE wallets SET current_khr = current_khr - $1 WHERE id = $2', [amount, fromWallet.id]);
      await client.query('UPDATE wallets SET current_khr = current_khr + $1 WHERE id = $2', [amount, toWallet.id]);
    }

    // Insert audit record in transfers table
    const transferRes = await client.query(
      `INSERT INTO transfers (transfer_date, from_wallet_id, to_wallet_id, amount, currency, note)
       VALUES (CURRENT_DATE, $1, $2, $3, $4, $5)
       RETURNING id, transfer_date, amount, currency, note, created_at`,
      [fromWallet.id, toWallet.id, amount, currency, note || null]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      transfer: {
        ...transferRes.rows[0],
        from_wallet: fromWallet.name_km,
        to_wallet: toWallet.name_km
      }
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Transfer failed', message: err.message });
  } finally {
    client.release();
  }
});

export default router;
