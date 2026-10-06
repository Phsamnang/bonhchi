import { walletRepository } from './wallet.repository.js';
import { pool } from '../../db/index.js';
import { UserRole } from '../../middleware/requireRole.js';

export class WalletService {
  async getWallets(userRole?: UserRole) {
    const allWallets = await walletRepository.findAll();

    const formatted = allWallets.map((w) => {
      const balance = parseFloat(w.current_balance as string) || 0;
      const opening = parseFloat(w.opening_balance as string) || 0;
      return {
        id: w.id,
        code: w.code,
        name_km: w.name_km,
        name_en: w.name_en,
        type: w.type,
        category: w.category,
        currency: w.currency,
        balance,
        opening_balance: opening,
        current_balance: balance,
        // Backwards compatibility properties
        usd: w.currency === 'USD' ? balance : 0,
        khr: w.currency === 'KHR' ? balance : 0,
        opening_usd: w.currency === 'USD' ? opening : 0,
        opening_khr: w.currency === 'KHR' ? opening : 0,
      };
    });

    if (userRole === 'staff') {
      return formatted.filter((w) => w.code.startsWith('petty'));
    }

    if (userRole === 'manager') {
      return formatted.filter((w) =>
        ['drawer', 'main_drawer', 'petty', 'mgr', 'aba', 'bakong'].some((c) => w.code.startsWith(c))
      );
    }

    return formatted;
  }

  async getWallet(codeOrId: string | number) {
    const wallet = await walletRepository.findByCodeOrId(codeOrId);
    if (!wallet) throw new Error(`Wallet ${codeOrId} not found`);
    const balance = parseFloat(wallet.current_balance as string) || 0;
    const opening = parseFloat(wallet.opening_balance as string) || 0;
    return {
      id: wallet.id,
      code: wallet.code,
      name_km: wallet.name_km,
      name_en: wallet.name_en,
      type: wallet.type,
      category: wallet.category,
      currency: wallet.currency,
      balance,
      opening_balance: opening,
      current_balance: balance,
      usd: wallet.currency === 'USD' ? balance : 0,
      khr: wallet.currency === 'KHR' ? balance : 0,
    };
  }

  async createWallet(data: {
    code?: string;
    name_km: string;
    name_en?: string;
    type: any;
    category?: string;
    currency?: 'USD' | 'KHR';
    opening_balance?: number;
    opening_usd?: number;
    opening_khr?: number;
  }) {
    if (!data.name_km || !data.name_km.toString().trim()) {
      throw new Error('Wallet Khmer name is required');
    }

    const nameKm = data.name_km.toString().trim();
    const nameEn = data.name_en ? data.name_en.toString().trim() : nameKm;

    let currency: 'USD' | 'KHR' = data.currency || 'USD';
    let opening = Number(data.opening_balance) || 0;
    if (!data.currency) {
      if (data.opening_khr && Number(data.opening_khr) > 0) {
        currency = 'KHR';
        opening = Number(data.opening_khr);
      } else if (data.opening_usd && Number(data.opening_usd) > 0) {
        currency = 'USD';
        opening = Number(data.opening_usd);
      }
    }

    let code = data.code ? data.code.toString().trim().toLowerCase() : '';
    if (!code) {
      // Auto-generate clean, readable slug from name_en, name_km, or type
      const base = (data.name_en || data.name_km || data.type || 'wallet')
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 20);
      const prefix = base ? `${base}_${currency.toLowerCase()}` : `wallet_${currency.toLowerCase()}`;
      let candidate = prefix;
      let counter = 1;
      while (await walletRepository.findByCodeOrId(candidate)) {
        candidate = `${prefix}_${counter}`;
        counter++;
      }
      code = candidate;
    } else {
      const existing = await walletRepository.findByCodeOrId(code);
      if (existing) throw new Error(`Wallet code '${code}' already exists`);
    }

    return walletRepository.create({
      code,
      name_km: nameKm,
      name_en: nameEn,
      type: data.type || 'bank',
      category: data.category || (data.type === 'cash' ? 'cash' : 'bank'),
      currency,
      opening_balance: String(opening),
      current_balance: String(opening),
      is_active: true,
    });
  }

  async getTransfers(limit = 50) {
    return walletRepository.findTransfers(limit);
  }

  async transfer(data: {
    from_wallet_id: string | number;
    to_wallet_id: string | number;
    amount: number;
    currency: 'USD' | 'KHR';
    note?: string;
    userId?: number;
  }) {
    const { from_wallet_id, to_wallet_id, amount, currency, note, userId } = data;

    if (!from_wallet_id || !to_wallet_id || !amount || !currency) {
      throw new Error('from_wallet_id, to_wallet_id, amount, and currency are required');
    }
    if (from_wallet_id === to_wallet_id) {
      throw new Error('Source and destination wallets must be different');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fromRes = await client.query(
        'SELECT id, code, name_km, currency, CAST(current_balance AS FLOAT) as balance FROM wallets WHERE id::text = $1 OR code = $1 FOR UPDATE',
        [from_wallet_id]
      );
      if (!fromRes.rows.length) throw new Error(`Source wallet ${from_wallet_id} not found`);
      const fromWallet = fromRes.rows[0];

      const toRes = await client.query(
        'SELECT id, code, name_km, currency, CAST(current_balance AS FLOAT) as balance FROM wallets WHERE id::text = $1 OR code = $1 FOR UPDATE',
        [to_wallet_id]
      );
      if (!toRes.rows.length) throw new Error(`Destination wallet ${to_wallet_id} not found`);
      const toWallet = toRes.rows[0];

      if (fromWallet.currency !== currency) {
        throw new Error(`Source wallet '${fromWallet.name_km}' is in ${fromWallet.currency}, cannot transfer ${currency}`);
      }
      if (toWallet.currency !== currency) {
        throw new Error(`Destination wallet '${toWallet.name_km}' is in ${toWallet.currency}, cannot transfer ${currency}`);
      }

      if (amount > fromWallet.balance) {
        throw new Error(`Transfer amount (${amount} ${currency}) exceeds available balance in ${fromWallet.name_km} (${fromWallet.balance} ${currency})`);
      }

      await client.query('UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2', [amount, fromWallet.id]);
      await client.query('UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2', [amount, toWallet.id]);

      const transferRes = await client.query(
        `INSERT INTO transfers (transfer_date, from_wallet_id, to_wallet_id, amount, currency, note, created_by)
         VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6)
         RETURNING id, transfer_date, amount, currency, note, created_at`,
        [fromWallet.id, toWallet.id, amount, currency, note || null, userId || null]
      );

      await client.query('COMMIT');
      return {
        success: true,
        transfer: {
          ...transferRes.rows[0],
          from_wallet: fromWallet.name_km,
          to_wallet: toWallet.name_km,
        },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export const walletService = new WalletService();
