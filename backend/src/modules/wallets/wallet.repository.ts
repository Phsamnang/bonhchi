import { eq, desc } from 'drizzle-orm';
import { db, pool } from '../../db/index.js';
import { wallets, transfers, Wallet } from '../../db/schema/index.js';

export class WalletRepository {
  async findAll(): Promise<Wallet[]> {
    return db.select().from(wallets).where(eq(wallets.is_active, true)).orderBy(wallets.id);
  }

  async findByCodeOrId(identifier: string | number): Promise<Wallet | undefined> {
    const isNum = !isNaN(Number(identifier));
    const result = await db
      .select()
      .from(wallets)
      .where(isNum ? eq(wallets.id, Number(identifier)) : eq(wallets.code, String(identifier)))
      .limit(1);
    return result[0];
  }

  async create(data: typeof wallets.$inferInsert): Promise<Wallet> {
    const result = await db.insert(wallets).values(data).returning();
    return result[0];
  }

  async findTransfers(limit = 50) {
    const result = await pool.query(`
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
      LIMIT $1
    `, [limit]);
    return result.rows;
  }
}

export const walletRepository = new WalletRepository();
