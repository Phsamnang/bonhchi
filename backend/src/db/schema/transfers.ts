import { pgTable, bigint, varchar, text, timestamp, date, decimal } from 'drizzle-orm/pg-core';
import { users } from './users';
import { wallets } from './wallets';

export const transfers = pgTable('transfers', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  transfer_date: date('transfer_date').defaultNow().notNull(),
  from_wallet_id: bigint('from_wallet_id', { mode: 'number' }).references(() => wallets.id).notNull(),
  to_wallet_id: bigint('to_wallet_id', { mode: 'number' }).references(() => wallets.id).notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  note: text('note'),
  request_id: bigint('request_id', { mode: 'number' }),
  created_by: bigint('created_by', { mode: 'number' }).references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Transfer = typeof transfers.$inferSelect;
export type NewTransfer = typeof transfers.$inferInsert;
