import { Router, Request, Response } from 'express';
import { pool } from '../config/db.js';
import { WalletCountPayload } from '../types/index.js';

const router = Router();

const TOLERANCE = {
  KHR: 10000,
  USD: 2.00
};

// 1. Get current expected system amounts for count screen from PostgreSQL
router.get('/expected', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE code = 'drawer'"
    );
    const drawer = rows[0] || { usd: 0, khr: 0 };

    res.json({
      expected: {
        USD: drawer.usd,
        KHR: Number(drawer.khr)
      },
      tolerance: TOLERANCE
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error fetching expected amounts', message: err.message });
  }
});

// 2. Submit physical count to PostgreSQL
router.post('/', async (req: Request, res: Response) => {
  const body = req.body as WalletCountPayload;
  const { wallet_id, currency, denominations, reason_for_gap } = body;

  if (!currency || !denominations) {
    return res.status(400).json({ error: 'currency and denominations breakdown are required' });
  }

  try {
    // Retrieve system balance for target wallet
    const walletRes = await pool.query(
      "SELECT id, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE id::text = $1 OR code = $1",
      [wallet_id || 'drawer']
    );
    const targetWallet = walletRes.rows[0] || (await pool.query("SELECT id, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE code = 'drawer'")).rows[0];

    // Calculate counted total from banknote stepper breakdown
    let counted = 0;
    for (const [denom, count] of Object.entries(denominations)) {
      counted += Number(denom) * Number(count);
    }

    const system = currency === 'USD' ? targetWallet.usd : Number(targetWallet.khr);
    const difference = counted - system;
    const tolerance = currency === 'USD' ? TOLERANCE.USD : TOLERANCE.KHR;
    const gapExceedsTolerance = Math.abs(difference) > tolerance;

    if (gapExceedsTolerance && !reason_for_gap) {
      return res.status(400).json({
        error: 'Reason is required because discrepancy exceeds tolerance threshold',
        difference,
        tolerance
      });
    }

    const insertRes = await pool.query(
      `INSERT INTO wallet_counts (
        wallet_id, currency, count_date, system_amount, counted_amount, tolerance_threshold, denominations_breakdown, reason_for_gap, is_blind_count
       ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [
        targetWallet.id,
        currency,
        system,
        counted,
        tolerance,
        JSON.stringify(denominations),
        reason_for_gap || null
      ]
    );

    res.status(201).json({
      success: true,
      count_record: insertRes.rows[0],
      alert_triggered: gapExceedsTolerance
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record cash count', message: err.message });
  }
});

// 3. Get cash counts history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
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
      LIMIT 30;
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Database error fetching count history', message: err.message });
  }
});

export default router;
