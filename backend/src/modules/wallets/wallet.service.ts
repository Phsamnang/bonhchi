import { walletRepository } from './wallet.repository.js';
import { pool } from '../../db/index.js';
import { UserRole } from '../../middleware/requireRole.js';

export class WalletService {
  async getWallets(userRole?: UserRole) {
    const allWallets = await walletRepository.findAll();

    const formatted = allWallets.map((w) => ({
      id: w.id,
      code: w.code,
      name_km: w.name_km,
      name_en: w.name_en,
      type: w.type,
      category: w.category,
      usd: parseFloat(w.current_usd as string) || 0,
      khr: parseInt(w.current_khr as string, 10) || 0,
      opening_usd: parseFloat(w.opening_usd as string) || 0,
      opening_khr: parseInt(w.opening_khr as string, 10) || 0,
    }));

    if (userRole === 'staff') {
      return formatted.filter((w) => w.code === 'petty');
    }

    if (userRole === 'manager') {
      return formatted.filter((w) => ['drawer', 'petty', 'mgr', 'aba', 'bakong'].includes(w.code));
    }

    return formatted;
  }

  async getWallet(codeOrId: string | number) {
    const wallet = await walletRepository.findByCodeOrId(codeOrId);
    if (!wallet) throw new Error(`Wallet ${codeOrId} not found`);
    return {
      id: wallet.id,
      code: wallet.code,
      name_km: wallet.name_km,
      name_en: wallet.name_en,
      type: wallet.type,
      category: wallet.category,
      usd: parseFloat(wallet.current_usd as string) || 0,
      khr: parseInt(wallet.current_khr as string, 10) || 0,
    };
  }

  async createWallet(data: {
    code: string;
    name_km: string;
    name_en?: string;
    type: any;
    category?: string;
    opening_usd?: number;
    opening_khr?: number;
  }) {
    const existing = await walletRepository.findByCodeOrId(data.code);
    if (existing) throw new Error(`Wallet code '${data.code}' already exists`);

    return walletRepository.create({
      code: data.code.trim().toLowerCase(),
      name_km: data.name_km.trim(),
      name_en: data.name_en?.trim() || data.name_km.trim(),
      type: data.type,
      category: data.category || 'cash',
      opening_usd: String(data.opening_usd || 0),
      opening_khr: String(data.opening_khr || 0),
      current_usd: String(data.opening_usd || 0),
      current_khr: String(data.opening_khr || 0),
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
        'SELECT id, code, name_km, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE id::text = $1 OR code = $1 FOR UPDATE',
        [from_wallet_id]
      );
      if (!fromRes.rows.length) throw new Error(`Source wallet ${from_wallet_id} not found`);
      const fromWallet = fromRes.rows[0];

      const toRes = await client.query(
        'SELECT id, code, name_km, CAST(current_usd AS FLOAT) as usd, CAST(current_khr AS BIGINT) as khr FROM wallets WHERE id::text = $1 OR code = $1 FOR UPDATE',
        [to_wallet_id]
      );
      if (!toRes.rows.length) throw new Error(`Destination wallet ${to_wallet_id} not found`);
      const toWallet = toRes.rows[0];

      const isUSD = currency === 'USD';
      const available = isUSD ? fromWallet.usd : fromWallet.khr;

      if (amount > available) {
        throw new Error(`Transfer amount (${amount} ${currency}) exceeds available balance in ${fromWallet.name_km} (${available} ${currency})`);
      }

      if (isUSD) {
        await client.query('UPDATE wallets SET current_usd = current_usd - $1 WHERE id = $2', [amount, fromWallet.id]);
        await client.query('UPDATE wallets SET current_usd = current_usd + $1 WHERE id = $2', [amount, toWallet.id]);
      } else {
        await client.query('UPDATE wallets SET current_khr = current_khr - $1 WHERE id = $2', [amount, fromWallet.id]);
        await client.query('UPDATE wallets SET current_khr = current_khr + $1 WHERE id = $2', [amount, toWallet.id]);
      }

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
