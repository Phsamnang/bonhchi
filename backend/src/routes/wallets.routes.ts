import { Router, Request, Response } from 'express';
import { pool } from '../config/db.js';
import { TransferPayload } from '../types/index.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// 1. Get all wallets (supports ?category=cash|bank)
router.get('/', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    let queryText = 'SELECT id, code, name_km, name_en, type, category, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE is_active = true';
    const params: any[] = [];

    if (category) {
      queryText += ' AND category = $1';
      params.push(category);
    }
    queryText += ' ORDER BY created_at ASC';

    const { rows } = await pool.query(queryText, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Database error fetching wallets', message: err.message });
  }
});

// 1b. Get Cash vs. Bank liquidity breakdown
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const sql = `
      SELECT 
        COALESCE(SUM(current_usd), 0) AS total_usd,
        COALESCE(SUM(current_khr), 0) AS total_khr,
        COALESCE(SUM(CASE WHEN category = 'cash' THEN current_usd ELSE 0 END), 0) AS cash_usd,
        COALESCE(SUM(CASE WHEN category = 'cash' THEN current_khr ELSE 0 END), 0) AS cash_khr,
        COALESCE(SUM(CASE WHEN category = 'bank' THEN current_usd ELSE 0 END), 0) AS bank_usd,
        COALESCE(SUM(CASE WHEN category = 'bank' THEN current_khr ELSE 0 END), 0) AS bank_khr
      FROM wallets WHERE is_active = true;
    `;
    const { rows } = await pool.query(sql);
    const row = rows[0];

    res.json({
      total: { usd: Number(Number(row.total_usd).toFixed(2)), khr: Number(row.total_khr) },
      cash: { usd: Number(Number(row.cash_usd).toFixed(2)), khr: Number(row.cash_khr) },
      bank: { usd: Number(Number(row.bank_usd).toFixed(2)), khr: Number(row.bank_khr) }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error fetching liquidity summary', message: err.message });
  }
});

// 1c. Create a wallet (owner or manager)
const VALID_WALLET_TYPES = [
  'cash',
  'bank',
  'cash_drawer',
  'petty_cash',
  'delivery_app',
  'staff_advance',
  'manager_advance',
  'tips'
];

const TYPE_TO_CATEGORY: Record<string, string> = {
  cash: 'cash',
  cash_drawer: 'cash',
  petty_cash: 'cash',
  bank: 'bank',
  delivery_app: 'other',
  staff_advance: 'advance',
  manager_advance: 'advance',
  tips: 'other',
};

const CATEGORY_WALLET_TYPE: Record<string, string> = {
  cash: 'cash',
  bank: 'bank',
  advance: 'staff_advance',
  other: 'tips',
};

router.post('/', requireRole(['owner', 'manager']), async (req: Request, res: Response) => {
  const nameKm = (req.body.name_km || '').toString().trim();
  const nameEn = (req.body.name_en || '').toString().trim() || nameKm;
  let type = (req.body.type || '').toString().toLowerCase();
  let category = (req.body.category || '').toString().toLowerCase();
  const openingUsd = Number(req.body.opening_usd) || 0;
  const openingKhr = Math.round(Number(req.body.opening_khr) || 0);

  if (!nameKm) {
    return res.status(400).json({ error: 'Wallet name (name_km) is required' });
  }

  // Normalize cash and bank
  if (type === 'cash' || category === 'cash') {
    type = 'cash';
    category = 'cash';
  } else if (type === 'bank' || category === 'bank') {
    type = 'bank';
    category = 'bank';
  } else if (type && VALID_WALLET_TYPES.includes(type)) {
    if (!category) {
      category = TYPE_TO_CATEGORY[type] || 'other';
    }
  } else if (category && CATEGORY_WALLET_TYPE[category]) {
    type = CATEGORY_WALLET_TYPE[category];
  } else {
    type = 'bank';
    category = 'bank';
  }

  if (openingUsd < 0 || openingKhr < 0) {
    return res.status(400).json({ error: 'Opening balance cannot be negative' });
  }

  try {
    // Short unique code from the English name (e.g. "Wing Bank" → "wing-bank", then "wing-bank-2")
    const base =
      (req.body.code || nameEn)
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || (type === 'cash' ? 'cash' : 'bank');
    const { rows: taken } = await pool.query(
      "SELECT code FROM wallets WHERE code = $1 OR code LIKE $1 || '-%'",
      [base]
    );
    const takenSet = new Set(taken.map((r: any) => r.code));
    let code = base;
    for (let n = 2; takenSet.has(code); n++) code = `${base}-${n}`;

    const { rows } = await pool.query(
      `INSERT INTO wallets (code, name_km, name_en, type, category, opening_usd, opening_khr, current_usd, current_khr)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $6, $7)
       RETURNING id, code, name_km, name_en, type, category, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr`,
      [code, nameKm, nameEn, type, category, openingUsd, openingKhr]
    );

    res.status(201).json(rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A wallet with this code already exists' });
    }
    res.status(500).json({ error: 'Database error creating wallet', message: err.message });
  }
});

// 2. Transfer between wallets
router.post('/transfer', async (req: Request, res: Response) => {
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
